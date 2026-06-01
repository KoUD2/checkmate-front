# V2.2 — User Segment (tutor/student/parent) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect each user's segment (tutor/student/parent) via a non-blocking dashboard banner and break analytics down by segment (user distribution + PAC-by-segment).

**Architecture:** A nullable `User.segment` enum flows into `RawUser`; `computeMetrics` adds a `segments` block (distribution + period-unique PAC by segment). A self-contained `SegmentBanner` component on the Main screen writes the segment via `PATCH /users/me/segment` while it's still null. The existing `/users/me` already spreads the full user, so the profile auto-includes `segment` after migration.

**Tech Stack:** NestJS 11, Prisma 6, Jest, Next.js 16 + React 19.

**Spec:** `docs/superpowers/specs/2026-05-30-user-segment-design.md`

**Conventions confirmed from codebase:**
- Migrations auto-apply on deploy via backend Dockerfile `CMD ["sh","-c","node_modules/.bin/prisma migrate deploy && node dist/src/main.js"]`. No manual step. Folder format `backend/prisma/migrations/<timestamp>_<name>/migration.sql`.
- `UsersController` (`backend/src/users/users.controller.ts`) is `@UseGuards(JwtAuthGuard)` at class level, uses `@CurrentUser('id')` (from `backend/src/common/decorators/current-user.decorator.ts`) to get the userId, and returns `{ success: true, data: { ... } }`.
- `UsersService.getMe` does `const { passwordHash, ...rest } = user; return rest;` — so any new User column is returned automatically; no select to edit.
- Frontend loads the profile via `fetchMe` in `AuthContext.tsx`, which fetches **`/auth/me`** → `data.data.user`. `useAuth()` exposes `user` and `refreshUser()`. Backend `auth.service.ts::getMe` returns `sanitizeUser(user)` which does `const { passwordHash, ...rest } = user; return rest;` — so the new `segment` column is returned automatically after migration; NO backend serialization edit needed. (`/users/me` in UsersService behaves the same way, but the profile the frontend actually consumes is `/auth/me`.)
- `computeMetrics` already filters internal users (V2.1): `users`/`tasks`/`payments` are the post-filter arrays; `usersInRange` is derived from `users`.
- `metrics.spec.ts` `user()` helper builds `RawUser`; it currently sets `isInternal: false` and must also set `segment: null` after this change.
- `AnalyticsService` user select lists `id, createdAt, referredByCode, vkId, telegramId, yandexId, isInternal`.
- `AdminMetrics.tsx` renders metric sections from the `/admin/analytics` response (the `Metrics` interface).

---

## File Structure

**Backend — create:**
- `backend/prisma/migrations/20260530130000_add_user_segment/migration.sql`
- `backend/src/users/dto/set-segment.dto.ts`

**Backend — modify:**
- `backend/prisma/schema.prisma` — `Segment` enum + `User.segment`
- `backend/src/users/users.controller.ts` — `PATCH /users/me/segment`
- `backend/src/users/users.service.ts` — `setSegment(userId, segment)`
- `backend/src/analytics/lib/metrics.ts` — `RawUser.segment` + `segments` block in `computeMetrics`/`MetricsResponse`
- `backend/src/analytics/lib/metrics.spec.ts` — `user()` helper default + segment tests
- `backend/src/analytics/analytics.service.ts` — select `segment`

**Frontend — create:**
- `frontend/src/components/screens/Main/ui/SegmentBanner/SegmentBanner.tsx`
- `frontend/src/components/screens/Main/ui/SegmentBanner/SegmentBanner.module.css`

**Frontend — modify:**
- `frontend/src/config/context/AuthContext.tsx` — `User.segment` field
- `frontend/src/components/screens/Main/Main.tsx` — render `<SegmentBanner />`
- `frontend/src/components/screens/AdminMetrics/AdminMetrics.tsx` — segment tables

---

