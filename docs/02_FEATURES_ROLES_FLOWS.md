# Features, Functionalities, Roles and Business Flows

## 1. Roles

| Role | Purpose | Main capabilities |
|---|---|---|
| Customer | Buyer | Search via intent, inspect recommendations, accept/reject upsell, checkout, view order |
| Merchant/Admin | Business owner | Manage catalog, set agent policies, inspect orders, view analytics, inspect agent audit trail |
| AI Commerce Agent | System actor | Understand intent, call tools, rank options, propose actions, explain decisions |
| Payment System | External actor | Razorpay order/payment lifecycle in test mode |
| Platform Backend | System actor | Auth, business rules, policy enforcement, persistence, payment verification, webhooks |

## 2. Feature map

### F1 Authentication and authorization

**Goal:** Separate customer and merchant capabilities.

**MVP:** JWT-based authentication with role claim.

**Flow:**

```text
Client -> POST /api/auth/register
       <- user created
Client -> POST /api/auth/login
       <- access token
Client -> protected endpoint + token
Server -> auth middleware -> role middleware -> controller
```

### F2 Merchant catalog

Merchant can create, update, delete and list products.

Product fields should include name, category, description, price, stock, attributes, margin proxy/merchant score, active status and metadata.

**Flow:**

```text
Merchant UI
  -> POST /api/products
  -> validate request
  -> Product Service
  -> DB
  <- created product
```

### F3 Customer conversational discovery

Customer enters natural-language requirements.

Example:

> "Give me a gaming setup under 80k."

The agent parses:

```json
{
  "intent": "purchase",
  "category": "gaming setup",
  "budget": 80000,
  "constraints": [],
  "preferences": []
}
```

### F4 Intent extraction

Use structured model output. Never rely on free-form LLM text when the result feeds downstream tools.

**Flow:**

```text
message
 -> LLM structured output
 -> schema validation
 -> normalized intent
 -> agent state
```

### F5 Catalog search tool

The agent can call a server-approved tool:

`searchCatalog(filters)`

The tool performs real DB retrieval. The LLM never invents catalog results.

### F6 Recommendation/ranking

Candidates are scored using deterministic signals plus optional AI semantic reasoning.

Suggested ranking score:

```text
score =
  0.40 * intent_match
+ 0.20 * budget_fit
+ 0.15 * stock_score
+ 0.15 * popularity_score
+ 0.10 * merchant_growth_score
```

Weights are demo-configurable.

### F7 AI explanation

For each selected product:

- Why it matches intent.
- Which constraints it satisfies.
- Any trade-off.
- Why an alternative was not selected.

Keep explanations grounded in tool output.

### F8 Cart creation

Customer accepts a product set.

Server recalculates prices from the authoritative DB rather than trusting frontend totals.

### F9 Upsell/cross-sell

The agent may recommend one high-relevance addition.

Example:

```text
Customer: laptop for coding
Agent: laptop selected
Growth action: suggest mouse because customer asked for a complete setup
```

The recommendation should have a reason and not violate budget/policy constraints.

### F10 Growth policy configuration

Merchant can define:

- Maximum AI-assisted order value.
- Maximum upsell discount.
- Allowed categories.
- Whether customer confirmation is always required.
- Whether an upsell is enabled.

### F11 Policy engine

The policy engine is deterministic and server-side.

Example checks:

```text
order_total <= merchant.max_order_value
product.active == true
product.stock >= quantity
currency == INR
upsell_discount <= merchant.max_discount
payment_action in allowed_actions
```

If any check fails, the system blocks the action and produces an audit event.

### F12 Checkout

After explicit confirmation:

```text
Client -> Server: create payment order
Server -> Razorpay: POST /v1/orders
Razorpay -> Server: order id
Server -> Client: checkout data
Client -> Razorpay Checkout
```

### F13 Payment verification

After checkout success, the frontend sends returned identifiers to the server. The server verifies the signature and records the result.

Razorpay documents this verification as mandatory for the Checkout response. See https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/

### F14 Webhooks

Webhook events update durable payment state asynchronously.

Validate `X-Razorpay-Signature` using the raw body and webhook secret. See https://razorpay.com/docs/webhooks/validate-test/

### F15 Audit timeline

Example:

```text
10:21:04  USER_INTENT_CAPTURED
10:21:05  INTENT_STRUCTURED
10:21:05  TOOL catalog.search
10:21:06  RECOMMENDATIONS_GENERATED
10:21:07  UPSELL_PROPOSED
10:21:11  CUSTOMER_CONFIRMED
10:21:12  POLICY_APPROVED
10:21:13  RAZORPAY_ORDER_CREATED
10:21:29  PAYMENT_VERIFIED
10:21:30  ORDER_PAID
```

### F16 Merchant analytics

Dashboard sections:

- Orders.
- AI-assisted sessions.
- Conversion funnel.
- AOV.
- Upsell acceptance.
- Payment outcomes.
- Policy blocks.
- Agent/tool errors.

### F17 Merchant analytics assistant (stretch)

Merchant asks:

> "Why did AI-assisted AOV fall this week?"

The analytics tool retrieves approved aggregates; the model summarizes them.

Do not allow the model to invent numbers. Return the underlying metric values with the explanation.

## 3. Customer journey

```text
Landing
 -> Login/Guest demo
 -> Conversational request
 -> Intent confirmation
 -> Product recommendations
 -> Product details
 -> Optional upsell
 -> Cart review
 -> Final price + policy checks
 -> Explicit payment confirmation
 -> Razorpay Checkout
 -> Verification
 -> Success/Failure
 -> Order history
```

## 4. Merchant journey

```text
Login
 -> Merchant Dashboard
 -> Add/import products
 -> Configure agent rules
 -> View AI sessions
 -> View orders/payments
 -> Open audit trace
 -> Review analytics
```

## 5. Failure journeys

### LLM failure

```text
LLM timeout/invalid JSON
 -> retry with bounded policy
 -> fallback to deterministic catalog search
 -> show safe response
 -> audit failure
```

### No suitable product

```text
Catalog tool returns 0 candidates
 -> agent asks a clarifying question OR gives nearest verified alternatives
 -> no fake product
```

### Payment timeout

```text
checkout completed but client response missing
 -> server/webhook reconciles state
 -> order remains pending until verified
 -> customer sees processing state
```

### Duplicate request

```text
same business action retried
 -> request key / unique business reference
 -> existing order returned instead of duplicate creation
```

### Policy violation

```text
agent proposes action
 -> policy engine rejects
 -> action not executed
 -> customer/merchant sees safe explanation
 -> audit event
```

## 6. Feature prioritization

### P0: submission-critical

- Customer intent flow.
- Grounded catalog tool.
- Recommendation.
- Cart.
- Policy engine.
- Razorpay order + checkout.
- Signature verification.
- Webhook.
- Audit trail.
- Merchant dashboard.
- Failure demo.
- Metrics.

### P1: quality differentiators

- Natural-language merchant analytics.
- Semantic retrieval.
- Product embeddings.
- Better personalization.

### P2: future roadmap

- Multi-merchant marketplace.
- External AI buyer protocol support.
- Multi-agent orchestration.
- Campaign automation.
- Real production deployment.
