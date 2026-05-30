> ⚠️ **SUPERSEDED (2026-05-30) — НЕ ИСПОЛЬЗОВАТЬ.**
> Этот план строился на server-side PostHog (`posthog-node`, события на сервер PostHog).
> Решение изменилось: все метрики считаются и показываются в **собственной админке**, PostHog **удаляется целиком**, сторонних сервисов нет.
> Актуальный дизайн: [`../specs/2026-05-30-admin-metrics-design.md`](../specs/2026-05-30-admin-metrics-design.md).
> План не был начат (ни одной правки в коде), поэтому откатывать нечего.

---

# Analytics Metrics — Wave 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire server-side PostHog into the NestJS backend, fire 4 critical lifecycle events (`payment_completed`, `subscription_started`, `subscription_renewed`, `subscription_expired`), and add the missing `tariff` field to `Subscription` + `Payment`. This unblocks the Paid Active Checkers (PAC) NSM and lets us measure Free→Paid CR and subscription retention in PostHog.

**Architecture:** A new NestJS `AnalyticsModule` exposes an injectable `AnalyticsService` that wraps `posthog-node`. Both the payment-success path (verify and webhook) and the subscription lifecycle (started / renewed / expired-by-cron) fire identified events. A Prisma migration adds an optional `tariff` enum to `Subscription` and `Payment`; the frontend passes the chosen tariff when creating a payment. All changes are additive and reversible — nullable columns, opt-in env var (`POSTHOG_KEY`), no behavioral changes if PostHog is not configured.

**Tech Stack:** NestJS 11, Prisma 6, `posthog-node`, `@nestjs/schedule` (cron), Jest + `@nestjs/testing` for unit tests. PostHog project: `us.i.posthog.com` (same as frontend, fresh server-side Project API Key required).

**Out of scope for this wave** (deferred to Wave 2 / 3):
- `paywall_shown` event
- Moving `user_activated` off `localStorage` to a person property
- `User.segment` field + onboarding question
- `Task.textHash` for NSM deduplication
- UTM capture, dispute event, cohort dashboards

**Prerequisites the human must do before merging:**
1. Generate a **server-side Project API Key** in PostHog (different from the public key in `PostHogProvider.tsx`).
2. Set `POSTHOG_KEY` and `POSTHOG_HOST=https://us.i.posthog.com` in `backend/.env`.
3. After migration is committed, run `npx prisma migrate deploy` against production DB (the migration is additive and safe — it adds nullable columns and a new enum).

---

## File Structure

**Create:**
- `backend/src/analytics/analytics.module.ts` — NestJS module
- `backend/src/analytics/analytics.service.ts` — wraps posthog-node, exposes `capture(userId, event, props?)` and `identify(userId, props?)`
- `backend/src/analytics/analytics.service.spec.ts` — unit tests against a mocked PostHog client
- `backend/src/subscriptions/subscriptions.cron.ts` — daily cron that expires subscriptions and fires `subscription_expired`
- `backend/jest.config.js` — Jest config (NestJS testing is in devDeps but no jest configured yet)
- `backend/prisma/migrations/20260527120000_add_tariff_to_subscription_payment/migration.sql` — additive migration

**Modify:**
- `backend/prisma/schema.prisma` — add `Tariff` enum + nullable `tariff` columns on `Subscription` and `Payment`
- `backend/package.json` — add `posthog-node`, `@nestjs/schedule`, dev: `jest`, `ts-jest`, `@types/jest`
- `backend/src/app.module.ts` — import `AnalyticsModule` and `ScheduleModule.forRoot()`
- `backend/src/payments/payments.service.ts` — fire `payment_completed` and trigger subscription event
- `backend/src/subscriptions/subscriptions.service.ts` — change `addDaysToSubscription` to return `{ outcome: 'started' | 'renewed' }` and accept tariff; expose `expireDueSubscriptions()`
- `backend/src/subscriptions/subscriptions.module.ts` — register cron, import AnalyticsModule
- `backend/src/payments/payments.module.ts` — import AnalyticsModule
- `backend/src/payments/dto/create-payment.dto.ts` — add optional `tariff` field
- `frontend/src/services/payment.service.ts` — accept and forward tariff
- `frontend/src/components/screens/SubscribePage/SubscribePage.tsx` — pass tariff per chosen plan

