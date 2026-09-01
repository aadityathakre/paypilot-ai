# PayPilot AI Architecture & Data Flows

## 1. System Context Diagram

```mermaid
flowchart LR
    Customer[Customer Browser] --> Web[React Frontend Application]
    Merchant[Merchant Admin] --> Web
    Web --> API[Node/Express TypeScript API]
    API --> DB[(Neon PostgreSQL Database)]
    API --> AI[AI Agent / LLM Provider]
    API --> RZP[Razorpay Payment Gateway]
    RZP --> Web
    RZP --> Webhook[Webhook Processor]
    Webhook --> API
```

## 2. Intent-to-Payment Bounded Flow

```mermaid
sequenceDiagram
    participant User as Customer
    participant Web as React Web App
    participant API as Express API
    participant AI as Agent Orchestrator
    participant DB as PostgreSQL
    participant Policy as Policy Engine
    participant RZP as Razorpay API

    User->>Web: "I need a coding laptop under ₹70,000"
    Web->>API: POST /api/agent/sessions/:id/messages
    API->>AI: Extract structured intent
    AI->>API: Call searchCatalog(category="laptops", maxPrice=70000)
    API->>DB: Query verified products
    DB-->>API: [Pro Developer Laptop 15 (₹64,990)]
    API->>AI: Rank & explain options
    API-->>Web: Structured recommendations + Upsell proposal
    User->>Web: Add to Cart & Proceed
    Web->>API: POST /api/checkout/create-order
    API->>Policy: Validate spending cap (<= ₹80,000) & Confirmation Gate
    Policy-->>API: Approved
    API->>RZP: POST /v1/orders (amount_paise: 6499000)
    RZP-->>API: razorpay_order_id
    API-->>Web: Razorpay Checkout modal configuration
    User->>RZP: Complete test-mode payment
    RZP-->>Web: payment_id + signature
    Web->>API: POST /api/payments/verify
    API->>API: Server-side HMAC SHA256 verification
    API->>DB: Update order status to PAID + Record AuditEvent
    API-->>Web: Payment confirmed
```

## 3. Relational Entity Relationship Overview

```text
User ──────────────< Merchant ──────────────< Product
 │                      │                        │
 │                      ├───1 MerchantPolicy      │
 │                      │                        │
 │                      └───< Order >────── OrderItem
 │                              │
 ├───< AgentSession >─── AgentEvent / Message
 │
 └───< Cart >────────── CartItem >────────── Product
```
