# Database / Schema / Models Design

## 1. Database choice

**Recommended:** PostgreSQL.

Reasoning:

- Strong relational integrity for users, products, carts, orders and payments.
- Aggregation queries for analytics are straightforward.
- Audit/event records benefit from relational constraints and ordering.
- Transactions make state changes easier to reason about.

ORM recommendation: Prisma.

## 2. Entity relationship overview

```text
User
 | 1
 |------< AgentSession
 |             |
 |             |------< AgentMessage
 |             |
 |             |------< AgentEvent
 |
 | 1
 |------< Cart
              |
              |------< CartItem >------ Product

User/Merchant
 | 1
 |------< Product
 |
 |------1 MerchantPolicy
 |
 |------< Order >------ Cart
          |
          |------< OrderItem >------ Product
          |
          |------< Payment
          |
          |------< AuditEvent
```

## 3. User

```text
users
------
id UUID PK
name VARCHAR
email VARCHAR UNIQUE
password_hash TEXT
role ENUM(customer, merchant, admin)
created_at TIMESTAMP
updated_at TIMESTAMP
```

Indexes:

- `email`
- `(role, created_at)` if needed

## 4. Merchant

```text
merchants
---------
id UUID PK
owner_user_id UUID FK users.id
name VARCHAR
currency CHAR(3) DEFAULT 'INR'
created_at TIMESTAMP
updated_at TIMESTAMP
```

A merchant is associated with one owner user for the MVP. A many-user team model can be added later.

## 5. Product

```text
products
--------
id UUID PK
merchant_id UUID FK merchants.id
sku VARCHAR UNIQUE
name VARCHAR
description TEXT
category VARCHAR
price_paise BIGINT
stock INTEGER
active BOOLEAN
attributes JSONB
merchant_score NUMERIC
created_at TIMESTAMP
updated_at TIMESTAMP
```

Why `price_paise` as integer?

Avoid floating-point money arithmetic.

Example:

`₹699.00 -> 69900 paise`

This aligns with Razorpay's order API convention of supplying amounts in the smallest currency sub-unit.

## 6. Merchant policy

```text
merchant_policies
-----------------
id UUID PK
merchant_id UUID UNIQUE FK merchants.id
max_order_value_paise BIGINT
max_upsell_discount_bps INTEGER
upsell_enabled BOOLEAN
payment_confirmation_required BOOLEAN
allowed_categories JSONB
allowed_agent_actions JSONB
updated_at TIMESTAMP
```

`bps` = basis points. Example: 1000 bps = 10%.

## 7. Agent session

```text
agent_sessions
--------------
id UUID PK
customer_id UUID FK users.id
merchant_id UUID FK merchants.id
status ENUM(active, completed, failed)
created_at TIMESTAMP
updated_at TIMESTAMP
```

## 8. Agent message

```text
agent_messages
--------------
id UUID PK
session_id UUID FK agent_sessions.id
role ENUM(user, assistant, tool)
content TEXT
structured_data JSONB
created_at TIMESTAMP
```

Avoid storing secrets or raw payment credentials.

## 9. Agent event / tool trace

```text
agent_events
------------
id UUID PK
session_id UUID FK agent_sessions.id
event_type VARCHAR
actor VARCHAR
tool_name VARCHAR NULL
input JSONB
output JSONB
status ENUM(success, failure, blocked)
latency_ms INTEGER NULL
created_at TIMESTAMP
```

This table powers the audit replay screen.

## 10. Cart

```text
carts
-----
id UUID PK
customer_id UUID FK users.id
merchant_id UUID FK merchants.id
status ENUM(active, converted, abandoned)
currency CHAR(3)
created_at TIMESTAMP
updated_at TIMESTAMP
```

## 11. Cart item

```text
cart_items
----------
id UUID PK
cart_id UUID FK carts.id
product_id UUID FK products.id
quantity INTEGER
unit_price_paise BIGINT
created_at TIMESTAMP
updated_at TIMESTAMP
```

