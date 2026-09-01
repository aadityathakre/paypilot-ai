# Three-Day Execution Plan — Submission-First Delivery

## 0. Operating principle

There are only three days. The objective is **not maximum feature count**. The objective is a convincing, reliable Track 1 system with a working demo, strong engineering story and complete submission artifacts.

Priority order:

```text
Working core flow
> Payment safety
> AI grounding/tool use
> Failure handling
> Auditability
> Metrics
> UX polish
> Stretch features
```

## 1. Team operating model

Even if one person builds it, use these virtual roles:

- **Product Manager:** scope and acceptance criteria.
- **Staff/Senior Engineer:** architecture and technical decisions.
- **Backend Engineer:** API, DB, checkout, webhooks.
- **AI Engineer:** agent/tools/structured outputs.
- **Frontend Engineer:** customer and merchant UI.
- **DevOps:** deployment/env/CI.
- **QA:** test cases and failure scenarios.
- **Designer:** UX hierarchy and demo clarity.

The senior rule for all roles:

> Stop adding scope when it threatens the demo's reliability.

## 2. Day 1 — Foundation + vertical slice

### Goal

End the day with:

```text
Customer intent
 -> product search
 -> recommendation
 -> cart
```

### Block A — Project setup

- Create GitHub repo.
- Create monorepo or clean frontend/backend repos.
- Configure TypeScript.
- Add ESLint/Prettier.
- Add `.env.example`.
- Create PostgreSQL DB.
- Create Prisma schema/migrations.
- Add seed data.

### Block B — Backend foundation

Implement:

- Express app.
- error middleware.
- request ID.
- auth skeleton.
- product routes.
- health route.

### Block C — Frontend foundation

Build:

- landing page.
- customer chat page.
- product recommendation card.
- cart drawer/page.

### Block D — AI vertical slice

Implement:

```text
message
 -> structured intent
 -> catalog tool
 -> ranking
 -> grounded response
```

Do not work on payment until this flow works end-to-end.

### Day 1 acceptance criteria

```text
[ ] clean clone runs
[ ] DB migration works
[ ] seed works
[ ] customer can send intent
[ ] AI returns structured intent
[ ] tool retrieves real products
[ ] recommendations are grounded
[ ] customer can add product to cart
```

## 3. Day 2 — Payment + guardrails + merchant side

### Goal

End the day with:

```text
Cart
 -> policy
 -> Razorpay test order
 -> checkout
 -> verify
 -> webhook
 -> paid order
```

### Block A — Policy engine

Implement:

- max order value.
- allowed action list.
- stock validation.
- discount limit.
- explicit confirmation.

### Block B — Razorpay integration

Implement:

- server-side order creation.
- frontend Checkout.
- test payment.
- payment response verification.
- webhook endpoint.
- webhook signature validation.

Use only Razorpay test mode. Official docs: https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/

### Block C — Order state machine

Implement:

```text
created
 -> attempted
 -> paid
```

plus failed/pending paths.

### Block D — Audit trail

Implement an audit event writer and timeline endpoint.

### Block E — Merchant dashboard

Minimum pages:

- products.
- policy.
- orders.
- analytics summary.
- audit trace.

### Day 2 acceptance criteria

```text
[ ] customer can check out with test mode
[ ] payment signature is verified
[ ] webhook signature is verified
[ ] local order reaches paid state
[ ] audit timeline exists
[ ] merchant can see order
[ ] merchant can see basic metrics
```

## 4. Day 3 — Reliability + polish + submission

### Goal

Turn the working prototype into a convincing professional artifact.

### Block A — Failure testing

Deliberately test:

1. Invalid LLM output.
2. Catalog returns no results.
3. Policy limit exceeded.
4. Duplicate payment verification request.
5. Invalid payment signature.
6. Invalid webhook signature.
7. Razorpay/API timeout simulation.
8. Customer abandons checkout.

