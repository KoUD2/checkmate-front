# V2.1 — Exclude Internal Accounts from Metrics — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `User.isInternal` flag and exclude flagged accounts (and all their tasks/payments) from every analytics metric, with an admin toggle to set the flag.

**Architecture:** A nullable-default Prisma boolean `User.isInternal` flows into `RawUser`; `computeMetrics` filters out internal users and their rows at the top of the function (single source of truth, fully unit-tested). The flag is editable via the existing `PATCH /admin/users/:id` and a new checkbox column in the admin users table.

**Tech Stack:** NestJS 11, Prisma 6, Jest (existing), Next.js 16 + React 19.

**Spec:** `docs/superpowers/specs/2026-05-30-metrics-exclude-internal-design.md`

**Conventions confirmed from codebase:**
- Migrations auto-apply on deploy: backend Dockerfile `CMD ["sh","-c","node_modules/.bin/prisma migrate deploy && node dist/src/main.js"]`. No manual migrate step.
- Migration folder format: `backend/prisma/migrations/<timestamp>_<name>/migration.sql` (e.g. `20260518105004_add_checks_to_promo`).
- `admin.service.ts::updateUser` uses `data: dto` directly — a new optional DTO field propagates automatically; just add it to the two `select` blocks so the API returns it.
- Frontend admin table edits go through `patch(id, body)` → `PATCH /admin/users/:id`, then re-fetch.
- `computeMetrics` currently starts with `const { users, tasks, payments } = input;` (metrics.ts:157).
- `metrics.spec.ts` has a `user(id, createdAt, extra)` helper (line 73) that builds `RawUser`.

---

## File Structure

**Backend — modify:**
- `backend/prisma/schema.prisma` — add `isInternal` to `User`
- `backend/prisma/migrations/20260530120000_add_user_is_internal/migration.sql` — create (additive)
- `backend/src/analytics/lib/metrics.ts` — `RawUser.isInternal` + filter in `computeMetrics`
- `backend/src/analytics/lib/metrics.spec.ts` — `user()` helper default + new exclusion test
- `backend/src/analytics/analytics.service.ts` — select `isInternal`, pass through
- `backend/src/admin/dto/update-user.dto.ts` — add optional `isInternal`
- `backend/src/admin/admin.service.ts` — add `isInternal` to `updateUser` + `listUsers` selects

**Frontend — modify:**
- `frontend/src/components/screens/AdminUsers/AdminUsers.tsx` — `isInternal` field + column + toggle button

---

## Task 1: Schema + migration for `User.isInternal`

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260530120000_add_user_is_internal/migration.sql`

- [ ] **Step 1: Add the field to the User model**

In `backend/prisma/schema.prisma`, find the `User` model and add the `isInternal` line right after the `isActive` line. The `isActive` line currently reads:

```prisma
  isActive           Boolean        @default(true)
```

Add immediately below it:

```prisma
  isInternal         Boolean        @default(false)
```

- [ ] **Step 2: Create the migration SQL**

Create `backend/prisma/migrations/20260530120000_add_user_is_internal/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "users" ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false;
```

(The `User` model maps to table `"users"` via `@@map("users")`.)

- [ ] **Step 3: Regenerate Prisma client**

Run:
```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npx prisma generate
```
Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 4: Verify the migration is valid SQL against the schema**

Run:
```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-migrations prisma/migrations --shadow-database-url "$DATABASE_URL" 2>&1 | head -5 || echo "diff check skipped (no shadow db) — acceptable"
```
Expected: either "No difference" / clean, or the skip message. Do NOT run `migrate dev` (it could touch the dev DB) — the SQL we wrote is intentional and matches the schema change.

- [ ] **Step 5: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/prisma/schema.prisma backend/prisma/migrations/20260530120000_add_user_is_internal/
git commit -m "feat(db): add User.isInternal flag"
```

---

## Task 2: Filter internal users in `computeMetrics` (TDD)

**Files:**
- Modify: `backend/src/analytics/lib/metrics.ts`
- Modify: `backend/src/analytics/lib/metrics.spec.ts`

- [ ] **Step 1: Add `isInternal` to the `user()` test helper**

In `backend/src/analytics/lib/metrics.spec.ts`, the helper at line 73 currently reads:

```ts
function user(id: string, createdAt: string, extra: Partial<RawUser> = {}): RawUser {
  return { id, createdAt: new Date(createdAt), referredByCode: null, vkId: null, telegramId: null, yandexId: null, ...extra };
}
```

