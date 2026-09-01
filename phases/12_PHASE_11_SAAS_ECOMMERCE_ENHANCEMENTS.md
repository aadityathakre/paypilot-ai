# Phase 11 Specification — SaaS E-Commerce Upgrades & Razorpay Buildathon Perfection

## 📌 Objective
To elevate **PayPilot AI** from an MVP into a production-grade commercial platform by implementing realistic Razorpay Standard checkout simulations, strict RBAC route guarding, merchant product management (CRUD Studio), customer order history with financial receipt tracking, voice speech recognition, and automated Nodemailer email notifications.

---

## 🏗️ Architecture & Component Upgrades

### 1. 💳 Razorpay Standard Checkout Simulation Modal (`RazorpayModal.tsx`)
- High-fidelity modal design matching Razorpay official branding (`#0284c7` primary blue).
- 4-step flow:
  1. **Method Selection:** UPI (GPay/PhonePe/Paytm/VPA), Cards, Netbanking (SBI, HDFC, ICICI, Axis), Wallets, QR Code.
  2. **2-Step Authentication Simulation:** 4-digit UPI PIN prompt for UPI, 6-digit Bank OTP prompt for Credit/Debit Cards.
  3. **Cryptographic Processing Overlay:** Displays active HMAC SHA256 reconciliation status.
  4. **Success Coin Transition:** Animated green tick mark and seamless transition to `/order-success`.

### 2. 🔒 Strict Role-Based Access Control & Navigation (`ProtectedRoute.tsx`)
- Encapsulates routes using `allowedRoles`:
  - `CUSTOMER`: Limited strictly to Storefront, Top Search Bar, Cart, Checkout, Order History (`/orders`). Blocked from `/merchant`.
  - `MERCHANT`/`ADMIN`: Restricted strictly to Merchant Dashboard (`/merchant`), Policy Studio, Analytics, Product Management (`/merchant/products`), Orders Log, Audit Explorer.

### 3. 📦 Merchant Product Catalog Studio (`MerchantProductsPage.tsx`)
- Complete product management tab at `/merchant/products`.
- Features:
  - List all active catalog products with SKU, category, stock indicators, and price in ₹.
  - **Add Product Modal:** Creates new SKU with name, category, price, stock, description, and optional image URL.
  - **Edit Product Modal:** Live updating of catalog price, stock inventory, and active status.
  - **Delete Product:** Soft deletion (`active: false`) with audit event tracking.

### 4. 👤 Customer Order History & Digital Receipts (`CustomerOrdersPage.tsx`)
- Dedicated customer account page at `/orders`.
- Features:
  - Full purchase history table listing order dates, status badges (`PAID`, `PENDING_PAYMENT`, `FAILED`), items, and total paid.
  - Razorpay Payment ID (`pay_test_...`) and digital receipt viewing modal.
  - PayPilot Demo Credit Wallet widget showing ₹10,000 balance.

### 5. 🎤 Voice Speech Recognition (`useSpeechRecognition.ts`)
- Custom React hook wrapping standard `webkitSpeechRecognition` Web Speech API.
- Microphone button in top navbar automatically transcribes voice input (*"Show me coding laptops under 70,000"*) and triggers catalog search.

### 6. 📧 Nodemailer Email Notifications (`EmailService`)
- Integrates `nodemailer` in `apps/api/src/integrations/email/email.service.ts`.
- Automated HTML email triggers:
  - **Order Confirmation Email:** Dispatched when payment transitions to `PAID` state with line item table and Razorpay payment ID.
  - **Forgot / Reset Password Flow:** `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` generating 1-hour secure tokens.
  - **Console Log Fallback Mode:** Operates safely when SMTP credentials are not set in `.env`.

---

## 🧪 Verification Contract
- `npm run build` passes with zero errors.
- `scripts/run-all-tests.ts` runs all test suites sequentially with 100% green pass.
