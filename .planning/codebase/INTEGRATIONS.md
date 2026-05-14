# External Integrations

**Analysis Date:** 2026-05-14

## APIs & External Services

**AI / Machine Learning:**
- OpenAI Chat Completions (GPT-5.4-mini) - Grades student essay and speaking tasks (Tasks 37–42)
  - SDK/Client: `openai ^6.33.0` (`backend/src/gemini/gemini.service.ts`)
  - Auth: `OPENAI_API_KEY` env var
  - Model: `gpt-5.4-mini`, temperature 0.4, max 8192 tokens
  - Retry logic: 3 attempts with 5s/10s/15s backoff
  - Proxy support: `GEMINI_PROXY` env var routes requests via `undici` ProxyAgent
- OpenAI Whisper (`whisper-1`) - Transcribes audio submissions for Tasks 39–42
  - Client: raw `undici` fetch (not the SDK) to support proxy and multipart/form-data
  - Called at: `https://api.openai.com/v1/audio/transcriptions`
  - ffmpeg used to convert 3GPP/iPhone audio to WAV before submission
- OpenAI TTS (`tts-1`) - Text-to-speech synthesis, voice `alloy`
  - Method: `GeminiService.synthesizeSpeech()` in `backend/src/gemini/gemini.service.ts`

**Payment Processing:**
- YooKassa - Russian payment gateway for subscription/check purchases
  - Client: `axios` direct HTTP (`https://api.yookassa.ru/v3`)
  - Auth: HTTP Basic Auth (`YOOKASSA_SHOP_ID` / `YOOKASSA_SECRET_KEY`)
  - Implementation: `backend/src/payments/payments.service.ts`
  - Idempotency: UUID v4 per request header `Idempotence-Key`
  - Receipt generation included (FZ-54 compliance)

**Email:**
- Resend - Transactional email delivery
  - SDK/Client: `resend ^6.12.3` (`backend/src/email/email.service.ts`)
  - Auth: `RESEND_API_KEY` env var
  - From address: `CheckMate <hello@checkmateai.ru>`
  - Email types: first-check notification, checks-exhausted upsell

## Data Storage

**Databases:**
- PostgreSQL 16
  - Connection: `DATABASE_URL` env var
  - Client: Prisma ORM (`@prisma/client ^6.0.0`)
  - Schema: `backend/prisma/schema.prisma`
  - Migrations: `backend/prisma/migrations/`
  - Access layer: `backend/src/prisma/prisma.service.ts` (singleton PrismaClient)
  - Docker image: `postgres:16-alpine` (via `docker-compose.yml`)
  - Data volume: `postgres_data` Docker named volume

**File Storage:**
- None — images and audio are stored as Base64 strings in PostgreSQL `Task` records (`imageBase64`, `solutionImageBase64`, `image1Base64`, `image2Base64`, `audioBase64` columns in `backend/prisma/schema.prisma`)

**Caching:**
- None

## Authentication & Identity

**Primary Auth:**
- Custom JWT-based auth (email + password)
  - Access tokens: short-lived, signed with `JWT_SECRET`
  - Refresh tokens: long-lived, hashed with bcrypt and stored in `refresh_tokens` table
  - Strategies: `backend/src/auth/strategies/` (jwt.strategy.ts, local.strategy.ts)
  - Guards: `backend/src/auth/guards/`
  - Cookie storage: `accessToken` and `refreshToken` HttpOnly cookies

**Social OAuth (account linking, bonus checks):**
- VK ID OAuth 2.0
  - Authorization URL: `https://id.vk.com/oauth2/auth`
  - Token endpoint: `https://id.vk.com/oauth2/token`
  - User info: `https://id.vk.com/oauth2/user_info`
  - Env: `VK_APP_ID`, `VK_APP_SECRET`, `VK_REDIRECT_URI`
  - Implementation: `backend/src/auth/auth.service.ts` (`initVkOAuth`, `handleVkCallback`)
- Yandex OAuth 2.0
  - Authorization URL: `https://oauth.yandex.ru/authorize`
  - Token endpoint: `https://oauth.yandex.ru/token`
  - User info: `https://login.yandex.ru/info`
  - Env: `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`, `YANDEX_REDIRECT_URI`
  - Implementation: `backend/src/auth/auth.service.ts` (`initYandexOAuth`, `handleYandexCallback`)