Replace it with (adds the new required field, default `false`):

```ts
function user(id: string, createdAt: string, extra: Partial<RawUser> = {}): RawUser {
  return { id, createdAt: new Date(createdAt), referredByCode: null, vkId: null, telegramId: null, yandexId: null, isInternal: false, ...extra };
}
```

- [ ] **Step 2: Write the failing exclusion test**

Append to the `describe('computeMetrics', ...)` block in `backend/src/analytics/lib/metrics.spec.ts` (after the reactivated test, before the closing `});` of the describe). It reuses the existing `task`, `user`, `succ` helpers and `LONG2`:

```ts
  it('excludes internal users and their tasks/payments from all metrics', () => {
    const range = { from: new Date('2026-05-04T00:00:00Z'), to: new Date('2026-05-31T00:00:00Z') };
    const users = [
      user('real', '2026-05-05T09:00:00Z'),
      user('staff', '2026-05-05T09:00:00Z', { isInternal: true }),
    ];
    // Both pay (covers the PAC week of 05-18) and both make 3 unique checks that week.
    const payments = [succ('real', '2026-05-11T00:00:00Z'), succ('staff', '2026-05-11T00:00:00Z')];
    const tasks = [
      task('real', '2026-05-18T10:00:00Z', LONG2 + ' a'),
      task('real', '2026-05-18T11:00:00Z', LONG2 + ' b'),
      task('real', '2026-05-18T12:00:00Z', LONG2 + ' c'),
      task('staff', '2026-05-18T10:00:00Z', LONG2 + ' a'),
      task('staff', '2026-05-18T11:00:00Z', LONG2 + ' b'),
      task('staff', '2026-05-18T12:00:00Z', LONG2 + ' c'),
    ];

    const m = computeMetrics({ users, tasks, payments }, range);

    // PAC counts only the real user, not staff
    const wk = m.nsm.pacByWeek.find((w) => w.week === '2026-05-18');
    expect(wk?.pac).toBe(1);
    // registrations: only the real user is counted (its week is 2026-05-04)
    const totalRegs = m.newPac.registrationsByWeek.reduce((s, w) => s + w.count, 0);
    expect(totalRegs).toBe(1);
    // revenue: only the real user's payment (549), staff's excluded
    expect(m.backup.revenue).toBe(549);
    // tariff mix: one Plus (real), staff not counted
    expect(m.newPac.tariffMix.Plus).toBe(1);
  });
```

- [ ] **Step 3: Run to verify it fails**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test -- metrics.spec
```
Expected: the new test FAILS — `pac` is 2, `revenue` is 1098, etc. (internal user still counted). The `user()` helper change in Step 1 also forces a TS error until Step 4 adds the field to `RawUser`, so the suite won't compile yet — that's expected; proceed to Step 4.

- [ ] **Step 4: Add `isInternal` to the `RawUser` interface**

In `backend/src/analytics/lib/metrics.ts`, the `RawUser` interface (lines 6-13) currently ends with `yandexId: string | null;`. Add `isInternal`:

```ts
export interface RawUser {
  id: string;
  createdAt: Date;
  referredByCode: string | null;
  vkId: string | null;
  telegramId: string | null;
  yandexId: string | null;
  isInternal: boolean;
}
```

- [ ] **Step 5: Filter internal users/rows at the top of `computeMetrics`**

In `backend/src/analytics/lib/metrics.ts`, the function body currently starts (line 157):

```ts
  const { users, tasks, payments } = input;
  const weeks = enumerateWeeks(range.from, range.to);
```

Replace those two lines with (rename destructured vars to `*All`, then build filtered views):

```ts
  const { users: usersAll, tasks: tasksAll, payments: paymentsAll } = input;
  // Exclude internal (test/QA/staff) accounts and everything they produced from ALL metrics.
  const internalIds = new Set(usersAll.filter((u) => u.isInternal).map((u) => u.id));
  const users = usersAll.filter((u) => !internalIds.has(u.id));
  const tasks = tasksAll.filter((t) => !internalIds.has(t.userId));
  const payments = paymentsAll.filter((p) => !internalIds.has(p.userId));
  const weeks = enumerateWeeks(range.from, range.to);
```

Everything downstream already uses `users`/`tasks`/`payments`, so no other changes are needed in the function.

- [ ] **Step 6: Run to verify the new test passes and the suite stays green**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test
```
Expected: all suites pass (24 tests now: prior 23 + the new exclusion test).

