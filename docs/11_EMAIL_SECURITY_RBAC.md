# Engineering Specification — Email Service, Security & RBAC Matrix

## 📧 Email Configuration (`Nodemailer`)

PayPilot AI uses `nodemailer` for transactional HTML email notifications.

### Environment Variables (`.env`)
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-account@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="PayPilot AI Commerce <no-reply@paypilot.ai>"
```

*Note: If SMTP credentials are omitted, `EmailService` operates in **Console Log Fallback Mode**, printing HTML emails to server logs without throwing errors.*

---

## 🔒 Role-Based Access Control (RBAC) Matrix

| Endpoint / Page | Public | Customer (`CUSTOMER`) | Merchant (`MERCHANT`/`ADMIN`) |
|---|:---:|:---:|:---:|
| Storefront & Catalog Search (`/`) | ✅ | ✅ | ✅ |
| AI Chat Assistant (`/api/agent`) | ✅ | ✅ | ✅ |
| Cart CRUD (`/cart`, `/api/carts`) | ✅ | ✅ | ❌ Restricted |
| Checkout & Razorpay (`/checkout`) | ✅ | ✅ | ❌ Restricted |
| Order History (`/orders`, `/api/orders/my-orders`) | ❌ | ✅ | ✅ |
| Merchant Dashboard (`/merchant`, `/api/merchant`) | ❌ | ❌ Restricted | ✅ |
| Product CRUD (`/merchant/products`, `/api/products`) | ❌ (GET is public) | ❌ (Write restricted) | ✅ (Full POST/PATCH/DELETE) |
| Policy Studio (`/api/merchant/policy`) | ❌ | ❌ Restricted | ✅ |
| Audit Explorer (`/api/audit`) | ❌ | ❌ Restricted | ✅ |

---

## 🎤 Web Speech API Voice Recognition

The top search bar incorporates Web Speech API (`webkitSpeechRecognition`).
- Continuous: `false`
- Interim Results: `true`
- Language: `en-US`
- Auto-populates search query input and dispatches to PayPilot AI catalog engine.
