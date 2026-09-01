# PayPilot AI — Master Phasewise Build Plan

## Project
**PayPilot AI — Merchant Growth & Agentic Checkout**

## Purpose
This document is the master execution contract for the project. Every implementation agent must follow these phases in order and stay inside the defined MVP scope.

## Scope boundary
The project is a professional, demo-ready modular monolith for Razorpay Track 1: AI Growth & Agentic Commerce.

The system must demonstrate:

1. Customer intent understanding.
2. Grounded product discovery from a verified catalog.
3. AI recommendation and bounded upsell/cross-sell.
4. Cart creation and management.
5. Merchant-configured growth rules.
6. Deterministic policy/guardrail validation.
7. Human confirmation before payment.
8. Razorpay test-mode order/payment integration.
9. Payment verification and webhook processing.
10. Audit trail of AI decisions and money-related actions.
11. Merchant analytics with measurable demo metrics.
12. At least one deliberately demonstrated failure and recovery path.
13. Professional documentation and deployment.

## Explicitly out of scope
Do NOT add these during the 3-day build unless the MVP is already complete:

- Real production payments.
- Real merchant onboarding/KYC.
- Multi-merchant marketplace infrastructure.
- Voice agents.
- WhatsApp/SMS integrations.
- Complex multi-agent frameworks.
- Fine-tuning an LLM.
- Training large custom ML models.
- Cryptocurrency/blockchain.
- Microservice deployment.
- Event streaming infrastructure such as Kafka.
- Recommendation infrastructure at production scale.
- Native mobile apps.
- Advanced observability platforms.
- Full ERP/accounting integrations.

## Phase order

| Phase | Name | Main outcome |
|---|---|---|
| 0 | Project Governance & Definition | Locked requirements and execution rules |
| 1 | Professional Repository & Environment | Runnable monorepo skeleton |
| 2 | Database & Seed Data | PostgreSQL schema + realistic synthetic catalog |
| 3 | Backend Foundation | API architecture, auth, validation, errors |
| 4 | Product Discovery & Commerce Core | Catalog, search, product details, cart |
| 5 | AI Agent & Growth Engine | Intent → tools → recommendations → upsell |
| 6 | Policy, Checkout & Razorpay | Bounded money flow with confirmation |
| 7 | Webhooks, Audit & Reliability | Verified asynchronous payment state |
| 8 | Merchant Dashboard & Analytics | Metrics and merchant controls |
| 9 | Testing, Security & Failure Engineering | Evidence of reliability |
| 10 | Deployment, Documentation & Pitch | Submission-ready product |

## Definition of Done for the whole project

The project is done only when:

- A clean clone can be installed and started.
- Customer can enter a shopping intent.
- Agent uses verified catalog tools.
- Recommendations are grounded in database data.
- Customer can accept an upsell.
- Cart totals are calculated server-side.
- Policy engine checks stock, amount limits and allowed actions.
- Customer explicitly confirms payment.
- Backend creates a Razorpay test order.
- Razorpay Checkout can be demonstrated in test mode.
- Payment signature is verified server-side.
- Webhook signature is validated.
- Duplicate events do not corrupt order state.
- Audit trail is visible.
- Merchant dashboard shows meaningful metrics.
- At least one failure scenario is reproducible and handled.
- README, architecture diagrams, setup instructions and 5-minute demo are complete.