- [ ] **Step 7: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/src/analytics/lib/metrics.ts backend/src/analytics/lib/metrics.spec.ts
git commit -m "feat(analytics): exclude internal users from all metrics"
```

---

## Task 3: Pass `isInternal` through AnalyticsService

**Files:**
- Modify: `backend/src/analytics/analytics.service.ts`

- [ ] **Step 1: Select `isInternal` from the user query**

In `backend/src/analytics/analytics.service.ts`, the `prisma.user.findMany` select block lists user fields. It currently reads:

```ts
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
```

Add `isInternal: true,` after `yandexId: true,`:

```ts
      this.prisma.user.findMany({
        select: {
          id: true,
          createdAt: true,
          referredByCode: true,
          vkId: true,
          telegramId: true,
          yandexId: true,
          isInternal: true,
        },
      }),
```

The `users` array is passed straight into `computeMetrics({ users, tasks, payments: normalizedPayments }, ...)`, and Prisma now includes `isInternal`, so the `RawUser` shape is satisfied with no further change.

- [ ] **Step 2: Verify the backend builds**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm run build
```
Expected: `nest build` succeeds, no type errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/src/analytics/analytics.service.ts
git commit -m "feat(analytics): fetch isInternal for metrics filtering"
```

---

## Task 4: Admin API — accept and return `isInternal`

**Files:**
- Modify: `backend/src/admin/dto/update-user.dto.ts`
- Modify: `backend/src/admin/admin.service.ts`

- [ ] **Step 1: Add `isInternal` to UpdateUserDto**

In `backend/src/admin/dto/update-user.dto.ts`, add a new optional field after the `isActive` field. The file currently has:

```ts
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
```

Add right below it:

```ts
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
```

(`@IsBoolean` and `@IsOptional` are already imported in this file. `updateUser` uses `data: dto`, so persistence is automatic.)

- [ ] **Step 2: Return `isInternal` from updateUser select**

In `backend/src/admin/admin.service.ts`, the `updateUser` method's `select` block lists returned fields ending with `freeChecksLeft: true,`. Add `isInternal: true,` to that select:

```ts
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        freeChecksLeft: true,
        isInternal: true,
      },
```

- [ ] **Step 3: Return `isInternal` from listUsers select**

In `backend/src/admin/admin.service.ts`, the `listUsers` method's `select` block ends with `subscription: {...}` and `_count: {...}`. Add `isInternal: true,` after `freeChecksLeft: true,`:

```ts
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          freeChecksLeft: true,
          isInternal: true,
          createdAt: true,
          subscription: { select: { isActive: true, expiresAt: true } },
          _count: { select: { tasks: true } },
        },
```

- [ ] **Step 4: Verify the backend builds**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm run build
```
Expected: success.

- [ ] **Step 5: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/src/admin/dto/update-user.dto.ts backend/src/admin/admin.service.ts
git commit -m "feat(admin): accept and return isInternal on users"
```

---

## Task 5: Frontend — internal toggle in admin users table

**Files:**
- Modify: `frontend/src/components/screens/AdminUsers/AdminUsers.tsx`

- [ ] **Step 1: Add `isInternal` to the AdminUser interface**

In `frontend/src/components/screens/AdminUsers/AdminUsers.tsx`, the `AdminUser` interface (lines 7-18) has `freeChecksLeft: number`. Add `isInternal`:

```ts
interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'USER'
  isActive: boolean
  freeChecksLeft: number
  isInternal: boolean
  createdAt: string
  subscription: { isActive: boolean; expiresAt: string | null } | null
  _count: { tasks: number }
}
```

- [ ] **Step 2: Add a "Внутренний" column header**

In the `<thead>` row, add a header cell after `<th>Статус</th>`:

```tsx
            <th>Статус</th>
            <th>Внутренний</th>
            <th>Проверок</th>
```

- [ ] **Step 3: Add the toggle cell in each row**

In the `<tbody>` row, add a cell after the status cell (the `<td>` that closes with the `isActive ? ... Заблокирован ...` badges) and before `<td>{u.freeChecksLeft}</td>`:

```tsx
              <td>
                <button
                  className={u.isInternal ? `${styles.btn} ${styles.btnDanger}` : styles.btn}
                  onClick={() => patch(u.id, { isInternal: !u.isInternal })}
                >
                  {u.isInternal ? 'Внутренний ✓' : 'Отметить'}
                </button>
              </td>
