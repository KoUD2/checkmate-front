<!-- GSD:project-start source:PROJECT.md -->
## Project

**CheckMate — ЕГЭ Variants**

CheckMate is a Russian-language SaaS platform for AI-powered ЕГЭ English preparation. Students currently submit individual writing and speaking tasks (37–42) for criterion-by-criterion AI grading. This milestone adds full exam variants: users can pass a complete ЕГЭ English variant (all 42 tasks), receive instant auto-checking for tasks 1–36, and AI-graded feedback for tasks 37–42 with ФИПИ primary-to-scaled score conversion.

**Core Value:** Students can practice a full ЕГЭ English exam from start to result — with instant scoring and AI feedback — exactly as they would on the real exam day.

### Constraints

- **Stack**: NestJS / Next.js / Prisma — no new frameworks; extend existing modules
- **AI model**: Existing `GeminiService` with `gpt-5.4-mini` — reuse as-is for tasks 37–42
- **Storage**: Yandex Object Storage (S3-compatible) — new dependency for audio CDN
- **Deployment**: Docker Compose on existing server — no infra changes beyond env vars
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.x - Used throughout both frontend (`frontend/`) and backend (`backend/src/`)
- SQL (PostgreSQL migrations) - Prisma migration files in `backend/prisma/migrations/`
## Runtime
- Node.js 20 (Alpine Linux) - Specified in both `backend/Dockerfile` and `frontend/Dockerfile` (`FROM node:20-alpine`)
- npm - Used in both workspaces
- Lockfile: `package-lock.json` present in both `frontend/` and `backend/`
## Frameworks
- NestJS 11 (`@nestjs/core ^11.0.0`) - REST API framework, `backend/src/`
- NestJS Config (`@nestjs/config ^4.0.0`) - Environment variable management
- NestJS JWT (`@nestjs/jwt ^11.0.0`) - JWT token issuance and verification
- NestJS Passport (`@nestjs/passport ^11.0.0`) - Authentication strategies (JWT + Local)
- NestJS Swagger (`@nestjs/swagger ^8.0.0`) - API docs at `/api/docs`
- NestJS Throttler (`@nestjs/throttler ^6.0.0`) - Rate limiting (60 req/min, configured in `backend/src/app.module.ts`)
- Next.js 16 (`next ^16.2.2`) - React framework with App Router, `frontend/src/app/`
- React 19 (`react ^19.0.0`) - UI library
- Output mode: `standalone` (configured in `frontend/next.config.ts`)
- Prisma 6 (`@prisma/client ^6.0.0`, `prisma ^6.0.0`) - Schema at `backend/prisma/schema.prisma`
- `@nestjs/testing ^11.0.0` - Available as dev dependency; no test files detected
- NestJS CLI (`@nestjs/cli ^11.0.0`) - Backend build (`nest build`)
- ts-node (`^10.9.2`) - TypeScript execution for backend dev
- ESLint 9 + `eslint-config-next` - Frontend linting
- Prettier - Backend code formatting (`npm run format`)
## Key Dependencies
- `openai ^6.33.0` - AI grading engine (GPT-5.4-mini for text, Whisper for audio transcription) — `backend/src/gemini/gemini.service.ts`
- `@prisma/client ^6.0.0` - All database operations — `backend/src/prisma/`
- `passport-jwt ^4.0.1` + `passport-local ^1.0.0` - Auth strategy implementations — `backend/src/auth/strategies/`
- `bcrypt ^5.1.1` - Password hashing — `backend/src/auth/auth.service.ts`
- `resend ^6.12.3` - Transactional email — `backend/src/email/email.service.ts`
- `axios ^1.7.0` (backend) - HTTP client for YooKassa and OAuth provider calls
- `axios ^1.8.4` - HTTP client for API calls — `frontend/src/api/`
- `cookies-next ^5.1.0` - Cookie management for auth tokens
- `jose ^6.0.10` - JWT verification in Next.js middleware/route handlers
- `jsonwebtoken ^9.0.2` - JWT operations in Next.js API routes
- `recharts ^3.8.1` - Data charts in admin dashboard
- `posthog-js ^1.372.5` - Product analytics — `frontend/src/components/PostHogProvider.tsx`
- `helmet ^8.0.0` - HTTP security headers — applied globally in `backend/src/main.ts`
- `undici ^8.0.2` - Proxy-aware HTTP fetch (for geo-restricted OpenAI/Gemini APIs) — `backend/src/main.ts`, `backend/src/gemini/gemini.service.ts`
- `global-agent ^4.1.3` - Global HTTP proxy agent
- `uuid ^11.0.0` - Idempotency keys for YooKassa payments
- `class-validator ^0.14.1` + `class-transformer ^0.5.1` - Request DTO validation
- `cookie-parser ^1.4.7` - Cookie parsing in Express/NestJS
- `ffmpeg` - Audio format conversion (3GPP/M4A → WAV for Whisper); installed via `apk add` in `backend/Dockerfile`
## Configuration
- Backend reads env vars via `@nestjs/config` (`ConfigService`) — `ConfigModule.forRoot({ isGlobal: true })` in `backend/src/app.module.ts`
- Frontend env vars injected at build time via Docker `ARG`/`ENV`; runtime via `process.env`
- Template: `.env.example` at repo root
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Access token signing secret
- `JWT_REFRESH_SECRET` - Refresh token signing secret
- `FRONTEND_URL` - CORS origin
- `OPENAI_API_KEY` - OpenAI API key (GPT + Whisper)
- `GEMINI_API_KEY` - Google Gemini key (present in env example, but service uses OpenAI client)
- `GEMINI_PROXY` - Optional HTTP proxy URL for geo-restricted AI APIs
- `YOOKASSA_SHOP_ID` - YooKassa merchant ID
- `YOOKASSA_SECRET_KEY` - YooKassa secret
- `YOOKASSA_RETURN_URL` - Payment redirect URL
- `VK_APP_ID`, `VK_APP_SECRET`, `VK_REDIRECT_URI` - VK OAuth
- `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`, `YANDEX_REDIRECT_URI` - Yandex OAuth
- `TELEGRAM_BOT_TOKEN` - Telegram social connect
- `RESEND_API_KEY` - Transactional email
- `NEXT_PUBLIC_BACKEND_URL` - Public backend URL
- `BACKEND_URL` - Internal backend URL (server-side proxy)
- `NEXT_PUBLIC_TELEGRAM_BOT_NAME` - Telegram bot name for social connect widget
- Backend: `nest build` → `dist/`, then `node dist/src/main.js`
- Frontend: `next build` → `.next/standalone/` (standalone output mode)
- Prisma migrations run at container startup: `prisma migrate deploy`
## Platform Requirements
- Node.js 20+
- PostgreSQL 16 (via Docker Compose: `postgres:16-alpine`)
- ffmpeg (for audio tasks in backend)
- npm
- Docker + Docker Compose (`docker-compose.yml` at repo root)
- Nginx reverse proxy (`nginx.conf`) — routes `/api/` → backend:3001, `/` → frontend:3000
- Backend port: 3001
- Frontend port: 3000
- Deployed domain: `checkmateai.ru` / `app.checkmateai.ru`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Backend (NestJS / TypeScript)
### TypeScript Config
- `strictNullChecks: false` — loose null checking in backend
- Strict TypeScript enabled on frontend
### File Naming
- `ClassName.method.ts` pattern (e.g., `users.service.ts`, `auth.controller.ts`)
- Frontend components: PascalCase files, prop interfaces in `[ComponentName].props.ts`
### Error Handling
- NestJS HTTP exceptions thrown in services (not controllers)
- `throw new HttpException(...)` / `throw new NotFoundException(...)` pattern
### Response Envelope
- Consistent `{ success, data }` response shape across API endpoints
### Logging
- `Logger` service (NestJS built-in) used for logging
### Path Aliases
- Backend: standard NestJS module resolution
- Frontend: `@/` alias mapped to `src/`
## Frontend (Next.js / TypeScript)
### Component Patterns
- `FC<Props>` or `(): JSX.Element` component typing
- Props defined in separate `[ComponentName].props.ts` files
- `handle[Action]` naming for event handlers (e.g., `handleSubmit`, `handleClick`)
### Styling
- CSS Modules with BEM-style class names
- Tab indentation in TSX files
### Code Style
- No Prettier config file found (backend has a `format` script but no config)
## Naming Conventions
| Scope | Convention | Example |
|-------|------------|---------|
| NestJS files | `name.type.ts` | `users.service.ts` |
| React components | PascalCase | `TaskCard.tsx` |
| Component props | `[Name].props.ts` | `TaskCard.props.ts` |
| Event handlers | `handle[Action]` | `handleSubmit` |
| API responses | `{ success, data }` | `{ success: true, data: {...} }` |
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Product Summary
## High-Level Architecture
```
```
## Backend (NestJS)
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
### AI Grading Pipeline
- **Task 37** (Written letter/essay) — 3 sequential GPT calls (K1 → K2 → K3); word-count pre-check (90–154 words); optional image upload of handwritten response.
- **Task 38** (Chart/table description) — 5 GPT calls (K1 gate → K2–K5 in parallel); accepts chart image + solution image.
- **Task 39** (Reading aloud) — Audio → Whisper transcription → 1 GPT call; ffmpeg conversion for iPhone 3GPP audio.
- **Task 40** (Conditional dialogue — interview questions) — Audio → Whisper → 1 GPT call scoring K1–K4.
- **Task 41** (Conditional dialogue — interview) — Audio → Whisper → 1 GPT call scoring K1–K5.
- **Task 42** (Monologue) — Audio → Whisper → 3 GPT calls (K1 gate → K2, K3 in parallel); accepts 2 reference images.
### Rate Limiting & Security
- `ThrottlerModule`: 60 requests per 60 seconds global (guard not applied — see CONCERNS.md).
- `helmet()` sets HTTP security headers.
- `ValidationPipe` with `whitelist: true` strips unknown fields from all DTOs.
- Body parser limit: 20 MB (for base64 images/audio).
- CORS restricted to `FRONTEND_URL`.
## Frontend (Next.js)
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
- `AuthContext` — user identity, login/logout/refresh methods.
- `TaskCheckContext` — task submission flow state.
### Analytics
- **PostHog** — event tracking, injected via `PostHogProvider`.
- **Yandex Metrika** (counter 103365255) — page views.
- **Top.Mail.Ru** (counter 3755767) — page views + `registration` goal.
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
## Infrastructure & Deployment
- **Containerisation:** Docker Compose with three services: `postgres`, `backend`, `frontend`.
- **Reverse proxy:** Nginx on the host (not containerised), config at `nginx.conf`.
- **Secrets:** All sensitive values injected as environment variables; none committed.
- **Production domain:** `app.checkmateai.ru` (frontend), `checkmateai.ru` (root/marketing).
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