## Task 1: Schema + migration for `User.segment`

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260530130000_add_user_segment/migration.sql`

- [ ] **Step 1: Add the enum and field**

In `backend/prisma/schema.prisma`, add a new enum near the other enums (e.g. right after the `Role` enum block):

```prisma
enum Segment {
  TUTOR
  STUDENT
  PARENT
}
```

Then in the `User` model, add the field right after the `isInternal` line (which reads `isInternal Boolean @default(false)`):

```prisma
  segment            Segment?
```

- [ ] **Step 2: Create the migration SQL**

Create `backend/prisma/migrations/20260530130000_add_user_segment/migration.sql`:

```sql
-- CreateEnum
CREATE TYPE "Segment" AS ENUM ('TUTOR', 'STUDENT', 'PARENT');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "segment" "Segment";
```

- [ ] **Step 3: Regenerate Prisma client**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npx prisma generate
```
Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 4: Validate schema**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npx prisma validate
```
Expected: "The schema at prisma/schema.prisma is valid". Do NOT run `prisma migrate dev` (could mutate the dev DB).

- [ ] **Step 5: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/prisma/schema.prisma backend/prisma/migrations/20260530130000_add_user_segment/
git commit -m "feat(db): add User.segment enum"
```

---

## Task 2: Backend — `PATCH /users/me/segment`

**Files:**
- Create: `backend/src/users/dto/set-segment.dto.ts`
- Modify: `backend/src/users/users.service.ts`
- Modify: `backend/src/users/users.controller.ts`

- [ ] **Step 1: Create the DTO**

Create `backend/src/users/dto/set-segment.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Segment } from '@prisma/client';

export class SetSegmentDto {
  @ApiProperty({ enum: Segment })
  @IsEnum(Segment)
  segment: Segment;
}
```

- [ ] **Step 2: Add `setSegment` to UsersService**

In `backend/src/users/users.service.ts`, add this method inside the `UsersService` class (after `getMe`). It needs the `Segment` type — add `import { Segment } from '@prisma/client';` at the top of the file:

```ts
  async setSegment(userId: string, segment: Segment) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { segment },
    });
    return { segment };
  }
```

- [ ] **Step 3: Add the controller route**

In `backend/src/users/users.controller.ts`:
- Add `Patch` and `Body` to the `@nestjs/common` import (currently `Controller, Get, UseGuards`).
- Add `ApiOperation` is already imported. Add imports: `import { SetSegmentDto } from './dto/set-segment.dto';`
- Add this method inside the class after `getMe`:

```ts
  @Patch('me/segment')
  @ApiOperation({ summary: 'Установить сегмент пользователя (репетитор/ученик/родитель)' })
  async setSegment(
    @CurrentUser('id') userId: string,
    @Body() dto: SetSegmentDto,
  ) {
    const result = await this.usersService.setSegment(userId, dto.segment);
    return { success: true, data: result };
  }
```

The final import line from `@nestjs/common` should be: `import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';`

- [ ] **Step 4: Verify the backend builds**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm run build
```
Expected: success, no type errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/src/users/dto/set-segment.dto.ts backend/src/users/users.service.ts backend/src/users/users.controller.ts
git commit -m "feat(users): add PATCH /users/me/segment endpoint"
```

---

## Task 3: Metrics — segment distribution + PAC-by-segment (TDD)

**Files:**
- Modify: `backend/src/analytics/lib/metrics.ts`
- Modify: `backend/src/analytics/lib/metrics.spec.ts`

- [ ] **Step 1: Add `segment` to the `user()` test helper**

In `backend/src/analytics/lib/metrics.spec.ts`, the `user()` helper currently is:

```ts
function user(id: string, createdAt: string, extra: Partial<RawUser> = {}): RawUser {
  return { id, createdAt: new Date(createdAt), referredByCode: null, vkId: null, telegramId: null, yandexId: null, isInternal: false, ...extra };
}
```

Replace with (adds `segment: null` default):

```ts
function user(id: string, createdAt: string, extra: Partial<RawUser> = {}): RawUser {
  return { id, createdAt: new Date(createdAt), referredByCode: null, vkId: null, telegramId: null, yandexId: null, isInternal: false, segment: null, ...extra };
}
```

Also find the inline `base` object in the `channelOf` test (it has `isInternal: false`) and add `segment: null` to it so it still satisfies `RawUser`:

