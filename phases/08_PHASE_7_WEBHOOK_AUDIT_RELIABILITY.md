# Phase 7 — Webhooks, Audit Trail & Reliability

## Goal
Make the money workflow trustworthy after the synchronous browser interaction ends.

## Part 1 — Webhook endpoint

Create a dedicated Razorpay webhook endpoint.

Requirements:
- preserve raw request body where required for signature verification;
- validate webhook signature;
- identify event;
- process known event types;
- reject/record invalid events.

## Part 2 — Idempotent processing

Store an event identifier or equivalent uniqueness key.

Flow:

```text
Webhook
→ signature validation
→ event uniqueness check
→ process state transition
→ persist audit
→ acknowledge
```

Duplicate event:
→ no duplicate business effect.

## Part 3 — Order state machine

Only allow valid transitions.

Example:

```text
CREATED
→ PENDING_PAYMENT
→ PAID

PENDING_PAYMENT
→ FAILED

PENDING_PAYMENT
→ CANCELLED
```

Do not allow:
```text
PAID → CREATED
```

## Part 4 — Audit trail

Audit events should capture:
- actor type;
- actor ID if available;
- event type;
- entity type;
- entity ID;
- action;
- result;
- metadata;
- timestamp.

Important events:
- intent received;
- recommendation generated;
- upsell proposed;
- upsell accepted;
- policy approved/rejected;
- checkout order created;
- payment verification;
- webhook processed;
- payment failure;
- order completed.

## Part 5 — Failure story

Choose one genuine bug discovered during development.

Document:
1. symptom;
2. root cause;
3. reproduction;
4. fix;
5. regression test;
6. measurable effect.

Recommended candidate:
**duplicate payment/order state caused by retry or duplicate webhook processing.**

## Part 6 — Reliability rules

- Server is source of truth for prices.
- Webhook is processed independently from frontend status.
- Payment verification is server-side.
- Audit cannot depend only on frontend logs.
