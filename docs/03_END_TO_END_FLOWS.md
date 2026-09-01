# End-to-End Frontend -> Backend -> AI -> Razorpay Flows

## 1. Architecture actors

```text
[Customer Browser]
       |
       v
[React Web App]
       |
       v
[Node/Express API]
       |
       +--> [Auth]
       +--> [Catalog Service]
       +--> [Agent Orchestrator]
       +--> [Policy Engine]
       +--> [Order Service]
       +--> [Analytics Service]
       |
       +--> [PostgreSQL]
       |
       +--> [Razorpay API]
                 |
                 v
          [Razorpay Checkout]
                 |
                 v
             [Webhook]
                 |
                 v
          [Webhook Handler]
```

## 2. Request/response conventions

### Request

```json
{
  "requestId": "req_123",
  "data": {}
}
```

### Success response

```json
{
  "success": true,
  "data": {},
  "requestId": "req_123"
}
```

### Error response

```json
{
  "success": false,
  "error": {
    "code": "POLICY_LIMIT_EXCEEDED",
    "message": "Order exceeds the merchant's configured limit"
  },
  "requestId": "req_123"
}
```

## 3. Customer chat -> recommendation

```text
React
 |
 | POST /api/agent/sessions/:id/messages
 | { message: "coding laptop under 70k" }
 v
API Controller
 |
 v
Agent Service
 |
 +--> LLM: structured intent
 |
 +--> Schema validation
 |
 +--> Catalog Tool
 |      |
 |      +--> Product Service
 |      +--> PostgreSQL
 |
 +--> Ranking Service
 |
 +--> Agent explanation
 |
 +--> Audit Service
 |
 v
HTTP 200
{
  intent,
  products,
  explanation,
  suggestedUpsell
}
```

## 4. Recommendation flow in detail

### Step A: validate user input

- Non-empty.
- Max length.
- Auth/session validation.
- Rate limit.

### Step B: LLM structured extraction

Output schema:

```json
{
  "category": "laptop",
  "budgetMax": 70000,
  "preferences": ["coding"],
  "constraints": [],
  "quantity": 1
}
```

### Step C: query tools

The agent calls:

```text
search_catalog
get_product
get_inventory
```

### Step D: deterministic ranking

Server ranks only verified candidates.

### Step E: generate explanation

LLM receives the shortlisted facts and explains them. It is not allowed to invent attributes.

### Step F: audit

Persist:

- session ID
- raw customer request
- normalized intent
- tool calls
- candidate IDs
- chosen IDs
- explanation
- timestamp

## 5. Add to cart flow

```text
React
 -> POST /api/carts/items
 -> Cart Controller
 -> Auth
 -> Product lookup
 -> Stock check
 -> price recalculation
 -> Cart Service
 -> DB
 <- cart summary
```

Important: never trust the client-provided product price.

## 6. Upsell flow

```text
Cart
 -> Growth Service
 -> candidate related products
 -> rules/score
 -> policy check
 -> agent explanation
 -> customer sees recommendation
```

The customer may:

- accept,
- reject,
- ignore.

Acceptance becomes an analytics event.

## 7. Final checkout flow

```text
Customer clicks Pay
        |
        v
POST /api/checkout/create-order
        |
        v
Server authenticates user
        |
        v
Load cart from DB
        |
        v
Recalculate authoritative total
        |
        v
Policy Engine
  |             |
  | reject      | approve
  v             v
403/error    Razorpay API
                 |
                 v
           order_id returned
                 |
                 v
       persist pending order
                 |
                 v
             frontend
                 |
                 v
          Razorpay Checkout
```

Razorpay's Orders API uses `POST /v1/orders` and the amount is supplied in the smallest currency sub-unit. For INR, ₹299 is sent as `29900`. See https://razorpay.com/docs/api/orders/create/

## 8. Payment verification flow

```text
Razorpay Checkout
       |
       | success callback
       v
Frontend
       |
       | order_id + payment_id + signature
       v
POST /api/payments/verify
       |
       v
Server HMAC verification
       |
       +--> invalid -> reject + audit
       |
       +--> valid -> persist payment state
                         |
                         v
                    order state update
                         |
                         v
                       success
```

Razorpay documents server-side HMAC validation of `order_id|payment_id` using the secret for Checkout signature verification. See https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/

## 9. Webhook flow

```text
Razorpay
   |
   | POST webhook
   v
POST /api/webhooks/razorpay
   |
   v
Capture raw body
   |
   v
Validate X-Razorpay-Signature
   |
   +--> invalid -> 4xx / reject
   |
   +--> valid
           |
           v
       event id check
           |
           v
       map event -> order/payment state
           |
           v
       DB transaction
           |
           v
       audit event
```

Razorpay explicitly instructs webhook consumers to validate the signature using the raw body and the `X-Razorpay-Signature` header. See https://razorpay.com/docs/webhooks/validate-test/

## 10. Merchant analytics flow

```text
Dashboard
 -> GET /api/analytics/summary
 -> Analytics Service
 -> SQL aggregate queries
 -> JSON response
 -> charts/cards
```

Suggested SQL metrics:

```text
AI-assisted sessions
AI-assisted paid orders
AI-assisted conversion = paid / sessions
AOV = paid revenue / paid orders
Upsell acceptance = accepted upsell / shown upsell
Policy blocks = blocked actions / proposed actions
```

## 11. Audit replay flow

```text
Merchant clicks Audit Trace
 -> GET /api/audit/sessions/:sessionId
 -> fetch ordered events
 -> render timeline
```

A reviewer should be able to answer:

1. What did the customer ask?
2. What did the agent infer?
3. Which tools were called?
4. Which products were considered?
5. Why was the final recommendation chosen?
6. What did the customer confirm?
7. What policy checks ran?
8. What payment action occurred?
9. What was the final state?

## 12. Important state machines

### Cart

```text
ACTIVE -> CHECKOUT_PENDING -> ORDER_CREATED -> ABANDONED
```

### Order

```text
PENDING_PAYMENT -> PAYMENT_ATTEMPTED -> PAID
                                   \-> FAILED
                                   \-> EXPIRED
```

### Payment verification

```text
RECEIVED -> VERIFIED
         \-> REJECTED
```

Do not allow arbitrary jumps from the frontend.

## 13. Correlation IDs

Every request should carry/request a `requestId`. Persist it in logs and audit events so one customer journey can be traced across:

```text
frontend -> API -> agent -> DB -> Razorpay -> webhook -> DB
```
