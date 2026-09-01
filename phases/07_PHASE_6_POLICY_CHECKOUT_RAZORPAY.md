# Phase 6 — Policy Engine, Checkout & Razorpay Test Integration

## Goal
Connect the AI commerce flow to a bounded payment workflow.

## Part 1 — Critical trust boundary

The architecture must be:

```text
AI proposes
→ Policy Engine validates
→ Checkout Service calculates
→ Customer confirms
→ Razorpay order created
```

The AI does not authorize payment.

## Part 2 — Policy checks

Before order creation verify:
- authenticated customer;
- cart ownership;
- product availability;
- current price;
- quantity;
- total amount;
- maximum allowed transaction amount;
- allowed merchant;
- growth discount bounds;
- final customer confirmation.

## Part 3 — Checkout flow

```text
Customer
→ POST /checkout/validate
→ policy checks
→ server recalculates amount
→ return checkout summary

Customer clicks Pay
→ POST /checkout/create-order
→ Razorpay order creation
→ return order_id/config
→ Razorpay Checkout
```

## Part 4 — Razorpay integration

Required:
- test keys only;
- server-side order creation;
- Checkout integration;
- payment signature verification;
- webhook signature validation.

Never commit credentials.

## Part 5 — Payment verification

The server receives:
- Razorpay order ID;
- payment ID;
- signature.

Server verifies authenticity before marking payment trusted.

## Part 6 — Human confirmation

Before money movement the UI must clearly show:
- product(s);
- quantities;
- final amount;
- applied discount/bundle;
- merchant;
- action requiring confirmation.

## Part 7 — Failure paths

Handle:
- order creation failure;
- payment cancellation;
- signature mismatch;
- amount mismatch;
- stale cart/stock;
- timeout;
- duplicate request.

## Part 8 — Idempotency

At minimum:
- prevent duplicate local orders for the same checkout attempt;
- make webhook processing idempotent;
- do not mark an already-paid order back to failed because of a duplicate event.

## Part 9 — Completion demo

Show:

```text
AI recommendation
→ customer accepts
→ cart
→ policy pass
→ Razorpay test order
→ checkout
→ verification
→ order success
```
