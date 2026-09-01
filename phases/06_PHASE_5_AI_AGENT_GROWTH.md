# Phase 5 — AI Agent & Merchant Growth Engine

## Goal
Implement the AI as a controlled decision layer, not as the owner of business state.

## Part 1 — Agent responsibility

The agent is allowed to:
- understand customer intent;
- extract budget/preferences/use case;
- call catalog tools;
- call recommendation tools;
- call growth tools;
- explain recommendations;
- prepare a proposed cart action.

The agent is NOT allowed to:
- directly mutate payment state;
- invent products;
- invent prices;
- bypass policy checks;
- directly mark orders paid.

## Part 2 — Agent pipeline

```text
User Message
→ Intent Parser
→ Agent Orchestrator
→ Tool Router
→ Verified Tool Results
→ Recommendation
→ Growth Decision
→ Structured Response
```

## Part 3 — Structured intent

Example:

```json
{
  "category": "laptop",
  "budgetMax": 70000,
  "useCases": ["coding", "gaming"],
  "preferences": ["performance"]
}
```

## Part 4 — Required tools

### Catalog tool
Input:
- category
- query
- budget
- tags

Output:
- verified product records

### Recommendation tool
Input:
- customer intent
- candidate products
- cart

Output:
- ranked products
- reason
- score

### Growth tool
Input:
- cart
- customer intent
- merchant growth rules

Output:
- optional upsell/cross-sell/bundle proposal

## Part 5 — Grounding rules

Before the agent mentions a product:
- product must exist in tool result;
- price must match server data;
- inventory must be checked before checkout;
- recommendations should cite their rationale.

## Part 6 — Guarded tool architecture

```text
LLM
 ↓
Allowed Tool
 ↓
Validated Inputs
 ↓
Business Service
 ↓
Database
```

Never:

```text
LLM → arbitrary database mutation
```

## Part 7 — AI evaluation

Test:
- normal shopping intent;
- ambiguous intent;
- budget constraint;
- no matching product;
- malicious prompt;
- unsupported action;
- unavailable product.

For each test record:
- input;
- expected behavior;
- actual output;
- pass/fail.

## Part 8 — Completion demo

Customer says something such as:
“I need a work-from-home setup under ₹50,000.”

System:
- extracts intent;
- retrieves products;
- ranks recommendations;
- proposes complementary products;
- explains why;
- never invents catalog facts.
