# Technology Stack, Prerequisites, APIs and Third-Party Integrations

## 1. Recommended stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Recharts

### Backend

- Node.js
- TypeScript
- Express
- Zod
- Prisma
- PostgreSQL
- JWT authentication
- Pino or Winston for structured logging

### AI

- LLM with tool/function calling and structured output.
- Provider selected based on available API credits and reliability.
- Keep model access behind an `AIProvider` interface so the vendor can be changed without rewriting business logic.

### Payments

- Razorpay Node.js SDK / API.
- Razorpay Checkout in test mode.
- Razorpay webhooks.

Razorpay's current Node.js SDK prerequisites page says Node.js v22.2 or higher and `npm i razorpay`. Verify the exact version requirement against the current docs before setup. https://razorpay.com/docs/payments/server-integration/nodejs/

### Database

- PostgreSQL.
- Prisma migrations.

### Deployment

MVP option:

```text
Frontend -> Vercel
Backend -> Render/Railway/Fly.io
Database -> Neon/Supabase Postgres
```

Choose the fastest reliable option available to the team. Do not burn build time switching providers.

## 2. External services

### Razorpay

Purpose:

- Create test-mode orders.
- Open Checkout.
- Verify payment response.
- Receive webhook events.

Official docs:

- https://razorpay.com/docs/api/orders/create/
- https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/
- https://razorpay.com/docs/webhooks/validate-test/

### LLM provider

Required capabilities:

- Structured output.
- Function/tool calling.
- Low enough latency for a demo.
- Stable API access.

The model should never directly receive or output Razorpay secrets.

## 3. Environment variables

```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=...
AI_API_KEY=...
AI_MODEL=...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
CLIENT_URL=http://localhost:5173
```

Never commit `.env`.

Commit `.env.example` with placeholder values.

## 4. Local prerequisites

Install:

- Node.js 22.x or current Razorpay-supported version.
- npm.
- Git.
- PostgreSQL locally or cloud database.
- VS Code.
- Postman/Bruno/Insomnia.
- Razorpay test-mode account/keys.
- LLM API key.
- Optional tunneling tool for webhook testing if required by your environment.

## 5. Development setup

```bash
# clone
 git clone <repo-url>
 cd paypilot-ai

# install frontend
 cd apps/web
 npm install

# install backend
 cd ../api
 npm install

# migrate
 npx prisma migrate dev

# seed
 npm run db:seed

# run
 npm run dev
```

Prefer npm workspaces or a clear monorepo if the team is comfortable with it.

## 6. Razorpay setup checklist

1. Create Razorpay account.
2. Create Test Mode API keys.
3. Keep key ID and secret in environment variables.
4. Configure frontend with only the test key ID.
5. Keep key secret on backend.
6. Configure a test-mode webhook endpoint.
7. Set a webhook secret.
8. Implement raw-body signature validation.
9. Test successful and failed payment states.

Razorpay's official Node.js integration guide states that test-mode API keys and a mock checkout are used for simulated transactions; no real money is deducted with test keys. https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/

## 7. AI implementation rules

### Rule 1: structured outputs

Validate model output using Zod.

### Rule 2: tool grounding

Product facts must come from catalog tools.

### Rule 3: deterministic money rules

LLM proposes; server decides whether money-related action is allowed.

### Rule 4: no secret exposure

Never pass payment secrets into prompts.

### Rule 5: bounded autonomy

The agent can only call tools in its allowlist.

## 8. AI tool interface

Example:

```ts
interface AgentTools {
  searchCatalog(input: SearchCatalogInput): Promise<Product[]>;
  getProduct(input: GetProductInput): Promise<Product>;
  getCart(input: GetCartInput): Promise<Cart>;
  proposeUpsell(input: UpsellInput): Promise<UpsellCandidate | null>;
}
```

Payment should not be an unconstrained LLM tool.

Instead:

```text
LLM intent/decision
 -> server policy
 -> explicit customer confirmation
 -> checkout service
 -> Razorpay
```

## 9. Testing stack

- Vitest/Jest for unit tests.
- Supertest for API tests.
- Playwright for critical browser flow.
- Postman/Bruno collection for manual API checks.

Minimum automated tests:

```text
policy accepts valid order
policy blocks over-limit order
product price cannot be overridden by client
invalid payment signature rejected
valid payment signature accepted
webhook signature rejected when tampered
duplicate webhook does not duplicate state change
agent invalid output rejected
```

## 10. Observability

Log structured JSON:

```json
{
  "requestId": "req_123",
  "route": "/api/checkout/create-order",
  "userId": "user_123",
  "durationMs": 182,
  "status": 200
}
```

Never log:

- API secrets.
- JWT signing secrets.
- card credentials.
- webhook secret.
- sensitive payment data.

## 11. Security baseline

- HTTPS in deployed environment.
- CORS restricted to frontend origin.
- Helmet.
- Rate limiting.
- Input validation.
- SQL/ORM parameterization.
- Secure password hashing.
- JWT expiry.
- Role checks.
- Server-side price calculation.
- Webhook signature validation.
- Payment signature validation.
- Audit logs.