**Configuration:**
- `backend/.env.example` — document `POSTHOG_KEY` and `POSTHOG_HOST`

---

## Task 0: Setup Jest for backend

NestJS testing module is in devDeps, but no jest configured. We need this to TDD the AnalyticsService.

**Files:**
- Create: `backend/jest.config.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Install jest + ts-jest + types**

```bash
cd backend
npm install --save-dev jest@^29 ts-jest@^29 @types/jest@^29
```

- [ ] **Step 2: Create jest config**

Create `backend/jest.config.js`:

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
};
```

- [ ] **Step 3: Add npm scripts**

Modify `backend/package.json` — in `"scripts"` add:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 4: Verify jest runs (no tests yet → exit 0 expected with --passWithNoTests)**

Run:
```bash
cd backend && npm test -- --passWithNoTests
```
Expected: `No tests found, exiting with code 0` (with `--passWithNoTests`) or similar success output.

- [ ] **Step 5: Commit**

```bash
cd backend
git add package.json package-lock.json jest.config.js
git commit -m "chore(backend): add jest testing setup"
```

---

## Task 1: Install runtime dependencies

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install posthog-node and @nestjs/schedule**

```bash
cd backend
npm install posthog-node@^4 @nestjs/schedule@^4
```

- [ ] **Step 2: Verify versions in package.json**

Run:
```bash
cd backend && grep -E '"posthog-node"|"@nestjs/schedule"' package.json
```
Expected: both lines present with version numbers.

- [ ] **Step 3: Commit**

```bash
cd backend
git add package.json package-lock.json
git commit -m "chore(backend): add posthog-node and nestjs schedule"
```

---

