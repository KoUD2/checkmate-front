# Technology Stack

**Analysis Date:** 2026-05-14

## Languages

**Primary:**
- TypeScript 5.x - Used throughout both frontend (`frontend/`) and backend (`backend/src/`)

**Secondary:**
- SQL (PostgreSQL migrations) - Prisma migration files in `backend/prisma/migrations/`

## Runtime

**Environment:**
- Node.js 20 (Alpine Linux) - Specified in both `backend/Dockerfile` and `frontend/Dockerfile` (`FROM node:20-alpine`)

**Package Manager:**
- npm - Used in both workspaces
- Lockfile: `package-lock.json` present in both `frontend/` and `backend/`

## Frameworks

**Backend Core:**
- NestJS 11 (`@nestjs/core ^11.0.0`) - REST API framework, `backend/src/`
- NestJS Config (`@nestjs/config ^4.0.0`) - Environment variable management
- NestJS JWT (`@nestjs/jwt ^11.0.0`) - JWT token issuance and verification
- NestJS Passport (`@nestjs/passport ^11.0.0`) - Authentication strategies (JWT + Local)
- NestJS Swagger (`@nestjs/swagger ^8.0.0`) - API docs at `/api/docs`
- NestJS Throttler (`@nestjs/throttler ^6.0.0`) - Rate limiting (60 req/min, configured in `backend/src/app.module.ts`)

**Frontend Core:**
- Next.js 16 (`next ^16.2.2`) - React framework with App Router, `frontend/src/app/`
- React 19 (`react ^19.0.0`) - UI library
- Output mode: `standalone` (configured in `frontend/next.config.ts`)

**ORM / Database:**
- Prisma 6 (`@prisma/client ^6.0.0`, `prisma ^6.0.0`) - Schema at `backend/prisma/schema.prisma`

**Testing:**
- `@nestjs/testing ^11.0.0` - Available as dev dependency; no test files detected

**Build/Dev:**
- NestJS CLI (`@nestjs/cli ^11.0.0`) - Backend build (`nest build`)
- ts-node (`^10.9.2`) - TypeScript execution for backend dev
- ESLint 9 + `eslint-config-next` - Frontend linting
- Prettier - Backend code formatting (`npm run format`)

## Key Dependencies

**Critical:**
- `openai ^6.33.0` - AI grading engine (GPT-5.4-mini for text, Whisper for audio transcription) — `backend/src/gemini/gemini.service.ts`
- `@prisma/client ^6.0.0` - All database operations — `backend/src/prisma/`
- `passport-jwt ^4.0.1` + `passport-local ^1.0.0` - Auth strategy implementations — `backend/src/auth/strategies/`
- `bcrypt ^5.1.1` - Password hashing — `backend/src/auth/auth.service.ts`
- `resend ^6.12.3` - Transactional email — `backend/src/email/email.service.ts`
- `axios ^1.7.0` (backend) - HTTP client for YooKassa and OAuth provider calls

**Frontend:**
- `axios ^1.8.4` - HTTP client for API calls — `frontend/src/api/`
- `cookies-next ^5.1.0` - Cookie management for auth tokens
- `jose ^6.0.10` - JWT verification in Next.js middleware/route handlers
- `jsonwebtoken ^9.0.2` - JWT operations in Next.js API routes
- `recharts ^3.8.1` - Data charts in admin dashboard
- `posthog-js ^1.372.5` - Product analytics — `frontend/src/components/PostHogProvider.tsx`

**Infrastructure:**
- `helmet ^8.0.0` - HTTP security headers — applied globally in `backend/src/main.ts`
- `undici ^8.0.2` - Proxy-aware HTTP fetch (for geo-restricted OpenAI/Gemini APIs) — `backend/src/main.ts`, `backend/src/gemini/gemini.service.ts`
- `global-agent ^4.1.3` - Global HTTP proxy agent
- `uuid ^11.0.0` - Idempotency keys for YooKassa payments
- `class-validator ^0.14.1` + `class-transformer ^0.5.1` - Request DTO validation
- `cookie-parser ^1.4.7` - Cookie parsing in Express/NestJS

**System:**
- `ffmpeg` - Audio format conversion (3GPP/M4A → WAV for Whisper); installed via `apk add` in `backend/Dockerfile`

## Configuration

**Environment:**
- Backend reads env vars via `@nestjs/config` (`ConfigService`) — `ConfigModule.forRoot({ isGlobal: true })` in `backend/src/app.module.ts`
- Frontend env vars injected at build time via Docker `ARG`/`ENV`; runtime via `process.env`
- Template: `.env.example` at repo root

**Required env vars (backend):**
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

**Required env vars (frontend):**
- `NEXT_PUBLIC_BACKEND_URL` - Public backend URL
- `BACKEND_URL` - Internal backend URL (server-side proxy)
- `NEXT_PUBLIC_TELEGRAM_BOT_NAME` - Telegram bot name for social connect widget

**Build:**
- Backend: `nest build` → `dist/`, then `node dist/src/main.js`
- Frontend: `next build` → `.next/standalone/` (standalone output mode)
- Prisma migrations run at container startup: `prisma migrate deploy`

## Platform Requirements

**Development:**
- Node.js 20+
- PostgreSQL 16 (via Docker Compose: `postgres:16-alpine`)
- ffmpeg (for audio tasks in backend)
- npm

**Production:**
- Docker + Docker Compose (`docker-compose.yml` at repo root)
- Nginx reverse proxy (`nginx.conf`) — routes `/api/` → backend:3001, `/` → frontend:3000
- Backend port: 3001
- Frontend port: 3000
- Deployed domain: `checkmateai.ru` / `app.checkmateai.ru`

---

*Stack analysis: 2026-05-14*
