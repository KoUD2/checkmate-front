# Admin Metrics (self-hosted) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute the full Checkmate metrics tree (NSM = PAC + branches) entirely inside the product's own NestJS/Prisma backend, expose it via one admin-only endpoint, render it in the existing Next.js admin panel, and remove PostHog completely.

**Architecture:** A new backend `analytics` module with thin orchestration (`AnalyticsService`) over a set of **pure, unit-tested functions** in `analytics/lib/` (weeks, text-hash, coverage, tariff, metrics). One endpoint `GET /admin/analytics?from&to` reuses the existing `JwtAuthGuard + RolesGuard + @Roles(ADMIN)` pattern. All metrics are computed **on-demand from raw rows** (`User/Task/Payment/Subscription`) — no new tables, no cron. The frontend adds an `/admin/metrics` page using the existing `api` axios instance and `recharts`. PostHog (provider, 10 call sites, package) is deleted.

**Tech Stack:** NestJS 11, Prisma 6, Jest + ts-jest (added in Task 0), Node `crypto` (sha256). Frontend: Next.js 16, React 19, recharts 3.

**Spec:** `docs/superpowers/specs/2026-05-30-admin-metrics-design.md`

**Conventions confirmed from codebase:**
- Admin auth: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)` at controller class level (see `admin.controller.ts:20-24`).
- Response envelope: controllers return `{ success: true, data: result }` (see `admin.controller.ts:34`).
- `PrismaModule` is `@Global` — inject `PrismaService` directly, no module import needed.
- Frontend HTTP: `import api from '@/shared/utils/api'`; `api.get('/admin/...')` → read `res.data.data`.
- Week definition: Monday 00:00 — next Monday 00:00, timezone `Europe/Moscow` (UTC+3, no DST). Week key = ISO date (`YYYY-MM-DD`) of the Monday.
- "Paid at week W" = subscription coverage (reconstructed from `Payment`) active at week-end. Coverage reconstruction mirrors `addDaysToSubscription` exactly (`subscriptions.service.ts:79`): only `SUCCEEDED` payments with `daysToAdd > 0`; extend from `max(now, currentExpiry)`.
- Tariff names by `checksToAdd`: `{10:Lite, 50:Plus, 200:Pro, 600:Ultra, 2400:Mega}` (matches `admin.service.ts:185` and `PLANS` in `SubscribePage.tsx:11`).
- Quality is a **proxy** (LIKE/DISLIKE + avg `totalScore`) — failed checks are not persisted (no `status` field on `Task`).

---

## File Structure

**Backend — create:**
- `backend/jest.config.js` — Jest runner config
- `backend/src/analytics/lib/weeks.ts` — ISO-week (MSK) bucketing
- `backend/src/analytics/lib/weeks.spec.ts`
- `backend/src/analytics/lib/text-hash.ts` — normalize / significance / sha256
- `backend/src/analytics/lib/text-hash.spec.ts`
- `backend/src/analytics/lib/coverage.ts` — subscription coverage from payments
- `backend/src/analytics/lib/coverage.spec.ts`
- `backend/src/analytics/lib/tariff.ts` — checksToAdd → tariff name
- `backend/src/analytics/lib/tariff.spec.ts`
- `backend/src/analytics/lib/metrics.ts` — pure aggregation over raw rows
- `backend/src/analytics/lib/metrics.spec.ts`
- `backend/src/analytics/analytics.service.ts` — fetch rows + call metrics
- `backend/src/analytics/analytics.controller.ts` — `GET /admin/analytics`
- `backend/src/analytics/analytics.module.ts`

**Backend — modify:**
- `backend/package.json` — add jest devDeps + `test` script
- `backend/src/app.module.ts` — register `AnalyticsModule`

**Frontend — create:**
- `frontend/src/components/screens/AdminMetrics/AdminMetrics.tsx` — metrics screen
- `frontend/src/components/screens/AdminMetrics/AdminMetrics.module.css`
- `frontend/src/app/admin/metrics/page.tsx` — route

**Frontend — modify:**
- `frontend/src/app/admin/layout.tsx` — add "Метрики" nav item
- `frontend/src/app/layout.tsx` — remove PostHogProvider
- `frontend/src/components/PostHogProvider.tsx` — DELETE
- `frontend/src/config/context/AuthContext.tsx` — remove posthog
- `frontend/src/config/context/TaskCheckContext.tsx` — remove posthog (keep activation localStorage flag? no — see Task 11)
- `frontend/src/components/screens/SubscribePage/SubscribePage.tsx` — remove posthog
- `frontend/src/services/payment.service.ts` — remove posthog
- `frontend/src/components/screens/SubscribePage/ui/SocialConnect/SocialConnect.tsx` — remove posthog
- `frontend/package.json` — remove `posthog-js`

---

## Task 0: Jest setup for backend

The backend has `@nestjs/testing` but no jest runner. We need it to TDD the pure functions.

**Files:**
- Create: `backend/jest.config.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Install jest + ts-jest + types**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend
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
};
```

- [ ] **Step 3: Add test script**

In `backend/package.json`, inside `"scripts"` (after the `"start:prod"` line), add:

```json
    "test": "jest",
    "test:watch": "jest --watch",
```

- [ ] **Step 4: Verify jest runs with no tests yet**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test -- --passWithNoTests
```
Expected: `No tests found` / exit code 0.

- [ ] **Step 5: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/package.json backend/package-lock.json backend/jest.config.js
git commit -m "chore(backend): add jest testing setup"
```

---

## Task 1: Pure lib — `weeks.ts` (MSK week bucketing)

**Files:**
- Create: `backend/src/analytics/lib/weeks.ts`
- Test: `backend/src/analytics/lib/weeks.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/analytics/lib/weeks.spec.ts`:

```ts
import { mskWeekStart, mskDateKey, enumerateWeeks } from './weeks';