## Task 2: Prisma migration — add `tariff` to Subscription and Payment

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260527120000_add_tariff_to_subscription_payment/migration.sql`

- [ ] **Step 1: Update schema.prisma — add Tariff enum**

Modify `backend/prisma/schema.prisma`. Find the line `model Subscription {` and ABOVE it add:

```prisma
enum Tariff {
  PLUS
  PRO
  CUSTOM
}
```

- [ ] **Step 2: Add tariff field to Subscription**

In the same file, modify the `Subscription` model. Change it to:

```prisma
model Subscription {
  id        String    @id @default(uuid())
  userId    String    @unique
  isActive  Boolean   @default(false)
  expiresAt DateTime?
  tariff    Tariff?
  updatedAt DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}
```

- [ ] **Step 3: Add tariff field to Payment**

In the same file, modify the `Payment` model — find it and add `tariff Tariff?` after the `checksToAdd` line. The result should look like:

```prisma
model Payment {
  id         String        @id @default(uuid())
  userId     String
  yookassaId String        @unique
  status     PaymentStatus @default(PENDING)
  amount     Decimal       @db.Decimal(10, 2)
  daysToAdd   Int
  checksToAdd Int           @default(0)
  tariff      Tariff?
  createdAt  DateTime      @default(now())
  // ...keep rest of existing fields unchanged
```

- [ ] **Step 4: Create migration file**

Create file `backend/prisma/migrations/20260527120000_add_tariff_to_subscription_payment/migration.sql`:

```sql
-- CreateEnum
CREATE TYPE "Tariff" AS ENUM ('PLUS', 'PRO', 'CUSTOM');

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "tariff" "Tariff";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "tariff" "Tariff";
```

- [ ] **Step 5: Regenerate Prisma client**

Run:
```bash
cd backend && npx prisma generate
```
Expected: `✔ Generated Prisma Client (...) in (...)`. No errors.

- [ ] **Step 6: Verify migration applies cleanly on local dev DB**

Run (only if you have a local dev DB pointed at by DATABASE_URL):
```bash
cd backend && npx prisma migrate dev --name verify-tariff-migration --create-only
```
Expected: no schema drift detected. If output says "Database is in sync with the migration history" then skip — the migration we wrote IS the next migration.

If `migrate dev` insists on creating its own migration, **delete** the one it created and keep ours — the SQL we wrote is intentional.

- [ ] **Step 7: Commit**

```bash
cd backend
git add prisma/schema.prisma prisma/migrations/20260527120000_add_tariff_to_subscription_payment/
git commit -m "feat(db): add tariff field to subscription and payment"
```

---

## Task 3: AnalyticsService (with test) + Module

**Files:**
- Create: `backend/src/analytics/analytics.service.ts`
- Create: `backend/src/analytics/analytics.service.spec.ts`
- Create: `backend/src/analytics/analytics.module.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/analytics/analytics.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AnalyticsService } from './analytics.service';

const mockCapture = jest.fn();
const mockIdentify = jest.fn();
const mockShutdown = jest.fn();

jest.mock('posthog-node', () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    capture: mockCapture,
    identify: mockIdentify,
    shutdown: mockShutdown,
  })),
}));

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    mockCapture.mockClear();
    mockIdentify.mockClear();
    mockShutdown.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'POSTHOG_KEY') return 'phc_test_key';
              if (key === 'POSTHOG_HOST') return 'https://us.i.posthog.com';
              return null;
            },
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    await service.onModuleInit();
  });

  it('captures an event with userId and props', () => {
    service.capture('user-123', 'payment_completed', { amount: 499, tariff: 'PLUS' });

    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: 'user-123',
      event: 'payment_completed',
      properties: { amount: 499, tariff: 'PLUS' },
    });
  });

  it('captures without props', () => {
    service.capture('user-456', 'subscription_started');

    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: 'user-456',
      event: 'subscription_started',
      properties: {},
    });
  });

  it('is a no-op when POSTHOG_KEY is not configured', async () => {
    const noKeyModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: ConfigService, useValue: { get: () => null } },
      ],
    }).compile();

    const noKeyService = noKeyModule.get<AnalyticsService>(AnalyticsService);
    await noKeyService.onModuleInit();
    mockCapture.mockClear();

    noKeyService.capture('user-789', 'payment_completed');

    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('shuts down PostHog on module destroy', async () => {
    await service.onModuleDestroy();
    expect(mockShutdown).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd backend && npm test -- analytics.service.spec
```
Expected: FAIL with "Cannot find module './analytics.service'".

- [ ] **Step 3: Implement the service**

Create `backend/src/analytics/analytics.service.ts`:

```ts
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

@Injectable()
export class AnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private client: PostHog | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const key = this.configService.get<string>('POSTHOG_KEY');
    const host = this.configService.get<string>('POSTHOG_HOST') ?? 'https://us.i.posthog.com';

    if (!key) {
      this.logger.warn('POSTHOG_KEY not set — server-side analytics disabled');
      return;
    }

    this.client = new PostHog(key, { host, flushAt: 1, flushInterval: 1000 });
    this.logger.log(`PostHog server-side analytics initialised (host=${host})`);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.shutdown();
    }
  }

  capture(userId: string, event: string, properties: Record<string, unknown> = {}) {
    if (!this.client) return;
    try {
      this.client.capture({ distinctId: userId, event, properties });
    } catch (err) {
      this.logger.error(`PostHog capture failed for event=${event}: ${(err as Error).message}`);
    }
  }

  identify(userId: string, properties: Record<string, unknown> = {}) {
    if (!this.client) return;
    try {
      this.client.identify({ distinctId: userId, properties });
    } catch (err) {
      this.logger.error(`PostHog identify failed: ${(err as Error).message}`);
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
cd backend && npm test -- analytics.service.spec
```
Expected: 4 tests passed.

- [ ] **Step 5: Create the module**

Create `backend/src/analytics/analytics.module.ts`:

```ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsService } from './analytics.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
```

(The `@Global()` decorator means we import it once in AppModule and inject anywhere without re-importing.)

- [ ] **Step 6: Commit**

```bash
cd backend
git add src/analytics/
git commit -m "feat(analytics): add PostHog server-side AnalyticsService"
```

---

## Task 4: Register AnalyticsModule + ScheduleModule in AppModule

**Files:**
- Modify: `backend/src/app.module.ts`
- Modify: `backend/.env.example`

- [ ] **Step 1: Read current app.module.ts**

Run:
```bash
cat backend/src/app.module.ts
```
Note the existing import list and `@Module({ imports: [...] })` array.

- [ ] **Step 2: Add ScheduleModule and AnalyticsModule**

Modify `backend/src/app.module.ts`. Add these imports near the top (alongside other @nestjs imports):

```ts
import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsModule } from './analytics/analytics.module';
```

Inside the `@Module({ imports: [...] })` array, add:

```ts
    ScheduleModule.forRoot(),
    AnalyticsModule,
