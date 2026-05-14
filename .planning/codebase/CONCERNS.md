# Concerns
<!-- last_mapped: 2026-05-14 -->

## Tech Debt

### Duplicate Auth Proxy Routes
4x duplicate auth proxy route sets in the frontend (`api/auth/`, `api/auth-proxy/`, `api-auth/`, etc.). Confusing and likely to cause routing bugs when one set is updated without the others.

### `TokenService` Debug Artifact (`frontend/src/services/token.service.ts`)
~548 lines. Re-stores httpOnly-destined JWTs in readable `document.cookie` and `localStorage`. This circumvents the security model of httpOnly cookies and exposes tokens to XSS.

### Copy-Pasted Whisper Audio Processing (`backend/src/gemini/gemini.service.ts`)
~400 lines of near-identical audio processing code duplicated across 4 task methods (tasks 39–42). Significant maintenance burden — a bug fix must be applied in 4 places.

### Subscription Renewal Bug (`backend/src/subscriptions/subscriptions.service.ts`)
`addDaysToSubscription` always calculates expiry from `now` rather than from the current `expiresAt`. A user who renews before expiry silently forfeits their remaining days.

### Dead Method (`backend/src/tasks/tasks.service.ts`)
Private method `decrementFreeCheck` exists but is never called. Dead code adds noise.

### Synchronous Prompt File Reads (`backend/src/gemini/gemini.service.ts`)
Prompt files read via `fs.readFileSync` on every AI grading request. Should be loaded once at module initialization.

---

## Known Bugs

### Operator Precedence Error in 3GPP Audio Detection (`backend/src/gemini/gemini.service.ts`)
Missing parentheses in the 3GPP brand detection condition. Affects `checkTask39/40/41/42`. Audio format detection may silently fail for iPhone recordings.

### Race Condition — Check Balance (`backend/src/tasks/tasks.service.ts`)
Concurrent task submissions can both pass `checkAccess` before either decrements `freeChecksLeft`. A user can submit multiple tasks simultaneously and only be charged for one.

### Potential Double-Processing of Payments (`backend/src/payments/payments.service.ts`)
Webhook handler and `verifyPayment` polling can both process the same `SUCCEEDED` event if they run concurrently. No idempotency lock.

---

## Security Issues

### YooKassa Webhook — No Signature/IP Verification (`backend/src/payments/payments.controller.ts`)
The webhook endpoint accepts any HTTP POST. Any client can forge a payment event and credit checks to any account. **Critical.**

### PostHog API Key Hardcoded in Source (`frontend/src/app/layout.tsx` or similar)
`phc_tef8AFVMWsySaQUvJCAbCZhGC49exziC3dH6aACHA6gC` visible in source. Should be an environment variable.

### Unauthenticated Open Reverse Proxy (`frontend/src/app/api/proxy/[...path]/route.ts`)
`/api/proxy/[...path]` proxies any path with no authentication. Can be used to probe internal services or bypass CORS.

### Debug Cookie Endpoint (`frontend/src/app/api/debug-cookies/route.ts` or similar)
`/api/debug-cookies` exposes all cookies and request headers. Debug endpoint left in production codebase. **Should be deleted.**

### VK OAuth `id_token` Decoded Without Signature Verification (`backend/src/auth/auth.service.ts`)
`id_token` from VK OAuth is JWT-decoded without verifying the signature. An attacker can craft a fake VK identity token.

### Rate Limiting Inactive
`ThrottlerModule` is imported and configured but `ThrottlerGuard` is never applied globally or to any controller. Rate limiting is effectively disabled.

---

## Performance Issues

### Base64 Binary Data in PostgreSQL (`backend/prisma/schema.prisma`)
Audio and images stored as base64 strings directly in `tasks` table. Individual rows can reach 5–10 MB. Degrades query performance and inflates database size significantly.

### Inefficient Admin Charts Query (`backend/src/admin/admin.service.ts`)
`getCharts()` loads all 30-day records into Node.js memory and aggregates in JavaScript instead of using SQL `GROUP BY` / `COUNT`. Will degrade with scale.

---

## Missing Validations

- No `MaxLength` or `@IsBase64` validation on base64 input fields — users can send arbitrarily large payloads despite the 20 MB body limit.
- No `CHECK (free_checks_left >= 0)` database constraint — balance can go negative if the race condition fires.

---

## Testing

- **Zero automated tests** across the entire codebase (backend + frontend).
- `@nestjs/testing` is in `devDependencies` but never used.

---
*Mapped: 2026-05-14*
