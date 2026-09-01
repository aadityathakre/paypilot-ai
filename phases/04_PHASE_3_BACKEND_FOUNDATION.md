# Phase 3 — Backend Foundation & Application Services

## Goal
Build the API layer that all frontend and AI features depend on.

## Part 1 — Request pipeline

```text
HTTP Request
→ CORS
→ Auth (where required)
→ Validation
→ Controller
→ Service
→ Repository/Prisma
→ Response
```

## Part 2 — Common backend modules

```text
auth/
products/
cart/
agent/
checkout/
payments/
webhooks/
analytics/
audit/
```

## Part 3 — Error model

Use a consistent error response:

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product was not found"
  }
}
```

Never expose stack traces in production responses.

## Part 4 — Validation

Validate:
- IDs
- numeric amounts
- pagination
- search input
- cart quantities
- checkout requests
- payment verification input
- webhook payload/signature

## Part 5 — Authentication scope

MVP can use lightweight JWT-based roles:
- CUSTOMER
- MERCHANT
- ADMIN

The role determines protected routes. Avoid overbuilding RBAC.

## Part 6 — Health and diagnostics

Required:
- `GET /health`
- startup logs
- database connectivity check
- external integration errors translated into safe application errors

## Part 7 — Completion test

Every completed backend module must include:
- route
- controller
- service
- validation
- error handling
- database interaction
- at least one happy path
- at least one failure path