```

Place them after `ConfigModule.forRoot(...)` and before the feature modules.

- [ ] **Step 3: Add env vars to .env.example**

Modify `backend/.env.example`. At the end add:

```
# PostHog server-side analytics (optional — leave blank to disable)
POSTHOG_KEY=
POSTHOG_HOST=https://us.i.posthog.com
```

- [ ] **Step 4: Verify the app boots**

Run:
```bash
cd backend && npm run build
```
Expected: `nest build` succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/app.module.ts .env.example
git commit -m "feat(app): wire AnalyticsModule and ScheduleModule"
```

---

## Task 5: Accept `tariff` in CreatePaymentDto and persist it

**Files:**
- Modify: `backend/src/payments/dto/create-payment.dto.ts`
- Modify: `backend/src/payments/payments.service.ts`

- [ ] **Step 1: Read current DTO**

Run:
```bash
cat backend/src/payments/dto/create-payment.dto.ts
```

- [ ] **Step 2: Add tariff field to DTO**

Modify `backend/src/payments/dto/create-payment.dto.ts`. Add the import for `IsEnum` and `IsOptional` from `class-validator` if not present, import `Tariff` from `@prisma/client`, and add the field. The DTO should end up looking like (preserve existing fields):

```ts
import { IsNumber, IsPositive, IsOptional, IsEnum, IsInt } from 'class-validator';
import { Tariff } from '@prisma/client';

export class CreatePaymentDto {
  // ...keep existing fields (amount, checksToAdd, daysToAdd) as they are

  @IsOptional()
  @IsEnum(Tariff)
  tariff?: Tariff;
}
```

Only ADD the `tariff` field — leave validators on existing fields unchanged.

- [ ] **Step 3: Persist tariff on payment creation**

Modify `backend/src/payments/payments.service.ts` at line 80 (the `await this.prisma.payment.create({ data: { ... } })` block in `createPayment`). Add `tariff: dto.tariff ?? null,` to the data object:

```ts
await this.prisma.payment.create({
  data: {
    userId,
    yookassaId: payment.id,
    status: PaymentStatus.PENDING,
    amount: dto.amount,
    daysToAdd: days,
    checksToAdd: dto.checksToAdd,
    tariff: dto.tariff ?? null,
  },
});
```

- [ ] **Step 4: Verify build**

