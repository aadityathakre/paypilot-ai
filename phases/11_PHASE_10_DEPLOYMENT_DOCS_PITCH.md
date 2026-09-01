# Phase 10 — Deployment, GitHub, Documentation & 5-Minute Pitch

## Goal
Turn the working application into a strong engineering submission.

## Part 1 — Deployment

Deploy:
- frontend;
- backend API;
- PostgreSQL;
- required environment variables;
- webhook endpoint.

Keep architecture simple: modular monolith.

## Part 2 — GitHub README

Required sections:

```text
1. Hero
2. Problem
3. Solution
4. Why AI
5. Live Demo
6. Architecture
7. AI Architecture
8. Razorpay Integration
9. Guardrails/Security
10. Metrics
11. Failure Story
12. Setup
13. API Documentation
14. Limitations/Future Scope
```

## Part 3 — Architecture artifacts

Include:
- system context;
- container/application architecture;
- agent flow;
- payment sequence;
- order/payment state machine;
- ER/database diagram.

## Part 4 — API documentation

Document at least:
- auth;
- products;
- agent sessions;
- cart;
- checkout;
- payment verification;
- webhook;
- orders;
- analytics;
- audit.

## Part 5 — Video structure

### 0:00–0:30
Problem and why existing generic shopping assistants are insufficient.

### 0:30–1:00
Solution and product value.

### 1:00–3:00
Live customer demo:
intent → recommendation → growth → cart → Razorpay test checkout.

### 3:00–4:00
Architecture and AI/tool/policy separation.

### 4:00–4:30
Failure case and recovery.

### 4:30–5:00
Metrics, security, and future scale.

## Part 6 — Submission quality

The reviewer should be able to understand:
- what problem is solved;
- why AI is needed;
- what the agent can/cannot do;
- how money moves;
- what protects payment actions;
- how the repository runs;
- what failed;
- what was measured.

## Part 7 — Final scope statement

Do not claim:
- production payment processing;
- production-scale revenue impact;
- production fraud prevention;
- real merchant transaction volume.

Clearly state:
- synthetic/demo merchant data;
- Razorpay test environment;
- prototype/demo scope;
- measured test results where applicable.

## Part 8 — Final release

Tag the final build:

```text
v1.0.0-razorpay-buildathon
```

Use a release commit that is reproducible and matches the submitted video.
