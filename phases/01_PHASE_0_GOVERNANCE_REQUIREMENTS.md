# Phase 0 — Project Governance, Product Definition & Scope Lock

## Goal
Freeze what we are building before implementation starts.

## Part 1 — Product identity

### Product name
PayPilot AI

### Track
Razorpay Buildathon — Track 1: AI Growth & Agentic Commerce

### Product statement
An AI-powered commerce agent that converts natural-language customer intent into a grounded product recommendation and bounded checkout workflow, while giving merchants visibility into growth impact.

## Part 2 — Primary actors

### Customer
- Browse/search through natural language.
- Receive recommendations.
- Review reasoning and prices.
- Accept or reject upsell.
- Manage cart.
- Confirm payment.
- View order/payment status.

### Merchant
- View catalog performance.
- Configure simple growth rules.
- View agent-assisted order metrics.
- View audit/activity.
- Inspect recommendation and conversion metrics.

### Admin/Developer
- Seed/demo data.
- Inspect system health.
- Access development logs.
- Not part of the customer-facing demo.

## Part 3 — Core user journey

Customer intent
→ AI understands intent
→ catalog tool retrieves verified products
→ recommendation/ranking
→ optional growth suggestion
→ customer accepts/rejects
→ cart
→ policy validation
→ explicit payment confirmation
→ Razorpay test order
→ Checkout
→ payment verification
→ webhook reconciliation
→ order success
→ audit + analytics

## Part 4 — Product principles

1. AI proposes; deterministic systems authorize.
2. The LLM never owns payment state.
3. Product facts come from the database/tools, not hallucinated text.
4. Prices/totals are calculated server-side.
5. Final payment requires explicit customer confirmation.
6. Every important AI/money action has an audit trail.
7. Every feature must have a demonstrable user or merchant value.

## Part 5 — MVP acceptance criteria

Each feature must answer:
- Who uses it?
- What problem does it solve?
- What API supports it?
- What database state changes?
- What can fail?
- How is failure handled?
- How can it be demonstrated?

## Part 6 — Change control

During the 3-day build:
- Critical bug fixes are allowed.
- Security/reliability improvements are allowed.
- Cosmetic improvements are allowed after core completion.
- New major features require explicit approval.
- Do not expand scope because an AI coding agent suggests extra architecture.
