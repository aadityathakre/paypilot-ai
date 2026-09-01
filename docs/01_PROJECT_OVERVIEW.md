# PayPilot AI — Track 1 Project Overview

## 0. Project identity

**Working title:** PayPilot AI — Merchant Growth & Agentic Checkout

**Razorpay Buildathon track:** Track 1 — AI Growth & Agentic Commerce

**Core idea:** Build a working AI-native commerce system that helps a merchant turn natural-language customer intent into a curated purchase journey, with AI-powered recommendation/upsell decisions, a bounded checkout workflow, Razorpay test-mode payment integration, explicit approval controls, and an auditable decision trail.

The official Track 1 brief asks builders to either grow merchant revenue using Razorpay test-mode APIs or make a merchant transactable by an AI buyer. Razorpay specifically calls out conversational checkout, agent-readable catalogs, upsell/cross-sell agents, and campaign orchestration. The published bar is: every money action should be explainable, bounded and gated; show the audit trail and one graceful failure. Source: https://razorpay.com/buildathon/

## 1. The problem

Traditional commerce makes the customer do the work:

1. Search for a product.
2. Apply filters.
3. Compare products.
4. Build a cart.
5. Decide on accessories or bundles.
6. Reach checkout.
7. Pay.
8. Recover when something fails.

The project converts that sequence into an **intent-to-action system**:

> Customer says what they want -> agent understands intent -> verified catalog tools retrieve options -> decision engine ranks options -> agent proposes a cart/upsell -> policy layer validates actions -> customer confirms payment -> Razorpay test-mode order/payment flow executes -> webhook updates state -> analytics records outcome.

## 2. Product vision

### Vision

Make a merchant's catalog and payment flow understandable and actionable by AI, without giving an LLM uncontrolled authority over money.

### Product promise

**Discover -> Decide -> Buy -> Learn**

- **Discover:** understand natural-language intent.
- **Decide:** choose relevant products/bundles and explain why.
- **Buy:** create a controlled Razorpay checkout flow with explicit confirmation and verification.
- **Learn:** record outcomes so the merchant can understand conversion, AOV, upsell acceptance and agent performance.

## 3. Primary users and actors

### Customer

Wants a product or bundle and prefers a conversational, low-friction journey.

Typical request:

> "I need a coding laptop under ₹70,000 and a mouse. Prefer long battery life."

### Merchant

Owns the catalog and growth rules. Wants higher conversion, higher AOV and an operationally controllable AI experience.

### AI Commerce Agent

A software actor, not a human role. Interprets intent and invokes approved tools. It must not directly bypass policy controls.

### Platform / Payment Integration

The backend, database, Razorpay API and webhook infrastructure that turn an agent recommendation into a real test-mode payment workflow.

## 4. MVP boundary

### Must have

- Customer conversational interface.
- Merchant catalog management.
- Natural-language intent extraction.
- Tool-calling agent.
- Verified product search.
- Recommendation/ranking logic.
- Cart generation.
- One bounded upsell/cross-sell decision.
- Merchant-configurable spending limit / action policy.
- Customer confirmation before final payment action.
- Razorpay test-mode order creation.
- Razorpay Checkout integration.
- Server-side payment verification.
- Webhook handling with signature validation.
- Payment/order state machine.
- Audit trail of agent decisions and money-related actions.
- Merchant analytics dashboard.
- At least one deliberately demonstrated failure and graceful recovery.
- README, architecture diagrams, local setup and video-ready demo path.

### Nice to have

- Merchant natural-language analytics assistant.
- Personalized recommendations using historical events.
- Product embeddings / semantic retrieval.
- Experiment mode for upsell policies.
- Multi-agent decomposition.
- Campaign generator.

### Do not build in the first 3 days

- Real production payments.
- Complex microservices.
- Native mobile application.
- Custom model training.
- Full ERP integration.
- Dozens of agents.
- Elaborate recommendation research without a working checkout flow.

## 5. Functional requirements

### FR-01 Intent capture

The system shall accept customer intent in natural language.

### FR-02 Intent structuring

The AI shall convert free text into structured fields such as category, budget, quantity, constraints and preferences.

### FR-03 Catalog grounding

Recommendations shall come only from products returned by approved catalog tools/database queries.

### FR-04 Recommendation

The system shall rank candidate products and explain the recommendation.

### FR-05 Cart creation

The customer shall be able to accept selected products and create a cart.

### FR-06 Growth action

The agent shall optionally recommend an upsell or cross-sell based on merchant-defined rules and product context.

### FR-07 Policy validation

Money-affecting actions shall pass a server-side policy check.

### FR-08 Approval gate

The customer shall explicitly approve the final purchase amount before payment creation/checkout.

### FR-09 Payment

The backend shall create a Razorpay test-mode order and the frontend shall complete the test-mode Checkout flow.

### FR-10 Verification

The backend shall verify the checkout response and webhook signatures before marking payment state as trusted.

### FR-11 Auditability

The system shall preserve a trace of intent, tools, decision, cart, policy result, order and payment outcome.

### FR-12 Analytics

The merchant shall see conversion, AOV, assisted revenue, upsell acceptance and failure metrics for the demo dataset.

## 6. Non-functional requirements

### Reliability

- Idempotent application operations where retries could create duplicate business actions.
- Explicit state transitions for cart/order/payment.
- Graceful handling of LLM/tool/payment failures.

### Security

- Razorpay secret stays server-side.
- Validate payment signatures server-side.
- Validate webhook signatures using the raw request body.
- Role-based access to merchant functions.
- Tool allowlist for the agent.
- Hard policy limits before money-related actions.

### Explainability

Every AI recommendation shall have an understandable rationale. Money-affecting actions must have an audit event.

### Observability

Log request correlation ID, tool invocation, policy decision, external API result and failure classification without logging secrets or sensitive payment credentials.

### Maintainability

Use clear modules and boundaries rather than a single giant Express file.

## 7. Success metrics for the demo

The demo should report measurements, even when using synthetic/local data.

Suggested metrics:

- Intent-to-recommendation success rate.
- Recommendation acceptance rate.
- Upsell acceptance rate.
- Cart completion rate.
- Payment success rate in test mode.
- Median agent response latency.
- Tool failure rate.
- Policy-block rate.
- Revenue influenced by AI-assisted sessions.
- Average order value (AOV).

For synthetic experiments, label them honestly as **demo/experimental measurements**, not production impact.

## 8. The differentiating thesis

The project is not:

> "An AI shopping chatbot."

It is:

> **A bounded agentic commerce workflow that connects customer intent to verified catalog decisions and a controlled Razorpay payment flow, with explainability, policy enforcement, verification and an audit trail.**

## 9. Product narrative

A merchant uploads/maintains products and growth rules.

A customer says what they want.

The agent queries verified tools, constructs a recommendation and proposes a cart.

The system explains why the recommendation was made.

The agent may offer one relevant upsell.

The server checks constraints and asks for explicit final confirmation.

The backend creates the Razorpay test-mode order.

The customer completes test checkout.

Razorpay returns payment information; the backend verifies the signature and processes webhook events.

The final state becomes visible in the customer experience and merchant dashboard.

The audit timeline allows a reviewer to replay the decision path.

## 10. Official Razorpay references

- Buildathon: https://razorpay.com/buildathon/
- Node.js integration: https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/
- Orders API: https://razorpay.com/docs/api/orders/create/
- Webhook validation: https://razorpay.com/docs/webhooks/validate-test/
- Agentic Payments: https://razorpay.com/blog/agentic-payments-the-future-of-in-app-commerce/
