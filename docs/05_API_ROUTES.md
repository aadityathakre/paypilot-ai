# API Routes — Request / Response Contract

## 1. API principles

Base URL:

```text
/api
```

Use:

- plural resources.
- consistent JSON envelope.
- validation at controller boundary.
- authorization in middleware/service layer.
- centralized error handler.
- request IDs.

## 2. Authentication

### POST /api/auth/register

Create customer/merchant account.

Request:

```json
{
  "name": "Aadi",
  "email": "user@example.com",
  "password": "********",
  "role": "customer"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Aadi",
      "role": "customer"
    }
  }
}
```

### POST /api/auth/login

Returns access token.

### GET /api/auth/me

Returns current user.

## 3. Products

### GET /api/products

Query params:

```text
category
minPrice
maxPrice
inStock
search
page
limit
```

### GET /api/products/:id

Fetch verified product data.

### POST /api/products

Merchant/admin only.

### PATCH /api/products/:id

Merchant/admin only.

### DELETE /api/products/:id

Prefer soft delete via `active=false`.

## 4. Merchant policies

### GET /api/merchant/policy

Returns current policy.

### PUT /api/merchant/policy

Example:

```json
{
  "maxOrderValuePaise": 8000000,
  "maxUpsellDiscountBps": 1000,
  "upsellEnabled": true,
  "paymentConfirmationRequired": true,
  "allowedAgentActions": [
    "SEARCH_CATALOG",
    "RECOMMEND_PRODUCT",
    "CREATE_ORDER"
  ]
}
```

## 5. Agent sessions

### POST /api/agent/sessions

Creates a customer session.

Response:

```json
{
  "success": true,
  "data": {
    "sessionId": "uuid"
  }
}
```

### GET /api/agent/sessions/:id

Returns session summary.

### POST /api/agent/sessions/:id/messages

Request:

```json
{
  "message": "I need a gaming laptop under 70000"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "intent": {
      "category": "laptop",
      "budgetMax": 70000
    },
    "recommendations": [
      {
        "productId": "uuid",
        "name": "Demo Laptop",
        "price": 64990,
        "reasons": [
          "within budget",
          "strong coding fit"
        ]
      }
    ],
    "suggestedUpsell": null,
    "nextAction": "REVIEW_PRODUCTS"
  }
}
```

## 6. Cart

### POST /api/carts

Create cart.

### GET /api/carts/:id

Get cart with authoritative product information.

### POST /api/carts/:id/items

Request:

```json
{
  "productId": "uuid",
  "quantity": 1
}
```

### PATCH /api/carts/:id/items/:itemId

Update quantity.

### DELETE /api/carts/:id/items/:itemId

Remove item.

### POST /api/carts/:id/confirm

Marks cart ready for checkout after business validation.

## 7. Growth / upsell

### POST /api/growth/upsell

Request:

```json
{
  "cartId": "uuid"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "shown": true,
    "productId": "uuid",
    "reason": "Completes the setup and remains within budget",
    "pricePaise": 149900
  }
}
```

## 8. Checkout / order creation

### POST /api/checkout/create-order

Customer-only.

Request:

```json
{
  "cartId": "uuid",
  "confirmation": true
}
```

Server flow:

```text
auth
 -> load cart
 -> recalculate total
 -> inventory validation
 -> policy validation
 -> create unique receipt
 -> Razorpay order creation
 -> persist local order
 -> return checkout metadata
```

Response:

```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "razorpayOrderId": "order_xxx",
    "amountPaise": 6990000,
    "currency": "INR",
    "razorpayKeyId": "rzp_test_xxx"
  }
}
```

Do not return `key_secret`.

## 9. Payment verification

### POST /api/payments/verify

Request:

```json
{
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "verified": true,
    "orderStatus": "paid"
  }
}
```

The server must verify the signature, not simply trust the boolean success from the browser. Razorpay documents signature verification as a mandatory step. https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/

## 10. Webhooks

### POST /api/webhooks/razorpay

Special middleware requirements:

- preserve raw request body.
- do not JSON-transform before signature validation.
- validate `X-Razorpay-Signature`.
- deduplicate events.

Razorpay webhook validation documentation: https://razorpay.com/docs/webhooks/validate-test/

## 11. Orders

### GET /api/orders

Customer sees own orders.

Merchant sees own merchant orders.

### GET /api/orders/:id

Authorized order details.

### GET /api/orders/:id/audit

Returns ordered event timeline.

## 12. Analytics

### GET /api/analytics/summary

Query:

```text
from
until
```

Response:

```json
{
  "success": true,
  "data": {
    "sessions": 120,
    "aiAssistedOrders": 42,
    "paidOrders": 36,
    "conversionRate": 0.30,
    "aovPaise": 183500,
    "upsellShown": 30,
    "upsellAccepted": 8,
    "policyBlocks": 5
  }
}
```

### GET /api/analytics/funnel

Returns session -> recommendation -> cart -> checkout -> paid funnel.

## 13. Audit

### GET /api/audit/sessions/:sessionId

Merchant/admin authorized.

### GET /api/audit/orders/:orderId

Returns payment/order action history.

## 14. Error codes

Suggested set:

```text
AUTH_REQUIRED
FORBIDDEN
VALIDATION_ERROR
PRODUCT_NOT_FOUND
OUT_OF_STOCK
CART_NOT_FOUND
POLICY_LIMIT_EXCEEDED
AGENT_INVALID_OUTPUT
TOOL_FAILURE
RAZORPAY_ORDER_CREATION_FAILED
PAYMENT_SIGNATURE_INVALID
PAYMENT_NOT_FOUND
WEBHOOK_SIGNATURE_INVALID
DUPLICATE_EVENT
INTERNAL_ERROR
```

## 15. HTTP status conventions

```text
200 success
201 resource created
400 validation/business input error
401 unauthenticated
403 authenticated but unauthorized/policy blocked
404 missing resource
409 state conflict/duplicate action
422 semantically invalid request
429 rate limited
500 server error
502 external dependency failure
```

## 16. Controller -> service organization

Do not put all logic inside route files.

```text
route
 -> controller
 -> service
 -> repository/integration
```

Example:

```text
POST /checkout/create-order
 -> CheckoutController.createOrder()
 -> CheckoutService.createOrder()
 -> PolicyService.validate()
 -> RazorpayService.createOrder()
 -> OrderRepository.create()
```