Run:
```bash
cd backend && npm run build
```
Expected: success.

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/payments/dto/create-payment.dto.ts src/payments/payments.service.ts
git commit -m "feat(payments): accept and persist tariff on payment creation"
```

---

## Task 6: Frontend passes `tariff` when creating a payment

**Files:**
- Modify: `frontend/src/services/payment.service.ts`
- Modify: `frontend/src/components/screens/SubscribePage/SubscribePage.tsx`

- [ ] **Step 1: Read current frontend payment service**

Run:
```bash
cat frontend/src/services/payment.service.ts
```

- [ ] **Step 2: Add tariff param to createPayment**

Modify `frontend/src/services/payment.service.ts`. Replace the `createPayment` method:

```ts
async createPayment(
  amount: number,
  checksToAdd: number,
  daysToAdd: number,
  tariff?: 'PLUS' | 'PRO' | 'CUSTOM',
) {
  posthog.capture('payment_started', { amount, checksToAdd, daysToAdd, tariff })
  const res = await api.post<{ data: { paymentId: string; confirmationUrl: string } }>(
    '/payments/create',
    { amount, checksToAdd, daysToAdd, tariff },
  )
  return res.data.data
},
```

- [ ] **Step 3: Pass tariff from SubscribePage**

Open `frontend/src/components/screens/SubscribePage/SubscribePage.tsx` and find every `paymentService.createPayment(...)` call. For each pricing card (Plus, Pro, custom), add the corresponding tariff as the 4th argument.

The mapping rule: **Plus → `'PLUS'`, Pro → `'PRO'`, anything else (custom packages, top-ups) → `'CUSTOM'`**.

You'll need to locate the buttons / handlers. After modifying, search to verify:

```bash
grep -n "createPayment(" frontend/src/components/screens/SubscribePage/SubscribePage.tsx
```
Each call should have 4 args, ending in `'PLUS'` / `'PRO'` / `'CUSTOM'`.

- [ ] **Step 4: Verify frontend build**

Run:
```bash
cd frontend && npm run build
```
Expected: Next.js build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/payment.service.ts frontend/src/components/screens/SubscribePage/SubscribePage.tsx
git commit -m "feat(payments): pass tariff from frontend subscribe page"
```

---

## Task 7: Fire `payment_completed` event on successful payment

The success path runs in TWO places: `verifyPayment` (when user redirects back) and `handleWebhook` (YooKassa server-to-server). We extract a shared helper so the event fires exactly once per real success.

**Files:**
- Modify: `backend/src/payments/payments.service.ts`
- Modify: `backend/src/payments/payments.module.ts`

- [ ] **Step 1: Inject AnalyticsService into PaymentsService**

Modify `backend/src/payments/payments.service.ts`. At the top add:

```ts
import { AnalyticsService } from '../analytics/analytics.service';
```

In the constructor, add `private readonly analytics: AnalyticsService,` as the last parameter:

```ts
constructor(
  private prisma: PrismaService,
  private subscriptionsService: SubscriptionsService,
  private referralsService: ReferralsService,
  private configService: ConfigService,
  private readonly analytics: AnalyticsService,
) {
  // ...existing body
}
```

- [ ] **Step 2: Ensure AnalyticsModule reachable from PaymentsModule**

Because `AnalyticsModule` is `@Global()`, no import change is needed. Verify by reading:

```bash
cat backend/src/payments/payments.module.ts
```
No edits required if it already imports the modules it needs.

- [ ] **Step 3: Extract `onPaymentSucceeded` helper**

In `backend/src/payments/payments.service.ts`, add this private method (place it before `getMyPayments`):

```ts
private async onPaymentSucceeded(payment: {
  id: string;
  userId: string;
  amount: any;
  daysToAdd: number;
  checksToAdd: number;
  tariff: 'PLUS' | 'PRO' | 'CUSTOM' | null;
  yookassaId: string;
}) {
  if (payment.daysToAdd > 0) {
    await this.subscriptionsService.addDaysToSubscription(
      payment.userId,
      payment.daysToAdd,
      payment.tariff ?? undefined,
    );
  }
  await this.prisma.user.update({
    where: { id: payment.userId },
    data: { freeChecksLeft: { increment: payment.checksToAdd } },
  });
  this.referralsService.processReferralBonus(payment.userId).catch((err) =>
    this.logger.error(`Referral bonus error for user ${payment.userId}: ${err?.message}`),
  );
  this.analytics.capture(payment.userId, 'payment_completed', {
    amount: Number(payment.amount),
    daysToAdd: payment.daysToAdd,
    checksToAdd: payment.checksToAdd,
    tariff: payment.tariff,
    paymentId: payment.id,
    yookassaId: payment.yookassaId,
  });
}
```