```ts
    const base = { id: 'u', createdAt: new Date(), referredByCode: null, vkId: null, telegramId: null, yandexId: null, isInternal: false, segment: null };
```

- [ ] **Step 2: Write the failing test**

Append inside the `describe('computeMetrics', ...)` block (after the internal-exclusion test, before the closing `});`):

```ts
  it('reports segment distribution and PAC by segment, internal excluded', () => {
    const range = { from: new Date('2026-05-04T00:00:00Z'), to: new Date('2026-05-31T00:00:00Z') };
    const users = [
      user('tut', '2026-05-05T09:00:00Z', { segment: 'TUTOR' }),
      user('stu', '2026-05-05T09:00:00Z', { segment: 'STUDENT' }),
      user('par', '2026-05-05T09:00:00Z', { segment: 'PARENT' }),
      user('unk', '2026-05-05T09:00:00Z'), // segment null -> unknown
      user('staff', '2026-05-05T09:00:00Z', { segment: 'TUTOR', isInternal: true }), // excluded
    ];
    // tut becomes PAC in week 05-18; staff would too but is internal.
    const payments = [succ('tut', '2026-05-11T00:00:00Z'), succ('staff', '2026-05-11T00:00:00Z')];
    const tasks = [
      task('tut', '2026-05-18T10:00:00Z', LONG2 + ' a'),
      task('tut', '2026-05-18T11:00:00Z', LONG2 + ' b'),
      task('tut', '2026-05-18T12:00:00Z', LONG2 + ' c'),
      task('staff', '2026-05-18T10:00:00Z', LONG2 + ' a'),
      task('staff', '2026-05-18T11:00:00Z', LONG2 + ' b'),
      task('staff', '2026-05-18T12:00:00Z', LONG2 + ' c'),
    ];

    const m = computeMetrics({ users, tasks, payments }, range);

    // distribution: 4 non-internal users (staff excluded)
    expect(m.segments.distribution).toEqual({ TUTOR: 1, STUDENT: 1, PARENT: 1, unknown: 1 });
    // PAC by segment over the period: only 'tut' (a TUTOR) is PAC; staff excluded
    expect(m.segments.pacBySegment).toEqual({ TUTOR: 1, STUDENT: 0, PARENT: 0, unknown: 0 });
  });
```

- [ ] **Step 3: Run to verify it fails**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test -- metrics.spec
```
Expected: fails — TS error (`segment` not on `RawUser`) and/or `m.segments` undefined. Proceed.

- [ ] **Step 4: Add `segment` to `RawUser`**

In `backend/src/analytics/lib/metrics.ts`, the `RawUser` interface currently ends with `isInternal: boolean;`. Add:

```ts
export interface RawUser {
  id: string;
  createdAt: Date;
  referredByCode: string | null;
  vkId: string | null;
  telegramId: string | null;
  yandexId: string | null;
  isInternal: boolean;
  segment: 'TUTOR' | 'STUDENT' | 'PARENT' | null;
}
```

- [ ] **Step 5: Add the `segments` field to `MetricsResponse`**

In `backend/src/analytics/lib/metrics.ts`, in the `MetricsResponse` interface, add a `segments` block (place it after `guardrails`):

```ts
  guardrails: {
    duplicateTextRate: number;
    medianTextLength: number;
    shortCheckRate: number;
  };
  segments: {
    distribution: { TUTOR: number; STUDENT: number; PARENT: number; unknown: number };
    pacBySegment: { TUTOR: number; STUDENT: number; PARENT: number; unknown: number };
  };
