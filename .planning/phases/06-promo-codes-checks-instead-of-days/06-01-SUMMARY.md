---
phase: "06-promo-codes-checks-instead-of-days"
plan: "01"
subsystem: "backend-promo-codes"
tags:
  - prisma
  - nestjs
  - schema-migration
  - promo-codes
  - checks-economy

dependency_graph:
  requires: []
  provides:
    - "PromoCode.checksToAdd field in Prisma schema and DB"
    - "Migration 20260518105004_add_checks_to_promo"
    - "CreatePromoDto.checksToAdd replacing days"
    - "AdminService.createPromo using checksToAdd"
    - "SubscriptionsService.activatePromo crediting freeChecksLeft atomically"
  affects:
    - "backend/prisma/schema.prisma"
    - "backend/src/admin/dto/create-promo.dto.ts"
    - "backend/src/admin/admin.service.ts"
    - "backend/src/subscriptions/subscriptions.service.ts"

tech_stack:
  added: []
  patterns:
    - "Prisma $transaction array form with 3 operations (promoUsage.create + promoCode.update + user.update)"
    - "freeChecksLeft increment pattern (matches Phase 5 PaymentsService idiom)"

key_files:
  created:
    - "backend/prisma/migrations/20260518105004_add_checks_to_promo/migration.sql"
  modified:
    - "backend/prisma/schema.prisma"
    - "backend/src/admin/dto/create-promo.dto.ts"
    - "backend/src/admin/admin.service.ts"
    - "backend/src/subscriptions/subscriptions.service.ts"

decisions:
  - "D-04 override: addDaysToSubscription() method retained in SubscriptionsService — PaymentsService lines 140 and 178 still call it for the paid subscription flow; only the call inside activatePromo() was removed"
  - "Manual migration: prisma migrate dev could not run due to DB drift from feature/ege-variants branch (3 extra migrations in DB not in worktree history); migration SQL created manually with identical content to what Prisma would generate (verified via prisma migrate diff)"

metrics:
  duration: "~30 minutes"
  completed: "2026-05-18"
  tasks_completed: 4
  tasks_total: 4
  files_changed: 5
---

# Phase 06 Plan 01: Promo Codes — Schema and Backend Refactor Summary

Converted the promo-code subsystem from subscription-days to checks-balance: renamed PromoCode.days to checksToAdd in schema and DB, created migration, updated DTO and AdminService, rewrote activatePromo to atomically credit freeChecksLeft in a 3-operation $transaction.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update PromoCode schema (rename days → checksToAdd) | dd1b664 | backend/prisma/schema.prisma |
| 2 | Run Prisma migration (add checksToAdd / drop days) | 5324cb8 | backend/prisma/migrations/20260518105004_add_checks_to_promo/ |
| 3 | Update CreatePromoDto and AdminService.createPromo | 868eb27 | backend/src/admin/dto/create-promo.dto.ts, backend/src/admin/admin.service.ts |
| 4 | Rewrite SubscriptionsService.activatePromo | 9dbbda9 | backend/src/subscriptions/subscriptions.service.ts |

## Schema Diff

PromoCode model change in `backend/prisma/schema.prisma`:
- Removed: `days Int`
- Added: `checksToAdd Int` (no schema-level @default)
- All other fields (id, code, description, maxUses, usedCount, expiresAt, createdAt, usages relation, @@map) unchanged
- Payment.checksToAdd and User.freeChecksLeft models untouched

## Migration

**Folder:** `backend/prisma/migrations/20260518105004_add_checks_to_promo/`

**SQL:**
```sql
-- AlterTable
ALTER TABLE "promo_codes" ADD COLUMN "checksToAdd" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "promo_codes" DROP COLUMN "days";
```

Applied directly to the database. `promo_codes` table now has `checksToAdd` column (integer, NOT NULL, default 1) and no `days` column.

## DTO Change