describe('weeks', () => {
  it('mskWeekStart snaps to Monday 00:00 MSK', () => {
    // 2026-05-30 is a Saturday. MSK week starts Monday 2026-05-25 00:00 MSK = 2026-05-24T21:00:00Z
    const start = mskWeekStart(new Date('2026-05-30T12:00:00Z'));
    expect(start.toISOString()).toBe('2026-05-24T21:00:00.000Z');
  });

  it('mskWeekStart handles an instant just after MSK midnight Monday', () => {
    // Monday 2026-05-25 00:30 MSK = 2026-05-24T21:30:00Z -> same week start
    const start = mskWeekStart(new Date('2026-05-24T21:30:00Z'));
    expect(start.toISOString()).toBe('2026-05-24T21:00:00.000Z');
  });

  it('mskWeekStart handles an instant just before MSK midnight Monday (previous week)', () => {
    // 2026-05-24T20:59:00Z = Sunday 23:59 MSK -> previous week start (Mon 2026-05-18)
    const start = mskWeekStart(new Date('2026-05-24T20:59:00Z'));
    expect(start.toISOString()).toBe('2026-05-17T21:00:00.000Z');
  });

  it('mskDateKey returns the MSK calendar date of the week start', () => {
    const start = mskWeekStart(new Date('2026-05-30T12:00:00Z'));
    expect(mskDateKey(start)).toBe('2026-05-25');
  });

  it('enumerateWeeks yields contiguous weeks covering the range', () => {
    const weeks = enumerateWeeks(
      new Date('2026-05-01T00:00:00Z'),
      new Date('2026-05-30T00:00:00Z'),
    );
    expect(weeks.map((w) => w.key)).toEqual([
      '2026-04-27', '2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25',
    ]);
    // each end equals the next start
    for (let i = 1; i < weeks.length; i++) {
      expect(weeks[i].start.getTime()).toBe(weeks[i - 1].end.getTime());
    }
    // weeks are 7 days long
    expect(weeks[0].end.getTime() - weeks[0].start.getTime()).toBe(7 * 86400000);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test -- weeks.spec
```
Expected: FAIL "Cannot find module './weeks'".

- [ ] **Step 3: Implement**

Create `backend/src/analytics/lib/weeks.ts`:

```ts
// Week bucketing in Europe/Moscow (UTC+3, no DST). A week runs Monday 00:00 MSK
// to the next Monday 00:00 MSK. Week key = MSK calendar date of the Monday.

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface Week {
  key: string; // YYYY-MM-DD (MSK date of the Monday)
  start: Date; // UTC instant of Monday 00:00 MSK
  end: Date; // UTC instant of the next Monday 00:00 MSK (exclusive)
}

/** UTC instant of the Monday-00:00-MSK that starts the week containing `d`. */
export function mskWeekStart(d: Date): Date {
  const msk = new Date(d.getTime() + MSK_OFFSET_MS);
  const dow = (msk.getUTCDay() + 6) % 7; // Monday = 0 ... Sunday = 6
  msk.setUTCHours(0, 0, 0, 0);
  msk.setUTCDate(msk.getUTCDate() - dow);
  return new Date(msk.getTime() - MSK_OFFSET_MS);
}

/** MSK calendar date (YYYY-MM-DD) of a week-start instant. */
export function mskDateKey(instant: Date): string {
  return new Date(instant.getTime() + MSK_OFFSET_MS).toISOString().slice(0, 10);
}

/** Contiguous weeks whose union covers [from, to]. */
export function enumerateWeeks(from: Date, to: Date): Week[] {
  const weeks: Week[] = [];
  let start = mskWeekStart(from);
  const limit = to.getTime();
  while (start.getTime() <= limit) {
    const end = new Date(start.getTime() + WEEK_MS);
    weeks.push({ key: mskDateKey(start), start, end });
    start = end;
  }
  return weeks;
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test -- weeks.spec
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/src/analytics/lib/weeks.ts backend/src/analytics/lib/weeks.spec.ts
git commit -m "feat(analytics): add MSK week bucketing helpers"
```

---

## Task 2: Pure lib — `text-hash.ts`

**Files:**
- Create: `backend/src/analytics/lib/text-hash.ts`
- Test: `backend/src/analytics/lib/text-hash.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/analytics/lib/text-hash.spec.ts`:

```ts
import { normalize, isSignificant, hashText } from './text-hash';

describe('text-hash', () => {
  it('normalize lowercases, trims, collapses whitespace', () => {
    expect(normalize('  Hello   WORLD\n\tFoo ')).toBe('hello world foo');
  });

  it('isSignificant is false for null/undefined/short text', () => {
    expect(isSignificant(null)).toBe(false);
    expect(isSignificant(undefined)).toBe(false);
    expect(isSignificant('short')).toBe(false);
  });

  it('isSignificant is true at the 50-char normalized threshold', () => {
    const text = 'a '.repeat(25).trim(); // "a a a ..." normalized length 49
    expect(normalize(text).length).toBe(49);
    expect(isSignificant(text)).toBe(false);
    expect(isSignificant(text + ' bb')).toBe(true); // length 52
  });

  it('hashText is stable and ignores case/whitespace differences', () => {
    const a = hashText('The Quick Brown Fox jumps over the lazy dog again ok');
    const b = hashText('the   quick brown fox JUMPS over the lazy dog again ok');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashText differs for different content', () => {
    expect(hashText('alpha beta gamma delta epsilon zeta eta theta iota'))
      .not.toBe(hashText('alpha beta gamma delta epsilon zeta eta theta XXXX'));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test -- text-hash.spec
```
Expected: FAIL "Cannot find module './text-hash'".

- [ ] **Step 3: Implement**

Create `backend/src/analytics/lib/text-hash.ts`:

```ts
import { createHash } from 'crypto';

const MIN_SIGNIFICANT_LENGTH = 50;

export function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function isSignificant(
  text: string | null | undefined,
  min = MIN_SIGNIFICANT_LENGTH,
): boolean {
  if (!text) return false;
  return normalize(text).length >= min;
}

export function hashText(text: string): string {
  return createHash('sha256').update(normalize(text)).digest('hex');
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test -- text-hash.spec
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/src/analytics/lib/text-hash.ts backend/src/analytics/lib/text-hash.spec.ts
git commit -m "feat(analytics): add text normalization and hashing"
```

---

## Task 3: Pure lib — `coverage.ts` (subscription coverage from payments)

This mirrors `SubscriptionsService.addDaysToSubscription` (`subscriptions.service.ts:79`) exactly.

**Files:**
- Create: `backend/src/analytics/lib/coverage.ts`
- Test: `backend/src/analytics/lib/coverage.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/analytics/lib/coverage.spec.ts`:

```ts
import { buildCoverage, isCoveredAt, CoveragePayment } from './coverage';

function pay(p: Partial<CoveragePayment>): CoveragePayment {
  return {
    status: 'SUCCEEDED',
    daysToAdd: 30,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...p,
  };
}

describe('coverage', () => {
  it('ignores non-succeeded and zero-day payments', () => {
    const intervals = buildCoverage([
      pay({ status: 'PENDING' }),
      pay({ status: 'CANCELED' }),
      pay({ daysToAdd: 0 }),
    ]);
    expect(intervals).toEqual([]);
  });

  it('builds a single interval for one payment using updatedAt as success time', () => {
    const intervals = buildCoverage([
      pay({
        daysToAdd: 30,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      }),
    ]);
    expect(intervals).toHaveLength(1);
    expect(intervals[0].start.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(intervals[0].end.toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });

  it('extends from current expiry when a renewal arrives before expiry', () => {
    const intervals = buildCoverage([
      pay({ daysToAdd: 30, updatedAt: new Date('2026-01-01T00:00:00Z') }),
      pay({ daysToAdd: 30, updatedAt: new Date('2026-01-15T00:00:00Z') }), // still active
    ]);
    expect(intervals).toHaveLength(1);
    expect(intervals[0].start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    // 2026-01-01 +30 = 01-31, +30 = 03-02
    expect(intervals[0].end.toISOString()).toBe('2026-03-02T00:00:00.000Z');
  });

  it('starts a fresh interval (gap) when a payment arrives after expiry', () => {
    const intervals = buildCoverage([
      pay({ daysToAdd: 30, updatedAt: new Date('2026-01-01T00:00:00Z') }), // ends 01-31
      pay({ daysToAdd: 30, updatedAt: new Date('2026-03-01T00:00:00Z') }), // gap
    ]);
    expect(intervals).toHaveLength(2);
    expect(intervals[1].start.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('isCoveredAt is inclusive of start and exclusive of end', () => {
    const intervals = buildCoverage([
      pay({ daysToAdd: 30, updatedAt: new Date('2026-01-01T00:00:00Z') }),
    ]);
    expect(isCoveredAt(intervals, new Date('2026-01-01T00:00:00Z'))).toBe(true);
    expect(isCoveredAt(intervals, new Date('2026-01-20T00:00:00Z'))).toBe(true);
    expect(isCoveredAt(intervals, new Date('2026-01-31T00:00:00Z'))).toBe(false);
    expect(isCoveredAt(intervals, new Date('2025-12-31T00:00:00Z'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test -- coverage.spec
```
Expected: FAIL "Cannot find module './coverage'".

- [ ] **Step 3: Implement**

Create `backend/src/analytics/lib/coverage.ts`:

```ts
export interface CoveragePayment {
  status: 'PENDING' | 'SUCCEEDED' | 'CANCELED' | string;
  daysToAdd: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Interval {
  start: Date;
  end: Date;
}

/** When the payment flipped to SUCCEEDED. updatedAt is bumped by the status update. */
function successTime(p: CoveragePayment): Date {
  return p.updatedAt ?? p.createdAt;
}

/** Mirrors addDaysToSubscription via setDate (server-local), matching production. */
function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/**
 * Reconstruct subscription coverage intervals from a user's payments.
 * Mirrors SubscriptionsService.addDaysToSubscription:
 *   base = (active && expiresAt > now) ? expiresAt : now; expiresAt = base + days
 */
export function buildCoverage(payments: CoveragePayment[]): Interval[] {
  const relevant = payments
    .filter((p) => p.status === 'SUCCEEDED' && p.daysToAdd > 0)
    .map((p) => ({ t: successTime(p), days: p.daysToAdd }))
    .sort((a, b) => a.t.getTime() - b.t.getTime());

  const intervals: Interval[] = [];
  let expiry: Date | null = null;

  for (const p of relevant) {
    if (expiry === null || expiry.getTime() < p.t.getTime()) {
      // fresh start (no active coverage at success time)
      expiry = addDays(p.t, p.days);
      intervals.push({ start: p.t, end: expiry });
    } else {
      // extend from current expiry
      expiry = addDays(expiry, p.days);
      intervals[intervals.length - 1].end = expiry;
    }
  }
  return intervals;
}

/** Covered if `at` falls in any interval: start <= at < end. */
export function isCoveredAt(intervals: Interval[], at: Date): boolean {
  const t = at.getTime();
  return intervals.some((iv) => iv.start.getTime() <= t && t < iv.end.getTime());
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test -- coverage.spec
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/src/analytics/lib/coverage.ts backend/src/analytics/lib/coverage.spec.ts
git commit -m "feat(analytics): reconstruct subscription coverage from payments"
```

---

## Task 4: Pure lib — `tariff.ts`

**Files:**
- Create: `backend/src/analytics/lib/tariff.ts`
- Test: `backend/src/analytics/lib/tariff.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/analytics/lib/tariff.spec.ts`:

```ts
import { tariffForChecks } from './tariff';

describe('tariff', () => {
  it('maps known check counts to plan names', () => {
    expect(tariffForChecks(10)).toBe('Lite');
    expect(tariffForChecks(50)).toBe('Plus');
    expect(tariffForChecks(200)).toBe('Pro');
    expect(tariffForChecks(600)).toBe('Ultra');
    expect(tariffForChecks(2400)).toBe('Mega');
  });

  it('falls back to Custom for unknown counts', () => {
    expect(tariffForChecks(0)).toBe('Custom');
    expect(tariffForChecks(77)).toBe('Custom');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test -- tariff.spec
```
Expected: FAIL "Cannot find module './tariff'".

- [ ] **Step 3: Implement**

Create `backend/src/analytics/lib/tariff.ts`:

```ts
export type TariffName = 'Lite' | 'Plus' | 'Pro' | 'Ultra' | 'Mega' | 'Custom';

// Matches admin.service.ts PACKAGE_NAMES and frontend PLANS catalog.
const BY_CHECKS: Record<number, TariffName> = {
  10: 'Lite',
  50: 'Plus',
  200: 'Pro',
  600: 'Ultra',
  2400: 'Mega',
};

export function tariffForChecks(checksToAdd: number): TariffName {
  return BY_CHECKS[checksToAdd] ?? 'Custom';
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test -- tariff.spec
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/src/analytics/lib/tariff.ts backend/src/analytics/lib/tariff.spec.ts
git commit -m "feat(analytics): map check counts to tariff names"
```

---

## Task 5: Pure lib — `metrics.ts` (raw-row types + helpers)

This task adds the data types and the small per-entity helpers. The full tree aggregation (`computeMetrics`) lands in Task 6 so each is independently reviewable.

**Files:**
- Create: `backend/src/analytics/lib/metrics.ts`
- Test: `backend/src/analytics/lib/metrics.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/analytics/lib/metrics.spec.ts`:

```ts
import {
  RawTask,
  channelOf,
  uniqueSignificantHashes,
  buildCoverageByUser,
  pacUserIdsForWeek,
} from './metrics';
import { enumerateWeeks } from './weeks';

const LONG = 'a '.repeat(40).trim(); // 79 chars normalized -> significant

function task(userId: string, day: string, solution: string | null): RawTask {
  return {
    userId,
    solution,
    transcription: null,
    createdAt: new Date(day),
    userRating: null,
    totalScore: null,
  };
}

describe('metrics helpers', () => {
  it('channelOf classifies referral / social / direct', () => {
    const base = { id: 'u', createdAt: new Date(), referredByCode: null, vkId: null, telegramId: null, yandexId: null };
    expect(channelOf({ ...base, referredByCode: 'ABC' })).toBe('referral');
    expect(channelOf({ ...base, telegramId: '123' })).toBe('social');
    expect(channelOf(base)).toBe('direct');
  });

  it('uniqueSignificantHashes counts distinct significant texts in window', () => {
    const tasks = [
      task('u1', '2026-05-26T10:00:00Z', LONG + ' one'),
      task('u1', '2026-05-26T11:00:00Z', LONG + ' one'), // duplicate -> not unique
      task('u1', '2026-05-26T12:00:00Z', LONG + ' two'),
      task('u1', '2026-05-26T13:00:00Z', 'short'), // insignificant
      task('u2', '2026-05-26T10:00:00Z', LONG + ' three'), // other user
    ];
    const set = uniqueSignificantHashes(
      tasks, 'u1',
      new Date('2026-05-25T00:00:00Z'), new Date('2026-06-01T00:00:00Z'),
    );
    expect(set.size).toBe(2);
  });

  it('pacUserIdsForWeek requires active coverage AND >=3 unique checks', () => {
    // Week containing 2026-05-26: Mon 2026-05-25..06-01 (MSK)
    const week = enumerateWeeks(new Date('2026-05-26T00:00:00Z'), new Date('2026-05-26T00:00:00Z'))[0];
    const payments = [
      { userId: 'paid', status: 'SUCCEEDED' as const, amount: 549, daysToAdd: 30, checksToAdd: 50,
        createdAt: new Date('2026-05-20T00:00:00Z'), updatedAt: new Date('2026-05-20T00:00:00Z') },
    ];
    const coverageByUser = buildCoverageByUser(payments);
    const tasks = [
      task('paid', '2026-05-26T10:00:00Z', LONG + ' a'),
      task('paid', '2026-05-26T11:00:00Z', LONG + ' b'),
      task('paid', '2026-05-26T12:00:00Z', LONG + ' c'), // 3 unique -> PAC
      task('free', '2026-05-26T10:00:00Z', LONG + ' a'),
      task('free', '2026-05-26T11:00:00Z', LONG + ' b'),
      task('free', '2026-05-26T12:00:00Z', LONG + ' c'), // 3 unique but NOT paid
      task('lazy', '2026-05-26T10:00:00Z', LONG + ' a'), // paid? no
    ];
    const pac = pacUserIdsForWeek(coverageByUser, tasks, week);
    expect([...pac]).toEqual(['paid']);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test -- metrics.spec
```
Expected: FAIL "Cannot find module './metrics'".

- [ ] **Step 3: Implement the helpers**

Create `backend/src/analytics/lib/metrics.ts`:

```ts
import { buildCoverage, isCoveredAt, Interval } from './coverage';
import { hashText, isSignificant, normalize } from './text-hash';
import { Week } from './weeks';

export interface RawUser {
  id: string;
  createdAt: Date;
  referredByCode: string | null;
  vkId: string | null;
  telegramId: string | null;
  yandexId: string | null;
}

export interface RawTask {
  userId: string;
  solution: string | null;
  transcription: string | null;
  createdAt: Date;
  userRating: 'LIKE' | 'DISLIKE' | null;
  totalScore: number | null;
}

export interface RawPayment {
  userId: string;
  status: 'PENDING' | 'SUCCEEDED' | 'CANCELED';
  amount: number;
  daysToAdd: number;
  checksToAdd: number;
  createdAt: Date;
  updatedAt: Date;
}

export function channelOf(u: RawUser): 'referral' | 'social' | 'direct' {
  if (u.referredByCode) return 'referral';
  if (u.vkId || u.telegramId || u.yandexId) return 'social';
  return 'direct';
}

/** Text used for a check: essay solution, falling back to audio transcription. */
export function checkText(t: RawTask): string | null {
  return t.solution ?? t.transcription ?? null;
}

/** Distinct significant-text hashes for `userId` within [start, end). */
export function uniqueSignificantHashes(
  tasks: RawTask[],
  userId: string,
  start: Date,
  end: Date,
): Set<string> {
  const set = new Set<string>();
  const s = start.getTime();
  const e = end.getTime();
  for (const t of tasks) {
    if (t.userId !== userId) continue;
    const ts = t.createdAt.getTime();
    if (ts < s || ts >= e) continue;
    const text = checkText(t);
    if (!isSignificant(text)) continue;
    set.add(hashText(text as string));
  }
  return set;
}

/** Coverage intervals per user, reconstructed from their payments. */
export function buildCoverageByUser(
  payments: RawPayment[],
): Map<string, Interval[]> {
  const byUser = new Map<string, RawPayment[]>();
  for (const p of payments) {
    const arr = byUser.get(p.userId) ?? [];
    arr.push(p);
    byUser.set(p.userId, arr);
  }
  const out = new Map<string, Interval[]>();
  for (const [userId, ps] of byUser) out.set(userId, buildCoverage(ps));
  return out;
}

/** Users who are PAC in `week`: active coverage at week-end AND >=3 unique checks. */
export function pacUserIdsForWeek(
  coverageByUser: Map<string, Interval[]>,
  tasks: RawTask[],
  week: Week,
): Set<string> {
  const weekEnd = new Date(week.end.getTime() - 1); // last instant of the week
  const candidates = new Set<string>();
  const s = week.start.getTime();
  const e = week.end.getTime();
  for (const t of tasks) {
    const ts = t.createdAt.getTime();
    if (ts >= s && ts < e) candidates.add(t.userId);
  }
  const pac = new Set<string>();
  for (const userId of candidates) {
    const intervals = coverageByUser.get(userId);
    if (!intervals || !isCoveredAt(intervals, weekEnd)) continue;
    if (uniqueSignificantHashes(tasks, userId, week.start, week.end).size >= 3) {
      pac.add(userId);
    }
  }
  return pac;
}

// re-export for downstream use
export { normalize };
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test -- metrics.spec
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/src/analytics/lib/metrics.ts backend/src/analytics/lib/metrics.spec.ts
git commit -m "feat(analytics): add metric raw types and PAC week helper"
```

---

## Task 6: Pure lib — `computeMetrics` (full tree aggregation)

**Files:**
- Modify: `backend/src/analytics/lib/metrics.ts`
- Modify: `backend/src/analytics/lib/metrics.spec.ts`

- [ ] **Step 1: Append the failing tests**

Append to `backend/src/analytics/lib/metrics.spec.ts`:

```ts
import { computeMetrics, RawUser, RawPayment } from './metrics';

const LONG2 = 'b '.repeat(40).trim();

function user(id: string, createdAt: string, extra: Partial<RawUser> = {}): RawUser {
  return { id, createdAt: new Date(createdAt), referredByCode: null, vkId: null, telegramId: null, yandexId: null, ...extra };
}
function succ(userId: string, day: string): RawPayment {
  return { userId, status: 'SUCCEEDED', amount: 549, daysToAdd: 30, checksToAdd: 50, createdAt: new Date(day), updatedAt: new Date(day) };
}

describe('computeMetrics', () => {
  const range = { from: new Date('2026-05-04T00:00:00Z'), to: new Date('2026-05-31T00:00:00Z') };

  it('computes PAC series, registrations, activation, free->paid, guardrails', () => {
    const users = [
      user('paid', '2026-05-05T09:00:00Z'),
      user('free', '2026-05-06T09:00:00Z', { referredByCode: 'AMB1' }),
    ];
    const payments = [succ('paid', '2026-05-11T00:00:00Z')]; // covers 05-11..06-10
    const tasks = [
      // paid: activates (1st check within 7d of reg) and is PAC in week of 05-18
      task('paid', '2026-05-07T10:00:00Z', LONG2 + ' x'), // activation check
      task('paid', '2026-05-18T10:00:00Z', LONG2 + ' a'),
      task('paid', '2026-05-18T11:00:00Z', LONG2 + ' b'),
      task('paid', '2026-05-18T12:00:00Z', LONG2 + ' c'),
      task('paid', '2026-05-18T13:00:00Z', LONG2 + ' c'), // duplicate -> guardrail
      // free: activates but never pays
      task('free', '2026-05-08T10:00:00Z', LONG2 + ' y'),
    ];

    const m = computeMetrics({ users, tasks, payments }, range);

    const wk = m.nsm.pacByWeek.find((w) => w.week === '2026-05-18');
    expect(wk?.pac).toBe(1);
    expect(wk?.new).toBe(1);

    expect(m.newPac.activationRate).toBeCloseTo(1.0, 5); // both users did a check within 7d
    expect(m.newPac.freeToPaidCR).toBeCloseTo(0.5, 5); // 1 of 2 activated users paid
    expect(m.newPac.byChannel.referral).toBe(1);
    expect(m.newPac.byChannel.direct).toBe(1);
    expect(m.newPac.tariffMix.Plus).toBe(1);

    // guardrail: 1 duplicate among paid's significant checks
    expect(m.guardrails.duplicateTextRate).toBeGreaterThan(0);
    expect(m.backup.revenue).toBe(549);
  });

  it('classifies retained vs reactivated across weeks', () => {
    const users = [user('p', '2026-05-01T00:00:00Z')];
    // Two coverage windows with a gap: pays 05-04 (covers..06-03). Single interval, but
    // simulate reactivation by being PAC, idle a week, PAC again.
    const payments = [succ('p', '2026-05-04T00:00:00Z')];
    const tasks = [
      // PAC week 05-04
      task('p', '2026-05-05T10:00:00Z', LONG2 + ' a'),
      task('p', '2026-05-05T11:00:00Z', LONG2 + ' b'),
      task('p', '2026-05-05T12:00:00Z', LONG2 + ' c'),
      // PAC week 05-11 (retained)
      task('p', '2026-05-12T10:00:00Z', LONG2 + ' a'),
      task('p', '2026-05-12T11:00:00Z', LONG2 + ' b'),
      task('p', '2026-05-12T12:00:00Z', LONG2 + ' c'),
    ];
    const m = computeMetrics({ users, tasks, payments },
      { from: new Date('2026-05-04T00:00:00Z'), to: new Date('2026-05-17T00:00:00Z') });
    const w2 = m.nsm.pacByWeek.find((w) => w.week === '2026-05-11');
    expect(w2?.retained).toBe(1);
    expect(w2?.new).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test -- metrics.spec
```
Expected: FAIL "computeMetrics is not a function" (or not exported).

- [ ] **Step 3a: Extend the existing imports (do NOT add new import lines mid-file)**

In `backend/src/analytics/lib/metrics.ts`, the top import block from Task 5 reads:

```ts
import { buildCoverage, isCoveredAt, Interval } from './coverage';
import { hashText, isSignificant, normalize } from './text-hash';
import { Week } from './weeks';
```

Change the `./weeks` import to also pull `enumerateWeeks`, and add one new import for `tariffForChecks`. The block becomes:

```ts
import { buildCoverage, isCoveredAt, Interval } from './coverage';
import { hashText, isSignificant, normalize } from './text-hash';
import { Week, enumerateWeeks } from './weeks';
import { tariffForChecks } from './tariff';
```

(`isCoveredAt` is already imported from Task 5 — do not import it again.)

- [ ] **Step 3b: Append the implementation**

Append to the END of `backend/src/analytics/lib/metrics.ts` (no `import` lines here — they were added in Step 3a):

```ts
export interface PacWeek {
  week: string;
  pac: number;
  new: number;
  retained: number;
  reactivated: number;
}

export interface MetricsResponse {
  range: { from: string; to: string; weeks: string[] };
  nsm: { pacByWeek: PacWeek[]; current: number; wowGrowthPct: number | null };
  newPac: {
    registrationsByWeek: { week: string; count: number }[];
    byChannel: Record<string, number>;
    activationRate: number;
    freeToPaidCR: number;
    tariffMix: Record<string, number>;
  };
  retained: {
    subscriptionRetentionByWeek: { week: string; rate: number | null }[];
    arpcByWeek: { week: string; arpc: number }[];
    quality: { dislikeRate: number | null; avgScore: number | null };
  };
  backup: {
    revenue: number;
    mrrEquivalent: number;
    dauByDay: { day: string; count: number }[];
    wauByWeek: { week: string; count: number }[];
  };
  guardrails: {
    duplicateTextRate: number;
    medianTextLength: number;
    shortCheckRate: number;
  };
}

export interface MetricsInput {
  users: RawUser[];
  tasks: RawTask[];
  payments: RawPayment[];
}

const MS_DAY = 86400000;

export function computeMetrics(
  input: MetricsInput,
  range: { from: Date; to: Date },
): MetricsResponse {
  const { users, tasks, payments } = input;
  const weeks = enumerateWeeks(range.from, range.to);
  const coverageByUser = buildCoverageByUser(payments);
  const succeeded = payments.filter((p) => p.status === 'SUCCEEDED');

  // --- PAC series with new/retained/reactivated ---
  const everPac = new Set<string>();
  let prevPac = new Set<string>();
  const pacByWeek: PacWeek[] = weeks.map((week) => {
    const pac = pacUserIdsForWeek(coverageByUser, tasks, week);
    let isNew = 0;
    let retained = 0;
    let reactivated = 0;
    for (const id of pac) {
      if (!everPac.has(id)) isNew++;
      else if (prevPac.has(id)) retained++;
      else reactivated++;
    }
    for (const id of pac) everPac.add(id);
    prevPac = pac;
    return { week: week.key, pac: pac.size, new: isNew, retained, reactivated };
  });
  const current = pacByWeek.length ? pacByWeek[pacByWeek.length - 1].pac : 0;
  let wowGrowthPct: number | null = null;
  if (pacByWeek.length >= 2) {
    const prev = pacByWeek[pacByWeek.length - 2].pac;
    wowGrowthPct = prev === 0 ? null : ((current - prev) / prev) * 100;
  }

  // --- registrations + channel ---
  const usersInRange = users.filter(
    (u) =>
      u.createdAt.getTime() >= range.from.getTime() &&
      u.createdAt.getTime() <= range.to.getTime(),
  );
  const registrationsByWeek = weeks.map((week) => ({
    week: week.key,
    count: usersInRange.filter(
      (u) =>
        u.createdAt.getTime() >= week.start.getTime() &&
        u.createdAt.getTime() < week.end.getTime(),
    ).length,
  }));
  const byChannel: Record<string, number> = { referral: 0, social: 0, direct: 0 };
  for (const u of usersInRange) byChannel[channelOf(u)]++;

  // --- activation: >=1 check within 7 days of registration ---
  const firstCheckAt = new Map<string, number>();
  for (const t of tasks) {
    const cur = firstCheckAt.get(t.userId);
    const ts = t.createdAt.getTime();
    if (cur === undefined || ts < cur) firstCheckAt.set(t.userId, ts);
  }
  const activated = (u: RawUser): boolean => {
    const fc = firstCheckAt.get(u.id);
    return fc !== undefined && fc - u.createdAt.getTime() <= 7 * MS_DAY && fc >= u.createdAt.getTime();
  };
  const activatedUsers = usersInRange.filter(activated);
  const activationRate = usersInRange.length
    ? activatedUsers.length / usersInRange.length
    : 0;

  // --- free -> paid: activated users with a succeeded payment within 30d of activation ---
  const paidAt = new Map<string, number>();
  for (const p of succeeded) {
    const t = (p.updatedAt ?? p.createdAt).getTime();
    const cur = paidAt.get(p.userId);
    if (cur === undefined || t < cur) paidAt.set(p.userId, t);
  }
  let converted = 0;
  for (const u of activatedUsers) {
    const fc = firstCheckAt.get(u.id)!;
    const pay = paidAt.get(u.id);
    if (pay !== undefined && pay - fc <= 30 * MS_DAY && pay >= fc) converted++;
  }
  const freeToPaidCR = activatedUsers.length ? converted / activatedUsers.length : 0;

  // --- tariff mix (succeeded payments in range) ---
  const tariffMix: Record<string, number> = {};
  for (const p of succeeded) {
    const t = (p.updatedAt ?? p.createdAt).getTime();
    if (t < range.from.getTime() || t > range.to.getTime()) continue;
    const name = tariffForChecks(p.checksToAdd);
    tariffMix[name] = (tariffMix[name] ?? 0) + 1;
  }

  // --- subscription retention: paid at end of W-1 still paid at end of W ---
  const subscriptionRetentionByWeek = weeks.map((week, i) => {
    if (i === 0) return { week: week.key, rate: null as number | null };
    const prevWeek = weeks[i - 1];
    const prevEnd = new Date(prevWeek.end.getTime() - 1);
    const curEnd = new Date(week.end.getTime() - 1);
    let denom = 0;
    let numer = 0;
    for (const [, intervals] of coverageByUser) {
      if (isCoveredAt(intervals, prevEnd)) {
        denom++;
        if (isCoveredAt(intervals, curEnd)) numer++;
      }
    }
    return { week: week.key, rate: denom === 0 ? null : numer / denom };
  });

  // --- ARPC: avg unique significant checks per paid user per week ---
  const arpcByWeek = weeks.map((week) => {
    const weekEnd = new Date(week.end.getTime() - 1);
    let paidCount = 0;
    let total = 0;
    for (const [userId, intervals] of coverageByUser) {
      if (!isCoveredAt(intervals, weekEnd)) continue;
      paidCount++;
      total += uniqueSignificantHashes(tasks, userId, week.start, week.end).size;
    }
    return { week: week.key, arpc: paidCount === 0 ? 0 : total / paidCount };
  });

  // --- quality proxy ---
  let likes = 0;
  let dislikes = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  for (const t of tasks) {
    const ts = t.createdAt.getTime();
    if (ts < range.from.getTime() || ts > range.to.getTime()) continue;
    if (t.userRating === 'LIKE') likes++;
    else if (t.userRating === 'DISLIKE') dislikes++;
    if (t.totalScore !== null && t.totalScore !== undefined) {
      scoreSum += t.totalScore;
      scoreCount++;
    }
  }
  const quality = {
    dislikeRate: likes + dislikes === 0 ? null : dislikes / (likes + dislikes),
    avgScore: scoreCount === 0 ? null : scoreSum / scoreCount,
  };

  // --- backup: revenue, MRR-equiv, DAU/WAU ---
  let revenue = 0;
  for (const p of succeeded) {
    const t = (p.updatedAt ?? p.createdAt).getTime();
    if (t >= range.from.getTime() && t <= range.to.getTime()) revenue += Number(p.amount);
  }
  const mrrFrom = range.to.getTime() - 30 * MS_DAY;
  let mrrEquivalent = 0;
  for (const p of succeeded) {
    const t = (p.updatedAt ?? p.createdAt).getTime();
    if (t > mrrFrom && t <= range.to.getTime()) mrrEquivalent += Number(p.amount);
  }
  const dauMap = new Map<string, Set<string>>();
  for (const t of tasks) {
    const ts = t.createdAt.getTime();
    if (ts < range.from.getTime() || ts > range.to.getTime()) continue;
    const day = new Date(t.createdAt.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const set = dauMap.get(day) ?? new Set<string>();
    set.add(t.userId);
    dauMap.set(day, set);
  }
  const dauByDay = [...dauMap.entries()]
    .map(([day, set]) => ({ day, count: set.size }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const wauByWeek = weeks.map((week) => {
    const set = new Set<string>();
    for (const t of tasks) {
      const ts = t.createdAt.getTime();
      if (ts >= week.start.getTime() && ts < week.end.getTime()) set.add(t.userId);
    }
    return { week: week.key, count: set.size };
  });

  // --- guardrails ---
  let significantCount = 0;
  let duplicateCount = 0;
  let withTextCount = 0;
  let shortCount = 0;
  const lengths: number[] = [];
  const perUserHashCounts = new Map<string, Map<string, number>>();
  for (const t of tasks) {
    const ts = t.createdAt.getTime();
    if (ts < range.from.getTime() || ts > range.to.getTime()) continue;
    const text = checkText(t);
    if (text === null) continue;
    withTextCount++;
    const len = normalize(text).length;
    lengths.push(len);
    if (!isSignificant(text)) {
      shortCount++;
      continue;
    }
    significantCount++;
    const h = hashText(text);
    const userMap = perUserHashCounts.get(t.userId) ?? new Map<string, number>();
    const prev = userMap.get(h) ?? 0;
    userMap.set(h, prev + 1);
    perUserHashCounts.set(t.userId, userMap);
    if (prev >= 1) duplicateCount++; // this occurrence is a repeat
  }
  lengths.sort((a, b) => a - b);
  const medianTextLength = lengths.length
    ? lengths.length % 2
      ? lengths[(lengths.length - 1) / 2]
      : (lengths[lengths.length / 2 - 1] + lengths[lengths.length / 2]) / 2
    : 0;
  const guardrails = {
    duplicateTextRate: significantCount === 0 ? 0 : duplicateCount / significantCount,
    medianTextLength,
    shortCheckRate: withTextCount === 0 ? 0 : shortCount / withTextCount,
  };

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString(), weeks: weeks.map((w) => w.key) },
    nsm: { pacByWeek, current, wowGrowthPct },
    newPac: { registrationsByWeek, byChannel, activationRate, freeToPaidCR, tariffMix },
    retained: { subscriptionRetentionByWeek, arpcByWeek, quality },
    backup: { revenue, mrrEquivalent, dauByDay, wauByWeek },
    guardrails,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test -- metrics.spec
```
Expected: PASS (all metrics tests).

- [ ] **Step 5: Run the full suite**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test
```
Expected: all spec files green (weeks, text-hash, coverage, tariff, metrics).

- [ ] **Step 6: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/src/analytics/lib/metrics.ts backend/src/analytics/lib/metrics.spec.ts
git commit -m "feat(analytics): compute full metrics tree from raw rows"
```

---

## Task 7: AnalyticsService + Controller + Module

**Files:**
- Create: `backend/src/analytics/analytics.service.ts`
- Create: `backend/src/analytics/analytics.controller.ts`
- Create: `backend/src/analytics/analytics.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Implement the service**

Create `backend/src/analytics/analytics.service.ts`:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeMetrics, MetricsResponse, RawPayment } from './lib/metrics';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(fromStr?: string, toStr?: string): Promise<MetricsResponse> {
    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr
      ? new Date(fromStr)
      : new Date(to.getTime() - 8 * 7 * 86400000); // default: last 8 weeks
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Некорректные параметры from/to');
    }
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('from должно быть раньше to');
    }

    // Payments/coverage must look back beyond `from` so historical coverage is correct.
    const [users, tasks, payments] = await Promise.all([
      this.prisma.user.findMany({
        select: {
          id: true,
          createdAt: true,
          referredByCode: true,
          vkId: true,
          telegramId: true,
          yandexId: true,
        },
      }),
      this.prisma.task.findMany({
        select: {
          userId: true,
          solution: true,
          transcription: true,
          createdAt: true,
          userRating: true,
          totalScore: true,
        },
      }),
      this.prisma.payment.findMany({
        select: {
          userId: true,
          status: true,
          amount: true,
          daysToAdd: true,
          checksToAdd: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const normalizedPayments: RawPayment[] = payments.map((p) => ({
      userId: p.userId,
      status: p.status,
      amount: Number(p.amount),
      daysToAdd: p.daysToAdd,
      checksToAdd: p.checksToAdd,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return computeMetrics(
      { users, tasks, payments: normalizedPayments },
      { from, to },
    );
  }
}
```

- [ ] **Step 2: Implement the controller**

Create `backend/src/analytics/analytics.controller.ts`:

```ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Дерево метрик (PAC и декомпозиция)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async getMetrics(@Query('from') from?: string, @Query('to') to?: string) {
    const result = await this.analyticsService.getMetrics(from, to);
    return { success: true, data: result };
  }
}
```

- [ ] **Step 3: Implement the module**

Create `backend/src/analytics/analytics.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
```

- [ ] **Step 4: Register in AppModule**

Modify `backend/src/app.module.ts`. Add the import after the `AdminModule` import line (line 11):

```ts
import { AnalyticsModule } from './analytics/analytics.module';
```

And in the `imports: [...]` array, add `AnalyticsModule,` after `AdminModule,` (line 26):

```ts
    AdminModule,
    AnalyticsModule,
    ReferralsModule,
    ResourcesModule,
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm run build
```
Expected: `nest build` succeeds, no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/src/analytics/analytics.service.ts backend/src/analytics/analytics.controller.ts backend/src/analytics/analytics.module.ts backend/src/app.module.ts
git commit -m "feat(analytics): expose GET /admin/analytics endpoint"
```

---

## Task 8: Frontend — AdminMetrics screen

The existing admin uses one screen component per nav item (`AdminDashboard`, etc.). We add a parallel `/admin/metrics` page rather than overloading the dashboard — it matches the existing nav structure and keeps each screen focused.

**Files:**
- Create: `frontend/src/components/screens/AdminMetrics/AdminMetrics.tsx`
- Create: `frontend/src/components/screens/AdminMetrics/AdminMetrics.module.css`
- Create: `frontend/src/app/admin/metrics/page.tsx`
- Modify: `frontend/src/app/admin/layout.tsx`

- [ ] **Step 1: Create the CSS module**

Create `frontend/src/components/screens/AdminMetrics/AdminMetrics.module.css`:

```css
.page { padding: 16px; }
.title { font-size: 24px; font-weight: 600; margin-bottom: 16px; }
.controls { display: flex; gap: 12px; align-items: center; margin-bottom: 24px; flex-wrap: wrap; }
.controls label { display: flex; flex-direction: column; font-size: 12px; color: #666; gap: 4px; }
.controls input { padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
.card { background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 16px; }
.cardLabel { font-size: 12px; color: #888; margin-bottom: 8px; }
.cardValue { font-size: 22px; font-weight: 700; }
.section { margin-bottom: 32px; }
.sectionTitle { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.chartBox { background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 16px; height: 320px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { text-align: left; padding: 8px; border-bottom: 1px solid #f0f0f0; }
```

- [ ] **Step 2: Create the screen component**

Create `frontend/src/components/screens/AdminMetrics/AdminMetrics.tsx`:

```tsx
'use client'

import api from '@/shared/utils/api'
import { FC, useEffect, useState } from 'react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'
import styles from './AdminMetrics.module.css'

interface PacWeek { week: string; pac: number; new: number; retained: number; reactivated: number }
interface Metrics {
  range: { from: string; to: string; weeks: string[] }
  nsm: { pacByWeek: PacWeek[]; current: number; wowGrowthPct: number | null }
  newPac: {
    registrationsByWeek: { week: string; count: number }[]
    byChannel: Record<string, number>
    activationRate: number
    freeToPaidCR: number
    tariffMix: Record<string, number>
  }
  retained: {
    subscriptionRetentionByWeek: { week: string; rate: number | null }[]
    arpcByWeek: { week: string; arpc: number }[]
    quality: { dislikeRate: number | null; avgScore: number | null }
  }
  backup: {
    revenue: number; mrrEquivalent: number
    dauByDay: { day: string; count: number }[]
    wauByWeek: { week: string; count: number }[]
  }
  guardrails: { duplicateTextRate: number; medianTextLength: number; shortCheckRate: number }
}

const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`)

const isoDaysAgo = (n: number) =>
  new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

const AdminMetrics: FC = () => {
  const [from, setFrom] = useState(isoDaysAgo(56))
  const [to, setTo] = useState(isoDaysAgo(0))
  const [data, setData] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api
      .get(`/admin/analytics?from=${from}&to=${to}`)
      .then((res) => setData(res.data?.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [from, to])

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Метрики</h1>

      <div className={styles.controls}>
        <label>От<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>До<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        {loading && <span>Загрузка…</span>}
      </div>

      {data && (
        <>
          <div className={styles.cards}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>PAC (текущая неделя)</div>
              <div className={styles.cardValue}>{data.nsm.current}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>WoW рост PAC</div>
              <div className={styles.cardValue}>{pct(data.nsm.wowGrowthPct === null ? null : data.nsm.wowGrowthPct / 100)}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Activation Rate</div>
              <div className={styles.cardValue}>{pct(data.newPac.activationRate)}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Free → Paid CR</div>
              <div className={styles.cardValue}>{pct(data.newPac.freeToPaidCR)}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Выручка (период)</div>
              <div className={styles.cardValue}>{data.backup.revenue.toLocaleString('ru-RU')} ₽</div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>PAC по неделям (New / Retained / Reactivated)</div>
            <div className={styles.chartBox}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.nsm.pacByWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="pac" name="PAC" stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="new" name="New" stroke="#16a34a" />
                  <Line type="monotone" dataKey="retained" name="Retained" stroke="#9333ea" />
                  <Line type="monotone" dataKey="reactivated" name="Reactivated" stroke="#ea580c" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Регистрации по неделям</div>
            <div className={styles.chartBox}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.newPac.registrationsByWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="Регистрации" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Каналы регистрации / Микс тарифов</div>
            <table className={styles.table}>
              <tbody>
                {Object.entries(data.newPac.byChannel).map(([k, v]) => (
                  <tr key={`ch-${k}`}><td>Канал: {k}</td><td>{v}</td></tr>
                ))}
                {Object.entries(data.newPac.tariffMix).map(([k, v]) => (
                  <tr key={`tf-${k}`}><td>Тариф: {k}</td><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Retained: ретеншен подписки и качество</div>
            <table className={styles.table}>
              <thead><tr><th>Неделя</th><th>Sub. retention</th><th>ARPC</th></tr></thead>
              <tbody>
                {data.retained.subscriptionRetentionByWeek.map((r, i) => (
                  <tr key={r.week}>
                    <td>{r.week}</td>
                    <td>{pct(r.rate)}</td>
                    <td>{data.retained.arpcByWeek[i]?.arpc.toFixed(2) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Dislike rate: {pct(data.retained.quality.dislikeRate)} · Средний балл: {data.retained.quality.avgScore?.toFixed(1) ?? '—'}</p>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Anti-fraud guardrails</div>
            <table className={styles.table}>
              <tbody>
                <tr><td>% проверок с дублем текста (норма &lt; 5%)</td><td>{pct(data.guardrails.duplicateTextRate)}</td></tr>
                <tr><td>Медианная длина текста (норма &gt; 100)</td><td>{data.guardrails.medianTextLength}</td></tr>
                <tr><td>% коротких проверок (&lt; 50 симв)</td><td>{pct(data.guardrails.shortCheckRate)}</td></tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminMetrics
```

- [ ] **Step 3: Create the route page**

Create `frontend/src/app/admin/metrics/page.tsx`:

```tsx
import AdminMetrics from '@/components/screens/AdminMetrics/AdminMetrics'

export default function AdminMetricsPage() {
  return <AdminMetrics />
}
```

- [ ] **Step 4: Add the nav item**

Modify `frontend/src/app/admin/layout.tsx`. In the `NAV_ITEMS` array, add the metrics entry right after the Dashboard entry:

```ts
const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/metrics', label: 'Метрики' },
  { href: '/admin/users', label: 'Пользователи' },
  { href: '/admin/payments', label: 'Платежи' },
  { href: '/admin/promos', label: 'Промокоды' },
  { href: '/admin/tasks', label: 'Задания' },
  { href: '/admin/resources', label: 'Полезное' },
]
```

- [ ] **Step 5: Verify frontend build**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/frontend && npm run build
```
Expected: Next.js build succeeds with no type errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add frontend/src/components/screens/AdminMetrics/ frontend/src/app/admin/metrics/ frontend/src/app/admin/layout.tsx
git commit -m "feat(admin): add metrics dashboard page"
```

---

## Task 9: Remove PostHog — call sites

Remove every `posthog.capture`/`identify` and its import. Keep all surrounding behavior (the activation localStorage flag stays so we don't change product behavior — it just no longer emits an event).

**Files:**
- Modify: `frontend/src/config/context/AuthContext.tsx`
- Modify: `frontend/src/config/context/TaskCheckContext.tsx`
- Modify: `frontend/src/components/screens/SubscribePage/SubscribePage.tsx`
- Modify: `frontend/src/services/payment.service.ts`
- Modify: `frontend/src/components/screens/SubscribePage/ui/SocialConnect/SocialConnect.tsx`

- [ ] **Step 1: AuthContext.tsx**

Remove the import line `import posthog from "posthog-js";` (line 4).

Replace the registration block (lines 142-145):
```ts
      if (data.user) {
        posthog.identify(data.user.id, { email, firstName, lastName });
        posthog.capture('user_registered');
      }
```
with:
```ts
      // (analytics handled server-side from DB; no client tracking)
```

Replace the login block (lines 162-165):
```ts
      if (data.user) {
        posthog.identify(data.user.id, { email });
        posthog.capture('user_logged_in');
      }
```
with:
```ts
      // (analytics handled server-side from DB; no client tracking)
```

- [ ] **Step 2: TaskCheckContext.tsx**

Remove the import line `import posthog from 'posthog-js'` (line 3).

In `startCheck` (line 151) remove:
```ts
			posthog.capture('check_started', { taskType })
```

In `completeCheck` (lines 154-161), replace:
```ts
		const completeCheck = (result: TaskResult) => {
			setState(prev => ({ ...prev, isChecking: false, isChecked: true, result }))
			posthog.capture('check_completed', { taskType: result.kind, totalScore: result.totalScore })
			if (!localStorage.getItem('activated')) {
				posthog.capture('user_activated')
				localStorage.setItem('activated', '1')
			}
		}
```
with:
```ts
		const completeCheck = (result: TaskResult) => {
			setState(prev => ({ ...prev, isChecking: false, isChecked: true, result }))
		}
```

In `failCheck` (lines 163-166) remove:
```ts
			posthog.capture('check_failed', { taskType: state.taskType, error })
```

- [ ] **Step 3: SubscribePage.tsx**

Remove the import line `import posthog from "posthog-js";` (line 6).

Remove the page-view effect (lines 54-56):
```ts
  useEffect(() => {
    posthog.capture('subscription_page_viewed')
  }, [])
```

Remove the promo capture line (line 116):
```ts
      posthog.capture('promo_activated', { code: promoCode.trim() });
```

- [ ] **Step 4: payment.service.ts**

Remove the import line `import posthog from 'posthog-js'` (line 2).

Remove the capture line inside `createPayment` (line 6):
```ts
    posthog.capture('payment_started', { amount, checksToAdd, daysToAdd })
```

- [ ] **Step 5: SocialConnect.tsx**

Remove the import line `import posthog from "posthog-js";` (line 5).

Remove the telegram capture (line 45):
```ts
        posthog.capture('social_connected', { provider: 'telegram' });
```

Remove the yandex capture (line 83):
```ts
      posthog.capture('social_connected', { provider: 'yandex' });
```

- [ ] **Step 6: Verify no references remain**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/frontend && grep -rn "posthog" src/ | grep -v PostHogProvider.tsx
```
Expected: no output (PostHogProvider.tsx is deleted in the next task).

- [ ] **Step 7: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add frontend/src/config/context/AuthContext.tsx frontend/src/config/context/TaskCheckContext.tsx frontend/src/components/screens/SubscribePage/SubscribePage.tsx frontend/src/services/payment.service.ts frontend/src/components/screens/SubscribePage/ui/SocialConnect/SocialConnect.tsx
git commit -m "refactor: remove PostHog client event capture"
```

---

## Task 10: Remove PostHog — provider, layout, dependency

**Files:**
- Delete: `frontend/src/components/PostHogProvider.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/package.json`

- [ ] **Step 1: Remove the provider from layout**

In `frontend/src/app/layout.tsx`, remove the import (line 2):
```ts
import { PostHogProvider } from "@/components/PostHogProvider";
```

Replace the provider wrapping (lines 127-133):
```tsx
        <PostHogProvider>
          <AuthProvider>
            <TaskCheckProvider>
              <AppLayout>{children}</AppLayout>
            </TaskCheckProvider>
          </AuthProvider>
        </PostHogProvider>
```
with:
```tsx
        <AuthProvider>
          <TaskCheckProvider>
            <AppLayout>{children}</AppLayout>
          </TaskCheckProvider>
        </AuthProvider>
```

- [ ] **Step 2: Delete the provider file**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git rm frontend/src/components/PostHogProvider.tsx
```

- [ ] **Step 3: Remove the dependency**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/frontend && npm uninstall posthog-js
```

- [ ] **Step 4: Verify no posthog references and clean build**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/frontend && grep -rn "posthog" src/ ; echo "grep done"
cd /Users/konstantinudod/Desktop/CheckMate/frontend && npm run build
```
Expected: grep prints only `grep done` (no matches); Next.js build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add frontend/src/app/layout.tsx frontend/package.json frontend/package-lock.json
git commit -m "chore: remove posthog-js provider and dependency"
```

---

## Task 11: Full verification + manual smoke test

- [ ] **Step 1: Backend unit tests green**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test
```
Expected: all suites pass (weeks, text-hash, coverage, tariff, metrics).

- [ ] **Step 2: Backend builds**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm run build
```
Expected: success.

- [ ] **Step 3: Frontend builds**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/frontend && npm run build
```
Expected: success.

- [ ] **Step 4: Run backend + frontend locally**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm run start:dev
```
In a second terminal:
```bash
cd /Users/konstantinudod/Desktop/CheckMate/frontend && npm run dev
```

- [ ] **Step 5: Hit the endpoint directly (as admin)**

Log in as an ADMIN user in the browser, copy the `accessToken` cookie value, then:
```bash
curl -s "http://localhost:3001/admin/analytics?from=2026-04-01&to=2026-05-30" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" | head -c 800
```
Expected: JSON `{ "success": true, "data": { "nsm": { "pacByWeek": [...], ... } } }`.

- [ ] **Step 6: Verify the admin UI**

Open `http://localhost:3000/admin/metrics`. Expected:
- "Метрики" appears in the admin nav.
- PAC cards render (numbers or 0, not crashing).
- PAC-by-week and registrations charts render.
- Guardrails / retention / channel tables render.
- Changing the date range refetches and updates the view.

- [ ] **Step 7: Sanity-check against known data**

Cross-check one number manually: pick the revenue card value and compare to:
```bash
# in psql or prisma studio: sum of SUCCEEDED payment.amount with updatedAt in [from,to]
```
Expected: matches the card.

- [ ] **Step 8: Confirm PostHog is fully gone**

```bash
cd /Users/konstantinudod/Desktop/CheckMate && grep -rn "posthog" frontend/src backend/src ; echo done
```
Expected: only `done` (no matches).

---

## Done criteria

- [ ] `npm test` passes in backend (weeks, text-hash, coverage, tariff, metrics suites green)
- [ ] `npm run build` passes in backend AND frontend
- [ ] `GET /admin/analytics` returns the full metrics tree as ADMIN; 403/401 for non-admin
- [ ] `/admin/metrics` page renders PAC, branches, guardrails, and refetches on date change
- [ ] Zero `posthog` references remain anywhere in `frontend/src` or `backend/src`
- [ ] `posthog-js` removed from `frontend/package.json`
- [ ] Revenue card value matches a manual DB sum (spot check)

## Rollback

Each task is its own commit. To undo:
1. `git revert <hash>..<hash>` for the range of analytics/posthog-removal commits.
2. No DB migrations were created, so no schema rollback is needed.
3. To restore PostHog quickly: revert the two removal commits (Tasks 9-10) and `npm install posthog-js` in `frontend`.

## Deferred to v2 (per spec — out of scope here)

`User.segment` + onboarding question, real UTM/channel attribution, `paywall_shown` denominator, explicit `check_dispute`, voluntary/involuntary churn split, persisting failed checks, deep reactivation (90-day window), optional `Task.textHash` column if on-the-fly hashing gets slow.