```

- [ ] **Step 6: Compute `segments` in `computeMetrics`**

In `backend/src/analytics/lib/metrics.ts`, the function builds `everPac` (a Set of all userIds that were ever PAC across the weeks) while computing `pacByWeek`. That set is exactly the period-unique PAC users. Add the segment computation just before the final `return {` statement:

```ts
  // --- segments: distribution over in-range users + period-unique PAC by segment ---
  const segKey = (s: RawUser['segment']): 'TUTOR' | 'STUDENT' | 'PARENT' | 'unknown' =>
    s === 'TUTOR' || s === 'STUDENT' || s === 'PARENT' ? s : 'unknown';
  const segmentOf = new Map(users.map((u) => [u.id, segKey(u.segment)]));
  const distribution = { TUTOR: 0, STUDENT: 0, PARENT: 0, unknown: 0 };
  for (const u of usersInRange) distribution[segKey(u.segment)]++;
  const pacBySegment = { TUTOR: 0, STUDENT: 0, PARENT: 0, unknown: 0 };
  for (const id of everPac) pacBySegment[segmentOf.get(id) ?? 'unknown']++;
```

Then add `segments: { distribution, pacBySegment },` to the returned object (after `guardrails,`).

IMPORTANT: confirm the running set is named `everPac` (it accumulates every PAC userId across weeks). If the variable has a different name in the current code, use that name. `usersInRange` already exists (registrations section). `users` is the internal-filtered array.

- [ ] **Step 7: Run to verify it passes and the suite stays green**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test
```
Expected: all suites pass (prior 24 + the new segment test = 25).

- [ ] **Step 8: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/src/analytics/lib/metrics.ts backend/src/analytics/lib/metrics.spec.ts
git commit -m "feat(analytics): add segment distribution and PAC-by-segment"
```

---

## Task 4: AnalyticsService — select `segment`

**Files:**
- Modify: `backend/src/analytics/analytics.service.ts`

- [ ] **Step 1: Add `segment` to the user select**

In `backend/src/analytics/analytics.service.ts`, the `prisma.user.findMany` select currently ends with `isInternal: true,`. Add `segment: true,`:

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
          segment: true,
        },
      }),
```

The `users` array is passed into `computeMetrics`, and Prisma now includes `segment`, satisfying `RawUser`.

- [ ] **Step 2: Verify the backend builds**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm run build && npx tsc --noEmit -p tsconfig.json && echo TSC_OK
```
Expected: build succeeds and `TSC_OK` printed.

- [ ] **Step 3: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add backend/src/analytics/analytics.service.ts
git commit -m "feat(analytics): fetch segment for metrics"
```

---

## Task 5: Frontend — segment banner on Main

**Files:**
- Modify: `frontend/src/config/context/AuthContext.tsx`
- Create: `frontend/src/components/screens/Main/ui/SegmentBanner/SegmentBanner.tsx`
- Create: `frontend/src/components/screens/Main/ui/SegmentBanner/SegmentBanner.module.css`
- Modify: `frontend/src/components/screens/Main/Main.tsx`

- [ ] **Step 1: Add `segment` to the User interface**

In `frontend/src/config/context/AuthContext.tsx`, the `User` interface has fields ending with `subscription?: {...}`. Add `segment` (place it after `socialBonusGranted: boolean;`):

```ts
  segment: 'TUTOR' | 'STUDENT' | 'PARENT' | null;
```

(The profile comes from `/users/me` which spreads the full user, so this field is populated automatically once the backend migration is applied.)

- [ ] **Step 2: Create the banner CSS**

Create `frontend/src/components/screens/Main/ui/SegmentBanner/SegmentBanner.module.css`:

```css
.banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  margin-bottom: 16px;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 12px;
}
.text { font-size: 15px; font-weight: 600; color: #1e293b; margin-right: 8px; }
.btn {
  padding: 8px 16px;
  border: 1px solid #6366f1;
  background: #fff;
  color: #4338ca;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}
.btn:hover { background: #6366f1; color: #fff; }
.skip {
  margin-left: auto;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
  text-decoration: underline;
}
```

- [ ] **Step 3: Create the banner component**

Create `frontend/src/components/screens/Main/ui/SegmentBanner/SegmentBanner.tsx`:

```tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import api from '@/shared/utils/api'
import { FC, useState } from 'react'
import styles from './SegmentBanner.module.css'

type Segment = 'TUTOR' | 'STUDENT' | 'PARENT'

const OPTIONS: { value: Segment; label: string }[] = [
  { value: 'TUTOR', label: 'Репетитор' },
  { value: 'STUDENT', label: 'Ученик' },
  { value: 'PARENT', label: 'Родитель' },
]

const SegmentBanner: FC = () => {
  const { user, refreshUser } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!user || user.segment != null || dismissed) return null

  const choose = async (segment: Segment) => {
    setSaving(true)
    try {
      await api.patch('/users/me/segment', { segment })
      await refreshUser()
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className={styles.banner}>
      <span className={styles.text}>Кто вы?</span>
      {OPTIONS.map((o) => (
        <button key={o.value} className={styles.btn} disabled={saving} onClick={() => choose(o.value)}>
          {o.label}
        </button>
      ))}
      <button className={styles.skip} onClick={() => setDismissed(true)}>Позже</button>
    </div>
  )
}

export default SegmentBanner
```

- [ ] **Step 4: Render the banner in Main**

In `frontend/src/components/screens/Main/Main.tsx`:
- Add the import near the other imports: `import SegmentBanner from './ui/SegmentBanner/SegmentBanner'`
- In the JSX, render `<SegmentBanner />` as the first child inside `<div className={styles['main__content']}>`. That block currently is:

```tsx
			<div className={styles['main__content']}>
				<div className={styles['main__header']}>
					<MainTitle text='Все работы' />
				</div>
```

Change to:

```tsx
			<div className={styles['main__content']}>
				<SegmentBanner />
				<div className={styles['main__header']}>
					<MainTitle text='Все работы' />
				</div>
```

- [ ] **Step 5: Verify the frontend builds**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/frontend && npm run build
```
Expected: Next.js build succeeds, no type errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add frontend/src/config/context/AuthContext.tsx frontend/src/components/screens/Main/ui/SegmentBanner/ frontend/src/components/screens/Main/Main.tsx
git commit -m "feat(main): add segment collection banner"
```

---

## Task 6: Frontend — segment tables in AdminMetrics

**Files:**
- Modify: `frontend/src/components/screens/AdminMetrics/AdminMetrics.tsx`

- [ ] **Step 1: Add `segments` to the Metrics interface**

In `frontend/src/components/screens/AdminMetrics/AdminMetrics.tsx`, the `Metrics` interface has a `guardrails` field. Add a `segments` field after it:

```ts
  guardrails: { duplicateTextRate: number; medianTextLength: number; shortCheckRate: number }
  segments: {
    distribution: { TUTOR: number; STUDENT: number; PARENT: number; unknown: number }
    pacBySegment: { TUTOR: number; STUDENT: number; PARENT: number; unknown: number }
  }
```

- [ ] **Step 2: Render two segment tables**

In the JSX, find the guardrails section (the last `<div className={styles.section}>` block, with "Anti-fraud guardrails"). Add a new section right after it (before the closing `</>` and `)`):

```tsx
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Сегменты пользователей</div>
            <table className={styles.table}>
              <thead><tr><th>Сегмент</th><th>Всего</th><th>PAC за период</th></tr></thead>
              <tbody>
                <tr><td>Репетитор</td><td>{data.segments.distribution.TUTOR}</td><td>{data.segments.pacBySegment.TUTOR}</td></tr>
                <tr><td>Ученик</td><td>{data.segments.distribution.STUDENT}</td><td>{data.segments.pacBySegment.STUDENT}</td></tr>
                <tr><td>Родитель</td><td>{data.segments.distribution.PARENT}</td><td>{data.segments.pacBySegment.PARENT}</td></tr>
                <tr><td>Не указан</td><td>{data.segments.distribution.unknown}</td><td>{data.segments.pacBySegment.unknown}</td></tr>
              </tbody>
            </table>
          </div>
```

- [ ] **Step 3: Verify the frontend builds**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/frontend && npm run build
```
Expected: success, `/admin/metrics` compiles.

- [ ] **Step 4: Commit**

```bash
cd /Users/konstantinudod/Desktop/CheckMate
git add frontend/src/components/screens/AdminMetrics/AdminMetrics.tsx
git commit -m "feat(admin): show segment distribution and PAC-by-segment"
```

---

## Task 7: Full verification + smoke test

- [ ] **Step 1: Backend tests + build**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && npm test 2>&1 | grep -E "Tests:|FAIL" && npm run build >/dev/null 2>&1 && echo BUILD_OK
```
Expected: `Tests: 25 passed`, `BUILD_OK`.

- [ ] **Step 2: Frontend build**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/frontend && npm run build 2>&1 | grep -E "Compiled|Failed|admin/metrics"
```
Expected: `✓ Compiled successfully`, `/admin/metrics` listed.

- [ ] **Step 3: Apply migration locally**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && set -a && . ./.env && set +a && npx prisma migrate deploy 2>&1 | tail -4
```
Expected: `Applied ... 20260530130000_add_user_segment` (or "No pending migrations" if already applied). If a PRIOR unrelated migration is in a failed state on the local dev DB, mark it resolved with `npx prisma migrate resolve --applied <name>` then re-run (this is a known local-dev drift; production is clean).

- [ ] **Step 4: Smoke — set segment + read metrics with an admin token**

```bash
cd /Users/konstantinudod/Desktop/CheckMate/backend && set -a && . ./.env && set +a && (PORT=3009 node dist/src/main.js > /tmp/cm_v22.log 2>&1 &) ; sleep 8
ADMIN_ID=$(node -e 'const {PrismaClient}=require("@prisma/client");const p=new PrismaClient();p.user.findFirst({where:{role:"ADMIN"},select:{id:true}}).then(u=>{process.stdout.write(u.id);return p.$disconnect()})')
TOKEN=$(node -e "const jwt=require('jsonwebtoken');process.stdout.write(jwt.sign({sub:'$ADMIN_ID',email:'a@a',firstName:'A',lastName:'D',role:'ADMIN'},process.env.JWT_SECRET,{expiresIn:'30m'}))")
echo "set-segment status=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"segment":"TUTOR"}' http://localhost:3009/users/me/segment)"
curl -s -H "Authorization: Bearer $TOKEN" 'http://localhost:3009/admin/analytics?from=2026-04-01&to=2026-05-30' -o /tmp/v22.json -w "analytics status=%{http_code}\n"
node -e 'const r=require("/tmp/v22.json").data;console.log("segments:",JSON.stringify(r.segments))'
# revert the admin segment so dev data is unchanged
node -e 'const {PrismaClient}=require("@prisma/client");const p=new PrismaClient();p.user.update({where:{id:"'$ADMIN_ID'"},data:{segment:null}}).then(()=>{console.log("reverted admin segment to null");return p.$disconnect()})'
(lsof -ti:3009 | xargs kill 2>/dev/null); echo "server stopped"
```
Expected: `set-segment status=200`, `analytics status=200`, a `segments` object with `distribution` showing `TUTOR>=1` (the admin we just set), and `reverted admin segment to null`.

---

## Done criteria

- [ ] `npm test` passes in backend (25 tests, incl. the segment test)
- [ ] `npm run build` passes in backend AND frontend; tsc clean
- [ ] Migration `20260530130000_add_user_segment` applies cleanly
- [ ] `PATCH /users/me/segment` persists the segment (200)
- [ ] `GET /admin/analytics` returns a `segments` block (distribution + pacBySegment), internal users excluded
- [ ] Main shows the banner while `segment == null`; choosing a segment hides it
- [ ] `/admin/metrics` shows the segment table

## Deploy (after merge)

push master → `ssh checkmate` → `cd /opt/checkmate && git pull origin master && docker compose up -d --build`. Migration (CREATE TYPE + ADD COLUMN) auto-applies via the backend container CMD. Then users see the banner on next visit; the admin metrics segment table fills in as answers accrue.

## Rollback

Each task is its own commit — `git revert` the range. To reverse the DB column: `ALTER TABLE "users" DROP COLUMN "segment"; DROP TYPE "Segment";`.

## Out of scope (later waves)

V2.3 honest churn + 90-day reactivation; V2.4 UTM + paywall_shown + check_dispute. Breaking activation / Free→Paid down by segment (only distribution + PAC for now). Forcing segment at registration (banner is non-blocking).
