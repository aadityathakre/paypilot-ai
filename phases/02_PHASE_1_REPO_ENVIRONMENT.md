# Phase 1 — Professional Repository & Development Environment

## Goal
Create a clean, reproducible monorepo before business logic.

## Part 1 — Repository

```text
paypilot-ai/
├── apps/
│   ├── web/
│   └── api/
├── prisma/
├── docs/
├── architecture/
├── scripts/
├── tests/
├── .env.example
├── .gitignore
├── README.md
├── LICENSE
└── package.json
```

## Part 2 — Frontend foundation

Use:
- React
- TypeScript
- Vite
- React Router
- API client
- Form validation
- Clean component structure

Required application areas:
- Customer shopping
- Cart
- Checkout
- Order result
- Merchant dashboard

## Part 3 — Backend foundation

Use:
- Node.js
- Express
- TypeScript

Set up:
- Server startup
- Environment configuration
- JSON handling
- CORS
- Central error middleware
- Request validation
- Logging
- Health endpoint
- Module-based routing

## Part 4 — Shared conventions

Use:
- TypeScript strict mode.
- ESLint/formatter.
- Consistent HTTP status codes.
- DTO/request validation.
- Service/controller separation.
- No secrets in Git.

## Part 5 — Environment

Minimum environment variables:

```env
DATABASE_URL=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
AI_API_KEY=
CLIENT_URL=
PORT=
```

## Part 6 — Completion test

A clean machine should be able to:
1. install dependencies;
2. create environment file;
3. migrate database;
4. seed database;
5. start backend;
6. start frontend;
7. call health endpoint.