- [ ] **Step 4: Replace duplicated logic in `verifyPayment`**

In `verifyPayment`, find the `if (ykPayment.status === 'succeeded') { ... }` block. Replace its **body** so it becomes:

```ts
if (ykPayment.status === 'succeeded') {
  await this.prisma.payment.update({
    where: { yookassaId },
    data: { status: PaymentStatus.SUCCEEDED },
  });
  const fresh = await this.prisma.payment.findUniqueOrThrow({ where: { yookassaId } });
  await this.onPaymentSucceeded(fresh);
  return { status: 'succeeded', alreadyProcessed: false };
}
```

This drops the inline `addDaysToSubscription`, `freeChecksLeft increment`, and `processReferralBonus` lines — they are now inside `onPaymentSucceeded`.

- [ ] **Step 5: Replace duplicated logic in `handleWebhook`**

In `handleWebhook`, find the `if (event === 'payment.succeeded') { ... }` block. Replace its body so it becomes:

```ts
if (event === 'payment.succeeded') {
  // idempotency: skip if already succeeded
  if (payment.status === PaymentStatus.SUCCEEDED) return;
  await this.prisma.payment.update({
    where: { yookassaId },
    data: { status: PaymentStatus.SUCCEEDED },
  });
  const fresh = await this.prisma.payment.findUniqueOrThrow({ where: { yookassaId } });
  await this.onPaymentSucceeded(fresh);
}
```

The `if (payment.status === SUCCEEDED) return;` guards against double-firing the event when both `verifyPayment` and the webhook race.

- [ ] **Step 6: Verify build**

Run:
```bash
cd backend && npm run build
```
Expected: success.

- [ ] **Step 7: Commit**

```bash
cd backend
git add src/payments/payments.service.ts
git commit -m "feat(analytics): fire payment_completed event on success"
```

---

## Task 8: Differentiate `subscription_started` vs `subscription_renewed`

**Files:**
- Modify: `backend/src/subscriptions/subscriptions.service.ts`
- Modify: `backend/src/subscriptions/subscriptions.module.ts`
- Modify: `backend/src/payments/payments.service.ts`

- [ ] **Step 1: Update `addDaysToSubscription` signature and logic**

Open `backend/src/subscriptions/subscriptions.service.ts`. Inject `AnalyticsService`:

```ts
import { AnalyticsService } from '../analytics/analytics.service';
```

Modify the constructor:

```ts
constructor(
  private prisma: PrismaService,
  private readonly analytics: AnalyticsService,
) {}
```

Then replace the entire `addDaysToSubscription` method with:

```ts
async addDaysToSubscription(
  userId: string,
  days: number,
  tariff?: 'PLUS' | 'PRO' | 'CUSTOM',
): Promise<'started' | 'renewed'> {
  const existing = await this.prisma.subscription.findUnique({ where: { userId } });

  const now = new Date();
  const wasActive = !!(existing?.isActive && existing.expiresAt && existing.expiresAt > now);
  const base = wasActive ? (existing!.expiresAt as Date) : now;
  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + days);

  await this.prisma.subscription.upsert({
    where: { userId },
    create: { userId, isActive: true, expiresAt: newExpiry, tariff: tariff ?? null },
    update: { isActive: true, expiresAt: newExpiry, tariff: tariff ?? existing?.tariff ?? null },
  });

  const outcome: 'started' | 'renewed' = wasActive ? 'renewed' : 'started';
  this.analytics.capture(
    userId,
    outcome === 'started' ? 'subscription_started' : 'subscription_renewed',
    { tariff: tariff ?? existing?.tariff ?? null, days, expiresAt: newExpiry.toISOString() },
  );

  return outcome;
}
```