Choose one failure for the video.

### Block B — Metrics

Generate a synthetic session dataset.

Compute:

```text
sessions
recommendations
carts
payments
paid orders
upsell acceptance
AOV
policy blocks
```

### Block C — UX

Polish only these surfaces:

- customer chat.
- recommendation card.
- cart/checkout.
- merchant dashboard.
- audit timeline.

### Block D — Repository

Complete:

- README.
- architecture diagrams.
- API docs.
- setup instructions.
- failure analysis.
- screenshots.
- sample data.

### Block E — 5-minute video

Suggested script:

```text
0:00–0:30  Problem
0:30–1:00  Product concept
1:00–2:40  Live demo
2:40–3:30  Architecture
3:30–4:15  Failure + recovery
4:15–4:40  Metrics
4:40–5:00  Why this matters / closing
```

### Day 3 acceptance criteria

```text
[ ] no blocker bug in happy path
[ ] one failure is demonstrably handled
[ ] metrics are visible
[ ] audit trail is visible
[ ] README can be followed by a reviewer
[ ] architecture diagram is readable
[ ] video is <= 5 minutes
[ ] repo has no secrets
[ ] final production-like build checked
```

## 5. Scope control matrix

| Feature | Day 1 | Day 2 | Day 3 | Ship? |
|---|---:|---:|---:|---|
| Intent parsing | ✅ | | polish | ✅ |
| Catalog tool | ✅ | | tests | ✅ |
| Recommendation | ✅ | | improve | ✅ |
| Cart | ✅ | | polish | ✅ |
| Upsell | | ✅ | improve | ✅ |
| Policy engine | | ✅ | tests | ✅ |
| Razorpay order | | ✅ | verify | ✅ |
| Checkout | | ✅ | test | ✅ |
| Webhook | | ✅ | test | ✅ |
| Audit | | ✅ | polish | ✅ |
| Analytics | | ✅ | improve | ✅ |
| Semantic embeddings | | | optional | only if stable |
| Merchant AI analytics | | | optional | only if stable |
| Voice | | | ❌ | No |
| Multi-agent | | | ❌ | No |

## 6. Definition of Done for P0

A feature is done only when:

```text
implementation
+ validation
+ error path
+ basic test
+ visible demo state
+ docs where needed
```

## 7. Daily Git checkpoints

At the end of each work block, commit.

Suggested milestones:

```text
feat: project foundation
feat: catalog and seeded products
feat: agent intent and tools
feat: cart flow
feat: policy engine
feat: razorpay test checkout
feat: payment verification and webhooks
feat: audit and analytics
fix: payment failure handling
docs: finalize submission package
```

## 8. Risk register

### Risk: LLM API unavailable

Mitigation:

- fallback demo responses for seeded scenarios.
- keep deterministic catalog/ranking independent of the model.

Do not fake a live AI capability in the final demo; distinguish fallback mode clearly.

### Risk: Razorpay webhook cannot reach local machine

Mitigation:

- use a supported secure tunnel/staging endpoint.
- configure test-mode webhook.
- retain a local verification path.

Razorpay documents test-mode webhook configuration and notes that common tunneling services may be blocked. https://razorpay.com/docs/webhooks/validate-test/

### Risk: integration consumes too much time

Mitigation:

- stop all stretch features.
- preserve working end-to-end path.

### Risk: UI takes too long

Mitigation:

- use Tailwind component patterns.
- prioritize clarity over visual complexity.

## 9. Final reviewer walkthrough

Before submission, run exactly this path from a clean session:

```text
1. Open app
2. Login as customer
3. Ask for product within budget
4. See recommendation + reason
5. Accept upsell
6. Review cart
7. See final amount
8. Confirm payment
9. Razorpay test checkout
10. Complete test payment
11. Show success
12. Open merchant dashboard
13. Show updated order/metric
14. Open audit trail
15. Demonstrate one failure and recovery
```
