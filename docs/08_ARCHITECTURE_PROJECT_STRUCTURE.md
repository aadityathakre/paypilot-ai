# Professional System Design, Architecture and Project Structure

## 1. Architecture goal

The goal is not to claim enterprise-scale complexity. The goal is to demonstrate **professional engineering boundaries** while keeping the system small enough to finish in three days.

The architecture follows:

```text
Presentation
    ↓
API / Transport
    ↓
Application Services
    ↓
Domain Rules
    ↓
Repositories / Integrations
    ↓
Database / External Systems
```

## 2. Recommended logical architecture

```text
                    ┌─────────────────────┐
                    │ React + TypeScript  │
                    │ Customer / Merchant │
                    └──────────┬──────────┘
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │ Express API         │
                    │ Auth / Validation   │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   Agent Application     Commerce Application   Payment Application
          │                    │                    │
   ┌──────┴──────┐      ┌──────┴──────┐      ┌──────┴─────────┐
   │ LLM Adapter │      │ Catalog     │      │ Policy         │
   │ Tool Router │      │ Cart        │      │ Checkout       │
   │ Grounding   │      │ Orders      │      │ Razorpay       │
   └─────────────┘      └─────────────┘      │ Webhooks       │
                                              └────────────────┘
                 \               |               /
                  \              |              /
                           PostgreSQL
```

## 3. Bounded agent architecture

The agent should be treated like an application component with permissions, not as an all-powerful controller.

```text
User input
   ↓
Intent parser
   ↓
Agent planner
   ↓
Allowed tool router
   ↓
Verified data
   ↓
Recommendation
   ↓
Policy engine
   ↓
Human/customer confirmation
   ↓
Deterministic checkout service
   ↓
Razorpay
```

### Important architectural rule

**LLM output is untrusted input.**

Therefore:

- validate schemas.
- validate product IDs against DB.
- validate prices against DB.
- validate totals on server.
- apply deterministic policies.
- require explicit confirmation for payment.

## 4. Why not microservices?

A three-day build should use a **modular monolith**.

Benefits:

- faster development.
- shared transactions.
- easier local setup.
- fewer deployment points.
- still demonstrates clean module boundaries.

Potential future extraction:

```text
Monolith
  -> Agent service
  -> Growth service
  -> Payment service
  -> Analytics service
```

Only split services after the boundaries are proven.

## 5. Backend project structure

```text
src/
├── config/
│   ├── env.ts
│   └── logger.ts
│
├── middleware/
│   ├── auth.ts
│   ├── roles.ts
│   ├── rateLimit.ts
│   ├── errorHandler.ts
│   └── requestId.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.schema.ts
│   │
│   ├── products/
│   ├── agent/
│   ├── cart/
│   ├── growth/
│   ├── checkout/
│   ├── payments/
│   ├── webhooks/
│   ├── orders/
│   ├── analytics/
│   └── audit/
│
├── integrations/
│   ├── ai/
│   │   ├── ai.provider.ts
│   │   ├── prompts/
│   │   ├── tools/
│   │   └── schemas/
│   │
│   └── razorpay/
│       ├── razorpay.client.ts
│       ├── razorpay.service.ts
│       └── razorpay.types.ts
│
├── shared/
│   ├── errors/
│   ├── result/
│   ├── constants/
│   └── utils/
│
└── server.ts
```

## 6. Frontend structure

```text
src/
├── app/
├── components/
├── features/
│   ├── auth/
│   ├── chat/
│   ├── catalog/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── merchant/
│   └── analytics/
├── hooks/
├── lib/
├── services/
└── types/
```

Feature-oriented frontend organization prevents a huge components folder.

## 7. Service responsibilities

### AgentService

Responsible for:

- session context.
- intent processing.
- model interaction.
- tool selection.
- recommendation orchestration.

Not responsible for:

- direct DB writes to payment state.
- arbitrary Razorpay calls.

### CatalogService

Responsible for:

- product retrieval.
- stock validation.
- category/search filters.

### GrowthService

Responsible for:

- upsell/cross-sell candidate generation.
- growth scoring.
- experiment metrics.

### PolicyService

Responsible for:

- action allowlist.
- spending limits.
- discount limits.
- confirmation requirements.

### CheckoutService

Responsible for:

- authoritative cart calculation.
- order creation.
- Razorpay integration.
- local state creation.

### PaymentService

Responsible for:

- signature verification.
- payment state updates.
- reconciliation with webhook events.

### AuditService

Responsible for:

- immutable-ish event records.
- request correlation.
- replayable timeline.

## 8. Dependency direction

Preferred:

```text
Routes -> Controllers -> Services -> Repositories/Integrations
```

Avoid:

```text
Controller -> random Prisma calls + Razorpay call + LLM call + response formatting
```

That becomes hard to test.

## 9. Security architecture

```text
Browser
  ↓ TLS
API Gateway / Express
  ↓
Auth Middleware
  ↓
Role/Permission Check
  ↓
Validation
  ↓
Domain Service
  ↓
Policy Engine
  ↓
External Integration
```

For webhooks:

```text
Razorpay webhook
  ↓
raw body
  ↓
signature validation
  ↓
event dedupe
  ↓
state transition
  ↓
audit
```

## 10. Scalability story

For the interview, state the current design honestly:

> "We intentionally used a modular monolith because the submission is an MVP. The modules have explicit boundaries so high-load components such as AI orchestration, payments, and analytics could later be extracted independently."

Possible future scaling:

```text
API Gateway
   |
   +--> Agent workers
   +--> Checkout service
   +--> Catalog service
   +--> Analytics pipeline
              |
           Event bus
              |
      analytics warehouse
```

Do not implement this future architecture in the three-day MVP.

## 11. Caching strategy

Optional later:

- cache product catalog queries.
- cache merchant policy.
- cache analytics summary.

Do not cache highly dynamic payment state without a clear invalidation design.

## 12. Async processing

For the MVP:

- synchronous request/response for agent recommendation.
- asynchronous webhook-driven payment state updates.

Future:

- background jobs for analytics aggregation.
- event-driven notifications.
- agent task queues.

## 13. Architecture trade-offs to explain

### PostgreSQL vs MongoDB

PostgreSQL chosen for transactional order/payment relationships and analytics aggregation.

### Modular monolith vs microservices

Modular monolith chosen to maximize shipping speed and preserve clear boundaries.

### LLM ranking vs deterministic ranking

Deterministic ranking provides reproducibility and easier evaluation; LLM is used where language understanding and explanation provide value.

### Agent autonomy vs approval

Payment is gated because a language model should not have uncontrolled authority over money.

## 14. Professional engineering checklist

```text
[ ] clear module ownership
[ ] request validation
[ ] auth middleware
[ ] role authorization
[ ] central error handling
[ ] structured logging
[ ] request IDs
[ ] DB migrations
[ ] seed data
[ ] unit tests
[ ] API tests
[ ] external integration wrapper
[ ] payment signature validation
[ ] webhook validation
[ ] audit events
[ ] no secrets in repository
[ ] reproducible local setup
```