`CreatePromoDto` in `backend/src/admin/dto/create-promo.dto.ts`:
- Removed: `@ApiProperty({ example: 30, description: 'Количество дней' }) @IsInt() @Min(1) days: number`
- Added: `@ApiProperty({ example: 10, description: 'Количество чеков' }) @IsInt() @Min(1) checksToAdd: number`

## AdminService.createPromo Change

`createPromo()` data block: `days: dto.days` → `checksToAdd: dto.checksToAdd`

The unrelated `const days: string[]` loop variable in `getCharts()` (lines 163–171) was preserved.

## activatePromo Transaction Structure

New 3-operation `$transaction` array:
1. `promoUsage.create({ data: { promoId: promo.id, userId } })` — record usage
2. `promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } })` — increment counter
3. `prisma.user.update({ where: { id: userId }, data: { freeChecksLeft: { increment: promo.checksToAdd } } })` — credit checks

All three are atomic: if any operation fails, none persist.

**Return shape:**
```typescript
{ message: `Промо-код активирован! Добавлено ${promo.checksToAdd} чеков.`, checksAdded: promo.checksToAdd }
```

The old `daysAdded: promo.days` key is removed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma migrate dev blocked by DB drift**
- **Found during:** Task 2
- **Issue:** `prisma migrate dev --name add_checks_to_promo` could not run because the local database has 3 extra migrations from `feature/ege-variants` branch (`20260514131246_add_variant_schema`, `20260514152049_add_ai_task_type`, `20260515161332_add_skipped_sections`) not present in this worktree's migration history. Prisma reported drift and required a reset, which would destroy data.
- **Fix:** Created migration SQL manually with `prisma migrate diff` output to identify the exact promo_codes change, then created the migration folder and SQL file manually. Applied the SQL directly to the database via psql. Regenerated Prisma client types.
- **Verification:** Migration SQL is identical to what `prisma migrate diff --from-url ... --to-schema-datamodel ...` outputs for the promo_codes table. DB confirmed via `\d promo_codes`.
- **Files modified:** `backend/prisma/migrations/20260518105004_add_checks_to_promo/migration.sql`
- **Commit:** 5324cb8

**2. [Rule 2 - CLAUDE.md] addDaysToSubscription method retained**
- **Found during:** Task 4
- **Issue:** The original plan CONTEXT.md D-04 stated "delete addDaysToSubscription entirely", but the RESEARCH.md and PLAN.md task specs (which override D-04) correctly identified that `PaymentsService` still calls `addDaysToSubscription()` at lines 140 and 178. The PLAN.md explicitly says to retain the method.
- **Fix:** Only removed the call inside `activatePromo()`. The method definition at lines 75–87 was preserved as-is.
- **Commit:** 9dbbda9

## Known Stubs

None — all changes wire real data (checksToAdd from DB → returned to client; freeChecksLeft increment is a live DB write).

## Threat Flags

No new attack surface introduced. All trust boundary mitigations from the threat model are already in place:
- T-06-01: `@IsInt() @Min(1)` on CreatePromoDto.checksToAdd — implemented in Task 3
- T-06-02: Existing JwtAuthGuard + RolesGuard on AdminController — unchanged
- T-06-04: PromoUsage @@unique + 3-operation $transaction — implemented in Task 4
- T-06-06: whitelist:true ValidationPipe strips stale `days` field — existing global config
- T-06-07: JWT-protected route, userId from token — existing config unchanged

## Self-Check: PASSED

- backend/prisma/schema.prisma: checksToAdd Int in PromoCode model — FOUND
- backend/prisma/migrations/20260518105004_add_checks_to_promo/migration.sql — FOUND
- backend/src/admin/dto/create-promo.dto.ts: checksToAdd: number — FOUND
- backend/src/admin/admin.service.ts: checksToAdd: dto.checksToAdd — FOUND
- backend/src/subscriptions/subscriptions.service.ts: freeChecksLeft increment + checksAdded return — FOUND
- Commits dd1b664, 5324cb8, 868eb27, 9dbbda9 — all exist in git log
- TypeScript: `tsc --noEmit` exits 0 with 0 errors
- Database: promo_codes table has checksToAdd column, no days column