- [ ] **Step 2: No PaymentsService changes needed**

Task 7 already calls `addDaysToSubscription(userId, days, tariff)` via the helper. The new signature is backward-compatible (tariff is optional). Verify:

```bash
grep -n "addDaysToSubscription" backend/src/payments/payments.service.ts
```
Expected: exactly one call inside `onPaymentSucceeded` with 3 args.

- [ ] **Step 3: Verify build**

Run:
```bash
cd backend && npm run build
```
Expected: success.

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/subscriptions/subscriptions.service.ts
git commit -m "feat(analytics): fire subscription_started and subscription_renewed events"
```

---

## Task 9: `subscription_expired` cron job

YooKassa one-time charges mean subscriptions just expire when `expiresAt < now`. We need a daily sweep that marks them inactive AND fires the event.

**Files:**
- Create: `backend/src/subscriptions/subscriptions.cron.ts`
- Modify: `backend/src/subscriptions/subscriptions.service.ts`
- Modify: `backend/src/subscriptions/subscriptions.module.ts`

- [ ] **Step 1: Add `expireDueSubscriptions` to the service**

In `backend/src/subscriptions/subscriptions.service.ts`, add this method (place it after `addDaysToSubscription`):

```ts
async expireDueSubscriptions(): Promise<number> {
  const now = new Date();
  const due = await this.prisma.subscription.findMany({
    where: { isActive: true, expiresAt: { lt: now } },
    select: { userId: true, expiresAt: true, tariff: true },
  });

  if (due.length === 0) return 0;

  await this.prisma.subscription.updateMany({
    where: { userId: { in: due.map((s) => s.userId) } },
    data: { isActive: false },
  });

  for (const s of due) {
    this.analytics.capture(s.userId, 'subscription_expired', {
      tariff: s.tariff,
      expiredAt: s.expiresAt?.toISOString() ?? null,
    });
  }

  return due.length;
}
```

- [ ] **Step 2: Create the cron file**

Create `backend/src/subscriptions/subscriptions.cron.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class SubscriptionsCron {
  private readonly logger = new Logger(SubscriptionsCron.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runExpirySweep() {
    try {
      const expired = await this.subscriptionsService.expireDueSubscriptions();
      if (expired > 0) {
        this.logger.log(`Expired ${expired} subscription(s)`);
      }
    } catch (err) {
      this.logger.error(`Expiry sweep failed: ${(err as Error).message}`);
    }
  }
}
```

(Hourly rather than daily — keeps `getMySubscription` consistent and PostHog data fresh, and the query is cheap.)

- [ ] **Step 3: Register the cron in the module**

Modify `backend/src/subscriptions/subscriptions.module.ts`. The result should look like:

```ts
import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsCron } from './subscriptions.cron';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsCron],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
```

(Adjust imports list to match what was there before — only ADD `SubscriptionsCron` import and provider.)

- [ ] **Step 4: Also fire expired event in `getMySubscription`**

In `subscriptions.service.ts`, find the existing `getMySubscription` method. Inside the `if (isExpired && subscription.isActive)` branch, BEFORE the `return`, add the analytics fire:

```ts
if (isExpired && subscription.isActive) {
  await this.prisma.subscription.update({
    where: { userId },
    data: { isActive: false },
  });
  this.analytics.capture(userId, 'subscription_expired', {
    tariff: subscription.tariff,
    expiredAt: subscription.expiresAt?.toISOString() ?? null,
  });
  return { isActive: false, expiresAt: subscription.expiresAt };
}
```

This catches the case where a user opens the app right after expiry — we don't want to wait for the cron tick.

To avoid duplicate firing (cron + on-read), the cron uses `findMany` only on `isActive: true` rows, so once on-read flips `isActive=false`, the cron won't pick the row up.

- [ ] **Step 5: Verify build**

Run:
```bash
cd backend && npm run build
```
Expected: success.

- [ ] **Step 6: Commit**

```bash
cd backend
git add src/subscriptions/
git commit -m "feat(analytics): add subscription_expired event with hourly cron sweep"
```

---

## Task 10: Manual smoke test

Automated tests cover AnalyticsService in isolation. The integration is best verified end-to-end against a real PostHog project.

- [ ] **Step 1: Create a server-side Project API Key in PostHog**

Open https://us.posthog.com/project/settings → "Project API Key". The existing frontend key (`phc_tef...`) is fine to reuse for server-side too — PostHog uses the same key for both. Note it.

- [ ] **Step 2: Configure backend env**

Edit `backend/.env`:

```
POSTHOG_KEY=phc_tef8AFVMWsySaQUvJCAbCZhGC49exziC3dH6aACHA6gC
POSTHOG_HOST=https://us.i.posthog.com
```

- [ ] **Step 3: Apply migration to local DB**

```bash
cd backend && npx prisma migrate deploy
```
Expected: `Applied 1 migration` (`20260527120000_add_tariff_to_subscription_payment`).

- [ ] **Step 4: Start backend in dev mode**

```bash
cd backend && npm run start:dev
```
Watch the log on startup. Expected line:

```
[AnalyticsService] PostHog server-side analytics initialised (host=https://us.i.posthog.com)
```

If you see `POSTHOG_KEY not set — server-side analytics disabled` instead, the env didn't load — check `.env` and restart.

- [ ] **Step 5: Trigger a test payment end-to-end**

Use a real YooKassa test card (or the existing test flow). Buy a `Plus` subscription. Within ~5 seconds of the payment redirect back:

1. Open https://us.posthog.com/project/<your_project>/events
2. Filter by event = `payment_completed`
3. Expected: a row with your `userId` as distinct_id, properties containing `amount`, `tariff: "PLUS"`, `daysToAdd`, `checksToAdd`
4. Expected: ALSO a `subscription_started` event for the same user

- [ ] **Step 6: Trigger renewal**

While the subscription is still active, buy another `Plus` package. Expected: `payment_completed` + `subscription_renewed` (not `subscription_started`).

- [ ] **Step 7: Trigger expiry**

Either:
- (a) wait for the natural cron tick after the subscription expires, OR
- (b) manually set `expiresAt` in the DB to a past date and call `GET /subscriptions/me` from the frontend.

Expected: `subscription_expired` event in PostHog.

- [ ] **Step 8: Verify event volume in PostHog**

Open the PostHog Live Events view. Within 24h you should see (assuming any production traffic):
- `payment_completed` count ≈ count of `Payment.status=SUCCEEDED` created in the same window (allow ±1 for in-flight).
- `subscription_started + subscription_renewed` count ≈ count of completed payments with `daysToAdd > 0`.

If counts diverge significantly, check the backend logs for `PostHog capture failed for event=...` lines.

---

## Done criteria

- [ ] `npm test` passes in backend (4 AnalyticsService tests)
- [ ] `npm run build` passes in backend AND frontend
- [ ] PostHog Live Events shows all 4 events (`payment_completed`, `subscription_started`, `subscription_renewed`, `subscription_expired`) with `tariff` property where applicable
- [ ] At least one `payment_completed → subscription_started` pair fires from a real test payment
- [ ] Backend boots cleanly with `POSTHOG_KEY=""` (events become no-op, no crashes)
- [ ] Prisma migration applied successfully

## Rollback

If anything goes wrong after deploy:

1. **Disable analytics quickly:** unset `POSTHOG_KEY` and restart the backend — all `capture()` calls become no-ops.
2. **Revert the migration if needed:** the columns are nullable and the enum is unreferenced after rollback, so dropping is safe:
   ```sql
   ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "tariff";
   ALTER TABLE "payments" DROP COLUMN IF EXISTS "tariff";
   DROP TYPE IF EXISTS "Tariff";
   ```
3. **Revert commits:** `git revert <hash>..<hash>` for the Wave 1 range — each task is its own commit, so granular revert works.
