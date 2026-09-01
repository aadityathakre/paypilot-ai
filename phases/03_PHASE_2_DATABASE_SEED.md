# Phase 2 — Database Design & Seed Data

## Goal
Build the minimum relational data model required for the full workflow.

## Part 1 — Core entities

Required models:

- User
- Merchant
- Product
- Category
- Cart
- CartItem
- Order
- OrderItem
- Payment
- AgentSession
- AgentDecision
- AuditEvent
- GrowthRule

## Part 2 — Relationship model

```text
Merchant
  ├── Products
  ├── GrowthRules
  └── Orders

Customer/User
  ├── AgentSessions
  ├── Carts
  └── Orders

AgentSession
  └── AgentDecisions

Cart
  └── CartItems → Products

Order
  ├── OrderItems → Products
  └── Payment

All critical operations
  └── AuditEvents
```

## Part 3 — Product requirements

Product must contain:
- id
- merchantId
- categoryId
- name
- description
- price
- stock
- active
- attributes
- tags
- createdAt
- updatedAt

## Part 4 — Order state

Use a finite state model, for example:

```text
CREATED
→ PENDING_PAYMENT
→ PAID
→ FAILED
→ CANCELLED
```

Do not let arbitrary frontend strings change order state.

## Part 5 — Payment state

```text
CREATED
→ AUTHORIZED/PENDING
→ VERIFIED
→ FAILED
```

Use server-side verification to establish trusted payment state.

## Part 6 — Seed data

Create one synthetic merchant and enough products to make recommendations credible.

Suggested categories:
- laptops
- monitors
- keyboards
- mice
- headphones
- webcams
- accessories

Create realistic combinations such as:
- coding setup
- gaming setup
- work-from-home setup
- student setup

Clearly label data as synthetic/demo data.

## Part 7 — Database rules

- Foreign keys.
- Unique constraints where needed.
- Index searchable fields.
- Decimal-safe money representation.
- Timestamps.
- No deletion of important payment/audit history.