```

This reuses the existing `patch(id, body)` helper (which PATCHes and re-fetches) and existing `styles.btn` / `styles.btnDanger` classes — no CSS changes needed.

- [ ] **Step 4: Verify the frontend builds**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/frontend && npm run build
```
Expected: Next.js build succeeds, no type errors, `/admin/users` route compiles.

- [ ] **Step 5: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add frontend/src/components/screens/AdminUsers/AdminUsers.tsx
git commit -m "feat(admin): add internal-account toggle to users table"
```

---

## Task 6: Full verification + smoke test

- [ ] **Step 1: Backend unit tests green**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test
```
Expected: all suites pass (24 tests).

- [ ] **Step 2: Backend + frontend build**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm run build && cd ../frontend && npm run build
```
Expected: both succeed.

- [ ] **Step 3: Boot backend against local DB and apply migration**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && set -a && . ./.env && set +a && npx prisma migrate deploy 2>&1 | tail -5
```
Expected: `Applied ... 20260530120000_add_user_is_internal` (or "No pending migrations" if already applied locally).

- [ ] **Step 4: Verify the column exists and metrics still respond**

Boot the backend on a spare port and confirm the analytics endpoint still returns 200 with an admin token (reuse the V1 smoke approach):

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && set -a && . ./.env && set +a && (PORT=3009 node dist/src/main.js > /tmp/cm_v21.log 2>&1 &) ; sleep 8
ADMIN_ID=$(node -e 'const {PrismaClient}=require("@prisma/client");const p=new PrismaClient();p.user.findFirst({where:{role:"ADMIN"},select:{id:true}}).then(u=>{process.stdout.write(u.id);return p.$disconnect()})')
TOKEN=$(node -e "const jwt=require('jsonwebtoken');process.stdout.write(jwt.sign({sub:'$ADMIN_ID',email:'a@a',firstName:'A',lastName:'D',role:'ADMIN'},process.env.JWT_SECRET,{expiresIn:'30m'}))")
echo "status=$(curl -s -o /tmp/cm_v21_resp.json -w '%{http_code}' -H "Authorization: Bearer $TOKEN" 'http://localhost:3009/admin/analytics?from=2026-04-01&to=2026-05-30')"
node -e 'const r=require("/tmp/cm_v21_resp.json");console.log("success:",r.success,"weeks:",r.data.range.weeks.length,"revenue:",r.data.backup.revenue)'
(lsof -ti:3009 | xargs kill 2>/dev/null)
```
Expected: `status=200`, `success: true`, a weeks count, and a revenue number. (Numbers unchanged from before until accounts are flagged internal — that's correct, the flag defaults false.)

- [ ] **Step 5: Confirm the toggle persists (DB round-trip)**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && set -a && . ./.env && set +a && node -e '
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const u = await p.user.findFirst({ select: { id: true, isInternal: true } });
  console.log("before:", u.isInternal);
  await p.user.update({ where: { id: u.id }, data: { isInternal: true } });
  const after = await p.user.findUnique({ where: { id: u.id }, select: { isInternal: true } });
  console.log("after set true:", after.isInternal);
  await p.user.update({ where: { id: u.id }, data: { isInternal: false } }); // revert
  console.log("reverted to false");
  await p.$disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
'
```
Expected: `before: false`, `after set true: true`, `reverted to false`. Confirms the column is writable and the revert leaves the dev DB clean.

---

## Done criteria

- [ ] `npm test` passes in backend (24 tests, incl. the internal-exclusion test)
- [ ] `npm run build` passes in backend AND frontend
- [ ] Migration `20260530120000_add_user_is_internal` applies cleanly
- [ ] `GET /admin/analytics` still returns 200; internal-flagged users are excluded from results
- [ ] `/admin/users` shows an internal toggle that persists via `PATCH /admin/users/:id`

## Deploy (after merge)

push master → `ssh checkmate` → `cd /opt/checkmate && git pull origin master && docker compose up -d --build`. The migration auto-applies via the backend container's `CMD` (`prisma migrate deploy && node dist/src/main.js`) — no manual migrate step. Then in `/admin/users`, flag the internal accounts; metrics clean up on the next request.

## Rollback

Each task is its own commit. To undo: `git revert` the range. The migration adds a single defaulted column — to reverse on the DB if ever needed: `ALTER TABLE "users" DROP COLUMN "isInternal";`.

## Out of scope (later V2 waves)

V2.2 segment, V2.3 honest churn + 90-day reactivation, V2.4 UTM + paywall_shown + check_dispute. Auto-detecting internal accounts by email/domain — not done; manual flag only.