- Telegram Login Widget
  - Verification: HMAC-SHA256 hash check using `TELEGRAM_BOT_TOKEN` as key
  - Implementation: `backend/src/auth/auth.service.ts` (`connectTelegram`)
  - Frontend widget uses `NEXT_PUBLIC_TELEGRAM_BOT_NAME`
  - All three social providers grant `SOCIAL_BONUS_CHECKS` (3) free checks on first link
  - OAuth state stored in `oauth_states` table with expiry

## Monitoring & Observability

**Product Analytics:**
- PostHog
  - SDK: `posthog-js ^1.372.5` (frontend)
  - Implementation: `frontend/src/components/PostHogProvider.tsx`
  - Project key: hardcoded `phc_tef8AFVMWsySaQUvJCAbCZhGC49exziC3dH6aACHA6gC`
  - Host: `https://us.i.posthog.com`
  - Captures: pageview, pageleave; `person_profiles: 'identified_only'`

**Web Analytics:**
- Yandex Metrika (counter ID 103365255) - Script injected in `frontend/src/app/layout.tsx`
- Top.Mail.Ru (counter ID 3755767) - Script injected in `frontend/src/app/layout.tsx`

**SEO:**
- Yandex Webmaster verification token in Next.js metadata (`frontend/src/app/layout.tsx`)

**Error Tracking:**
- None (no Sentry or equivalent detected)

**Logs:**
- NestJS built-in `Logger` class used in services
- Console logging for OpenAI token usage and Whisper debug info in `backend/src/gemini/gemini.service.ts`

## CI/CD & Deployment

**Hosting:**
- Self-hosted VPS — nginx reverse proxy in front of Docker containers
- Domain: `checkmateai.ru` / `app.checkmateai.ru`
- nginx config: `nginx.conf` at repo root

**Containerization:**
- Docker Compose: `docker-compose.yml` at repo root
- Services: `postgres`, `backend`, `frontend`
- Backend Dockerfile: `backend/Dockerfile` (multi-stage, Node 20 Alpine)
- Frontend Dockerfile: `frontend/Dockerfile` (multi-stage, Node 20 Alpine, standalone output)

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars (backend container):**
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - Token signing
- `FRONTEND_URL` - CORS allowed origin
- `OPENAI_API_KEY` - AI grading and transcription
- `GEMINI_API_KEY` - Listed in env example; backend currently uses OpenAI client
- `GEMINI_PROXY` - Optional HTTP proxy for geo-restricted AI APIs
- `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `YOOKASSA_RETURN_URL` - Payments
- `RESEND_API_KEY` - Email delivery
- `VK_APP_ID`, `VK_APP_SECRET`, `VK_REDIRECT_URI` - VK OAuth
- `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`, `YANDEX_REDIRECT_URI` - Yandex OAuth
- `TELEGRAM_BOT_TOKEN` - Telegram social login verification

**Required env vars (frontend container):**
- `NEXT_PUBLIC_BACKEND_URL` - Public API base URL (baked into client bundle at build time)
- `BACKEND_URL` - Internal backend URL for server-side proxy routes
- `NEXT_PUBLIC_TELEGRAM_BOT_NAME` - Telegram bot username for login widget

**Secrets location:**
- `.env` file at repo root (gitignored); `.env.example` provides template

## Webhooks & Callbacks

**Incoming:**
- `POST /payments/webhook` — YooKassa payment status notifications (`payment.succeeded`, `payment.canceled`)
  - Implementation: `backend/src/payments/payments.controller.ts` + `backend/src/payments/payments.service.ts` (`handleWebhook`)
  - No signature verification implemented (potential security gap)

**OAuth Callbacks (incoming):**
- `GET /auth/vk/callback` — VK OAuth redirect
- `GET /auth/yandex/callback` — Yandex OAuth redirect
- Both implemented in `backend/src/auth/auth.controller.ts`

**Outgoing:**
- None (push notifications or outbound webhooks not used)

---

*Integration audit: 2026-05-14*
