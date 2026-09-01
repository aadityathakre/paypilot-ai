# Phase 8 — Merchant Dashboard, Analytics & Product UX

## Goal
Turn the technical workflow into a merchant-facing growth product.

## Part 1 — Customer UI

Required screens:
- landing/home;
- AI shopping assistant;
- product recommendations;
- product detail;
- cart;
- checkout;
- payment result;
- order summary.

## Part 2 — Merchant UI

Required:
- overview dashboard;
- revenue/conversion metrics;
- agent-assisted order count;
- upsell acceptance;
- average order value;
- payment success/failure;
- audit activity;
- basic growth-rule controls.

## Part 3 — Metrics

Use clearly labeled synthetic/demo metrics when not based on real production traffic.

Recommended:
- agent sessions;
- recommendation acceptance;
- upsell acceptance rate;
- conversion rate;
- average order value;
- payment success rate;
- payment recovery/failed payment count where implemented;
- revenue influenced.

## Part 4 — Metric definitions

Every metric needs:
- formula;
- data source;
- measurement window;
- whether it is real test data or synthetic.

Example:

```text
Upsell Acceptance Rate
= accepted upsell proposals / presented upsell proposals
```

## Part 5 — Merchant value story

Dashboard should answer:
- What did the agent influence?
- Which products are recommended most?
- Which upsells are accepted?
- Where are payments failing?
- What is the conversion trend?

## Part 6 — UX quality bar

- Clear loading states.
- Empty states.
- Error states.
- Mobile-responsive enough for demo.
- No fake buttons.
- No dead navigation.
- Payment amount visibly consistent across screens.

## Part 7 — Demo path

The primary demo must be completable in a few minutes without navigating through irrelevant screens.
