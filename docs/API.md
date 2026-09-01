# PayPilot AI — Complete API Specification

This document provides complete request, response, and error definitions for all 23 REST API endpoints implemented in PayPilot AI.

---

## 🔒 Authentication & Authorization Headers

For protected endpoints (`Bearer`), pass the JWT token in the HTTP Authorization header:
```text
Authorization: Bearer <jwt_token>
```

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Creates a new customer or merchant account.

- **Request Body:**
```json
{
  "name": "Alex Developer",
  "email": "alex@example.com",
  "password": "Password123!",
  "role": "CUSTOMER"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_948291a2",
      "email": "alex@example.com",
      "name": "Alex Developer",
      "role": "CUSTOMER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### `POST /api/auth/login`
Authenticates credentials and returns JWT token.

- **Request Body:**
```json
{
  "email": "customer@paypilot.ai",
  "password": "CustomerPass@123"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_customer_001",
      "email": "customer@paypilot.ai",
      "name": "Demo Customer",
      "role": "CUSTOMER"
    },
    "token": "eyJhbGciOiJIUzI1..."
  }
}
```

### `GET /api/auth/me`
Fetches authenticated user profile.

- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_customer_001",
      "email": "customer@paypilot.ai",
      "name": "Demo Customer",
      "role": "CUSTOMER"
    }
  }
}
```

---

## 2. Commerce & Catalog Endpoints (`/api/products`)

### `GET /api/products`
Multi-faceted product catalog search.

- **Query Parameters:** `search`, `category`, `maxPrice`, `page`, `limit`
- **Example:** `/api/products?category=laptops&maxPrice=80000`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "bd87fa52-d1d8-4422-8e62-f1e3e4423918",
        "name": "ProBook Developer Laptop 16\"",
        "pricePaise": 6499000,
        "category": "laptops",
        "stock": 14,
        "attributes": {
          "cpu": "Apple M3 Pro",
          "ram": "18GB",
          "storage": "512GB SSD"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "totalPages": 1
  }
}
```

---

## 3. AI Commerce Agent Endpoints (`/api/agent`)

### `POST /api/agent/sessions`
Initializes a new active AI conversation session.

- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "bd93f351-bd1b-487c-868d-0fcde087955c",
      "customerId": "usr_customer_001",
      "status": "ACTIVE",
      "messages": []
    }
  }
}
```

### `POST /api/agent/sessions/:id/messages`
Sends user prompt and retrieves tool-grounded recommendations with 5-signal scores.

- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
```json
{
  "content": "I need a coding laptop under 70k"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reply": "Here are top-ranked coding laptops matching your budget of ₹70,000...",
    "intent": {
      "category": "laptops",
      "budgetMax": 70000,
      "useCases": ["coding"]
    },
    "recommendations": [
      {
        "productId": "bd87fa52-d1d8-4422-8e62-f1e3e4423918",
        "score": 0.94,
        "reasoning": "High-performance Apple M3 Pro CPU with 18GB RAM within your ₹70,000 budget."
      }
    ],
    "growthProposal": {
      "upsellProduct": "Logitech MX Master 3S",
      "discountPercent": 10,
      "reasoning": "Complementary developer mouse."
    }
  }
}
```

---

## 4. Policy Engine & Bounded Checkout Endpoints (`/api/checkout` & `/api/payments`)

### `POST /api/checkout/validate`
Evaluates cart against merchant spending ceilings and stock levels.

- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "approved": true,
    "policyCeilingRupees": 80000,
    "cartTotalRupees": 64990,
    "violations": []
  }
}
```

### `POST /api/checkout/create-order`
Creates a pending order and generates Razorpay order payload.

- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
```json
{
  "customerConfirmed": true
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "orderId": "ord_94829103",
    "razorpayOrderId": "order_PZ94829102",
    "amountPaise": 6499000,
    "currency": "INR",
    "key": "rzp_test_demo_key"
  }
}
```

### `POST /api/payments/verify`
Verifies HMAC SHA256 signature server-side.

- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
```json
{
  "orderId": "ord_94829103",
  "razorpayOrderId": "order_PZ94829102",
  "razorpayPaymentId": "pay_PZ94829102",
  "razorpaySignature": "2c948192a8192b..."
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orderStatus": "PAID",
    "paymentId": "pay_PZ94829102",
    "receiptUrl": "/orders/ord_94829103"
  }
}
```

---

## 5. Webhook Ingestion (`/api/webhooks/razorpay`)

### `POST /api/webhooks/razorpay`
Ingests asynchronous Razorpay events with raw buffer HMAC validation and idempotency checks.

- **Headers:** `X-Razorpay-Signature: <signature>`
- **Request Body:** Raw Buffer (`application/json`)
- **Response (200 OK):**
```json
{
  "status": "ok",
  "event": "payment.captured",
  "processed": true
}
```