Store the price snapshot for the cart but revalidate authoritative pricing at checkout.

## 12. Order

```text
orders
------
id UUID PK
merchant_id UUID FK merchants.id
customer_id UUID FK users.id
cart_id UUID FK carts.id
razorpay_order_id VARCHAR UNIQUE
receipt VARCHAR UNIQUE
amount_paise BIGINT
currency CHAR(3)
status ENUM(created, attempted, paid, failed, cancelled)
source ENUM(ai_assisted, direct)
created_at TIMESTAMP
updated_at TIMESTAMP
```

Razorpay's Orders entity has states such as `created`, `attempted`, and `paid`; the application can maintain an internal order state that maps external payment events to local business states. See https://razorpay.com/docs/api/orders/entity/

## 13. Order item

```text
order_items
-----------
id UUID PK
order_id UUID FK orders.id
product_id UUID FK products.id
quantity INTEGER
unit_price_paise BIGINT
discount_paise BIGINT DEFAULT 0
created_at TIMESTAMP
```

## 14. Payment

```text
payments
--------
id UUID PK
order_id UUID FK orders.id
razorpay_payment_id VARCHAR UNIQUE NULL
status ENUM(created, authorized, captured, failed, refunded)
amount_paise BIGINT
method VARCHAR NULL
raw_status VARCHAR NULL
verified_at TIMESTAMP NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

Never store card numbers, CVV, PINs or other prohibited payment credentials.

## 15. Audit event

```text
audit_events
------------
id UUID PK
merchant_id UUID FK merchants.id
customer_id UUID FK users.id NULL
session_id UUID FK agent_sessions.id NULL
order_id UUID FK orders.id NULL
event_type VARCHAR
actor_type VARCHAR
request_id VARCHAR
data JSONB
created_at TIMESTAMP
```

Suggested event types:

```text
USER_INTENT_CAPTURED
INTENT_STRUCTURED
TOOL_CALLED
RECOMMENDATION_GENERATED
UPSELL_SHOWN
UPSELL_ACCEPTED
POLICY_APPROVED
POLICY_BLOCKED
CUSTOMER_CONFIRMED
ORDER_CREATED
PAYMENT_VERIFICATION_PASSED
PAYMENT_VERIFICATION_FAILED
WEBHOOK_RECEIVED
ORDER_PAID
FAILURE_RECOVERED
```

## 16. Idempotency / deduplication

Add an application-level request/idempotency table:

```text
idempotency_records
-------------------
id UUID PK
key VARCHAR UNIQUE
scope VARCHAR
response_hash TEXT NULL
response JSONB NULL
created_at TIMESTAMP
expires_at TIMESTAMP
```

Use it on actions where a retry could create duplicate business effects.

## 17. Analytics materialization

For a 3-day MVP, do not add a separate analytics warehouse.

Compute aggregates from PostgreSQL.

Possible materialized view later:

```text
merchant_growth_daily
---------------------
merchant_id
date
sessions
ai_assisted_orders
paid_orders
revenue_paise
upsell_shown
upsell_accepted
policy_blocks
```

## 18. Data integrity rules

- `price_paise >= 0`.
- `stock >= 0`.
- `quantity > 0`.
- Unique SKU per merchant.
- Unique Razorpay order ID.
- Unique Razorpay payment ID when present.
- Order total recalculated server-side.
- Product must be active and available at checkout.
- Payment cannot be marked trusted from the frontend alone.

## 19. Index strategy

Initial useful indexes:

```text
products(merchant_id, active, category)
products(merchant_id, price_paise)
agent_sessions(customer_id, created_at)
agent_events(session_id, created_at)
orders(merchant_id, created_at)
orders(razorpay_order_id)
payments(razorpay_payment_id)
audit_events(session_id, created_at)
```

## 20. Transaction boundaries

Use a DB transaction for operations that change multiple related records.

Example payment verification:

```text
BEGIN
 -> create/update payment record
 -> update order state
 -> write audit event
COMMIT
```

If any critical operation fails, rollback the transaction.
