# CheckMate — Architecture Overview
<!-- last_mapped: 2026-05-14 -->

## Product Summary

CheckMate is a Russian-language SaaS platform that provides AI-powered automated checking of English-language ЕГЭ (Unified State Exam) tasks. Students submit written essays or audio recordings; the system grades them per official ЕГЭ criteria and returns detailed criterion-by-criterion feedback.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   PRODUCTION SERVER                  │
│                                                     │
│  ┌──────────┐   Nginx (port 80)   ┌──────────────┐ │
│  │          │◄─── /api/* ─────────►  NestJS API  │ │
│  │  Next.js │                     │  (port 3001) │ │
│  │  (3000)  │◄─── /*  ────────────►              │ │
│  └──────────┘                     └──────┬───────┘ │
│                                          │         │
│                                   ┌──────▼───────┐ │
│                                   │  PostgreSQL  │ │
│                                   │  (Prisma)    │ │
│                                   └──────────────┘ │
└─────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   OpenAI API          YooKassa Payment
  (GPT + Whisper)          Gateway
```

All three services (frontend, backend, database) run as Docker containers orchestrated by `docker-compose.yml`. Nginx on the host reverse-proxies traffic: `/*` → Next.js on port 3000, `/api/*` → NestJS on port 3001.

---

## Backend (NestJS)

**Location:** `backend/`
**Runtime:** Node.js / TypeScript, NestJS 11
**Database ORM:** Prisma 6 + PostgreSQL 16
**Port:** 3001
**Swagger docs:** `/api/docs`

### Module Map

| Module | Responsibility |
|---|---|
| `AuthModule` | Registration, login, JWT access+refresh tokens, OAuth (VK, Yandex), Telegram linking |
| `UsersModule` | User profile reads and internal lookups |
| `TasksModule` | Submit and retrieve ЕГЭ tasks (37–42); consume `GeminiService` for AI grading; deduct checks balance |
| `GeminiModule` | All AI calls: GPT-5.4-mini for text grading, Whisper-1 for audio transcription, TTS for task 40 |
| `SubscriptionsModule` | Subscription state, promo-code activation |
| `PaymentsModule` | Create YooKassa payments, handle webhooks, verify status, credit checks/subscription days |
| `AdminModule` | Admin-only endpoints: user management, promo creation, stats, charts, task inspection |
| `ReferralsModule` | Referral code tracking; award bonus checks when a referred user registers |
| `ResourcesModule` | CMS for articles, checklists, templates, trainers (ARTICLE / CHECKLIST / TRAINER / TEMPLATE) |
| `PrismaModule` | Global Prisma client wrapper |
| `EmailModule` | Transactional email via Resend |

### Authentication Flow

1. User submits credentials → `POST /auth/signup` or `POST /auth/login`
2. Backend issues a short-lived **accessToken** (JWT Bearer) in JSON body, and a long-lived **refreshToken** as an `httpOnly` cookie.
3. All protected endpoints use `JwtAuthGuard` (passport-jwt strategy).
4. Admin endpoints additionally use `RolesGuard` + `@Roles(Role.ADMIN)`.
5. Silent token refresh: `POST /auth/refresh` reads the cookie and rotates both tokens.
6. Refresh tokens are hashed and stored in `refresh_tokens` table; logout revokes them.

### AI Grading Pipeline

Each task type has its own grading flow inside `GeminiService`:

- **Task 37** (Written letter/essay) — 3 sequential GPT calls (K1 → K2 → K3); word-count pre-check (90–154 words); optional image upload of handwritten response.
- **Task 38** (Chart/table description) — 5 GPT calls (K1 gate → K2–K5 in parallel); accepts chart image + solution image.
- **Task 39** (Reading aloud) — Audio → Whisper transcription → 1 GPT call; ffmpeg conversion for iPhone 3GPP audio.
- **Task 40** (Conditional dialogue — interview questions) — Audio → Whisper → 1 GPT call scoring K1–K4.
- **Task 41** (Conditional dialogue — interview) — Audio → Whisper → 1 GPT call scoring K1–K5.
- **Task 42** (Monologue) — Audio → Whisper → 3 GPT calls (K1 gate → K2, K3 in parallel); accepts 2 reference images.

All GPT calls use model `gpt-5.4-mini`, temperature 0.4, max 8192 completion tokens, with 3-attempt retry and exponential back-off. `GEMINI_PROXY` env var routes OpenAI/Gemini traffic through an HTTP proxy (geo-restriction workaround).

### Rate Limiting & Security

- `ThrottlerModule`: 60 requests per 60 seconds global (guard not applied — see CONCERNS.md).
- `helmet()` sets HTTP security headers.
- `ValidationPipe` with `whitelist: true` strips unknown fields from all DTOs.
- Body parser limit: 20 MB (for base64 images/audio).
- CORS restricted to `FRONTEND_URL`.

---

## Frontend (Next.js)

**Location:** `frontend/`
**Runtime:** Node.js / TypeScript, Next.js 16 (App Router)
**Port:** 3000

### Routing Structure

| Route | Access | Description |
|---|---|---|
| `/` | Auth required | Main dashboard / task history |
| `/create-work` | Auth required | Submit a new ЕГЭ task for checking |
| `/tasks/[id]` | Auth required | Task result detail page |
| `/subscribe` | Auth required | Subscription / plans page |
| `/payments` | Auth required | User payment history |
| `/payment/success` | Auth required | Post-payment success screen |
| `/referral` | Auth required | Referral program page |
| `/resources` | Public | Resource library listing |
| `/resources/[slug]` | Public | Individual resource detail |
| `/login` | Public only | Login page |
| `/register` | Public only | Registration page |
| `/admin/*` | Admin only | Admin panel |

### Auth & Token Handling

- **Middleware** (`src/middleware.ts`): Edge-level redirect logic. Missing cookie on protected route → redirect to `/login`. Cookie present on `/login` or `/register` → redirect to `/`.
- **AuthContext** (`src/config/context/AuthContext.tsx`): Client-side context. On mount reads `accessToken` cookie, calls `GET /auth/me`, attempts silent refresh if absent. Refreshes every 25 minutes via `setInterval`.
- **Next.js API routes** under `/api-auth/` act as BFF proxy: forward auth requests to NestJS and set/clear cookies.

### State Management

No Redux or Zustand. Two React contexts:
- `AuthContext` — user identity, login/logout/refresh methods.
- `TaskCheckContext` — task submission flow state.

### Analytics

- **PostHog** — event tracking, injected via `PostHogProvider`.
- **Yandex Metrika** (counter 103365255) — page views.
- **Top.Mail.Ru** (counter 3755767) — page views + `registration` goal.

---

## Database Schema (Prisma / PostgreSQL)

| Table | Key fields |
|---|---|
| `users` | id (uuid), email, passwordHash, firstName, lastName, role (USER/ADMIN), freeChecksLeft, vkId, telegramId, yandexId, socialBonusGranted, referralCode, referredByCode |
| `tasks` | id, type (TASK37–42), userId, taskDescription, solution, imageBase64, solutionImageBase64, image1/2Base64, audioBase64, transcription, k1–k5, totalScore, feedback (JSON), comments (JSON), userRating, userComment |
| `subscriptions` | userId (unique), isActive, expiresAt |
| `payments` | id, userId, yookassaId, status (PENDING/SUCCEEDED/CANCELED), amount, daysToAdd, checksToAdd |
| `promo_codes` | code (unique), days, maxUses, usedCount, expiresAt |
| `promo_usages` | promoId + userId (composite unique) — prevents double activation |
| `refresh_tokens` | tokenHash (unique), userId, isRevoked, expiresAt |
| `referral_bonuses` | referrerId, refereeId (unique) — one bonus per referred user |
| `oauth_states` | PKCE/state store for VK and Yandex OAuth flows |
| `resources` | slug (unique), type (ARTICLE/CHECKLIST/TRAINER/TEMPLATE), title, description, content (JSON), published, SEO fields |

---

## Infrastructure & Deployment

- **Containerisation:** Docker Compose with three services: `postgres`, `backend`, `frontend`.
- **Reverse proxy:** Nginx on the host (not containerised), config at `nginx.conf`.
- **Secrets:** All sensitive values injected as environment variables; none committed.
- **Production domain:** `app.checkmateai.ru` (frontend), `checkmateai.ru` (root/marketing).

---
*Mapped: 2026-05-14*
