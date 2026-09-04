# PayPilot AI — Track 01: AI Growth & Agentic Commerce 🚀

> **Razorpay Agentic Commerce Hackathon Entry**  
> *Growing merchant revenue, making merchants sellable to AI buyers, and gating money actions with explainable audit trails & bounded policy guardrails.*

---

## 🌟 Hackathon Track 01 Coverage Matrix

| Hackathon Requirement | Implementation in PayPilot AI | Tech / API Endpoint |
| :--- | :--- | :--- |
| **Conversational In-App Checkout** | Web Speech Voice Assistant Modal + Text Chatbot Drawer (`PayPilot AI Assistant`). Natural-language intent to verified PostgreSQL product search & 1-click Razorpay / Wallet Checkout. | `useSpeechRecognition.ts`, `HomePage.tsx`, `RazorpayModal.tsx` |
| **Agent-Readable Catalog** | Standardized JSON schema for AI buyers adhering to **ACP / UAP / AP2 / x402** agentic commerce protocols. Allows external AI agents to query product metadata, stock, and execute direct purchases. | `GET /api/agent/catalog` |
| **Upsell & Cross-Sell Agent** | Multi-signal ranking algorithm (`RankedRecommendation`) scoring catalog items by intent relevancy, budget constraints, and merchant priority. | `ai.provider.ts`, `agent.service.ts` |
| **Campaign Orchestrator** | Merchant Studio tools allowing merchants to orchestrate targeted discount campaigns, manage inventory, and track AI-driven growth metrics. | `MerchantStudioPage.tsx`, `/api/merchant` |
| **Bounded & Gated Money Actions** | Policy enforcement engine capping order value at ₹100,000, checking live stock, and signing transactions with PostgreSQL HMAC SHA256 hashes. | `payments.service.ts`, `checkout.service.ts` |
| **Live Audit Trail** | Every money action (`PAYMENT_VERIFIED`, `WALLET_PAYMENT_SUCCESS`, `WALLET_PAYMENT_BLOCKED_INSUFFICIENT_FUNDS`, `POLICY_REJECTED`) recorded in PostgreSQL `audit_events` with correlation IDs & timestamps. | `GET /api/audit/events`, `CustomerProfilePage.tsx` |
| **Graceful Failure Handling** | Insufficient wallet balance calculates exact shortfall (`₹required` - `₹balance`) and provides a 1-click Razorpay top-up recovery path. | `payments.service.ts`, `RazorpayModal.tsx` |

---

## 🛠️ What Broke at 2 AM & How We Got Out

### 1. The HMAC SHA256 Signature Mismatch Gotcha
- **The Challenge**: During early test-mode integration, Web Speech API speech-to-text queries occasionally generated transient double quotes or space formatting in order payloads, causing Razorpay HMAC SHA256 signature verification to mismatch on the backend.
- **The Solution**: We implemented raw body buffer preservation in Express (`express.json({ verify: (req, res, buf) => { req.rawBody = buf; } })`), guaranteeing byte-for-byte cryptographic fidelity for Razorpay webhook verification and payment signature checks in PostgreSQL transactions.

### 2. Concurrency & Stock Overselling Prevention
- **The Challenge**: Simultaneous AI agent checkout requests risked overselling product stock in PostgreSQL during high-concurrency voice shopping sessions.
- **The Solution**: Encapsulated cart conversion and stock decrement inside atomic Prisma transactions (`prisma.$transaction`) with strict stock validation before payment capture.

### 3. Audio Feedback Loops in Web Speech Recognition
- **The Challenge**: The Indian female SpeechSynthesis voice was occasionally picked up by the browser microphone, causing the AI's own spoken greeting to trigger accidental speech searches.
- **The Solution**: Designed a sequential execution pipeline in `useSpeechRecognition.ts` where Web Speech microphone recording (`recognition.start()`) waits for SpeechSynthesis to emit `utterance.onend` before opening the mic channel.

---

- **Frontend Application**: `http://localhost:5173`
- **Backend API Service**: `http://localhost:5000`
- **Agent-Readable Catalog Endpoint**: `http://localhost:5000/api/agent/catalog`
- **Audit Trail Endpoint**: `http://localhost:5000/api/audit/events`
