---
phase: 03-variant-composer
plan: 03
subsystem: backend-variants-controller
tags: [nestjs, controller, guards, variants, api, wave-2]

# Dependency graph
requires:
  - 03-02 (VariantsService + DTOs)
provides:
  - VariantsAdminController at admin/variants (6 routes, JWT+Roles guards)
  - VariantsController at variants (2 routes, JWT-only)
  - VariantsModule registering both controllers + VariantsService
  - AppModule imports VariantsModule
  - 8 passing controller spec tests
affects:
  - 03-04 (frontend can now consume backend API surface)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-controller in single file (VariantsAdminController + VariantsController) — ResourcesController precedent"
    - "Class-level @UseGuards(JwtAuthGuard, RolesGuard) + @Roles(Role.ADMIN) on admin controller only"
    - "Student controller uses @UseGuards(JwtAuthGuard) only — no RolesGuard"
    - "Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 20)) for DoS-safe pagination"

key-files:
  created:
    - backend/src/variants/variants.controller.ts
    - backend/src/variants/variants.module.ts
  modified:
    - backend/src/app.module.ts
    - backend/src/variants/variants.controller.spec.ts

key-decisions:
  - "Two controllers in one file per ResourcesController precedent — cleanest split without per-method UseGuards"
  - "VariantsModule does NOT export VariantsService (Phase 2 D-01 anti-pattern avoided)"
  - "VariantsModule placed after ExamTasksModule in AppModule imports to keep Phase-2/Phase-3 modules grouped"
  - "Student GET /variants/:id does not filter by published — preview-by-id is shareable (RESEARCH Open Questions #2)"
  - "Test UUID fix: class-validator @IsUUID rejects non-v4 UUIDs; test updated to use actual v4 UUIDs"

# Metrics
duration: 2min
completed: 2026-05-15
---

# Phase 3 Plan 03: Variants HTTP Controller Layer Summary

Two NestJS controllers (admin + student) in one file wiring all 8 variant API routes with correct guard stacks; VariantsModule and AppModule registered; 8 controller spec tests pass; full backend Jest green (31 tests); nest build green.

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-15T12:02:18Z
- **Completed:** 2026-05-15T12:04:27Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Created `backend/src/variants/variants.controller.ts` — two exported classes in one file:
  - `VariantsAdminController` at `admin/variants`: 6 routes (GET list, GET :id, POST, PATCH :id, PUT :id/tasks, DELETE :id) with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)` at class level
  - `VariantsController` at `variants`: 2 routes (GET list published, GET :id) with `@UseGuards(JwtAuthGuard)` only
  - All 8 endpoints return `{ success: true, data: result }` envelope
  - Pagination capped at 100 (DoS mitigation T-03-15)
- Created `backend/src/variants/variants.module.ts` — `@Module({ controllers: [VariantsAdminController, VariantsController], providers: [VariantsService] })`, no exports
- Updated `backend/src/app.module.ts` — added `VariantsModule` import after `ExamTasksModule`
- Updated `backend/src/variants/variants.controller.spec.ts` — replaced 3 `it.todo()` placeholders and added 5 new `it()` blocks; all 8 tests pass

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create dual-controller file + module + AppModule registration | f59a88d | variants.controller.ts, variants.module.ts, app.module.ts |
| 2 | Implement controller spec assertions (8 tests) | b6db637 | variants.controller.spec.ts |
| 3 | Smoke-test full backend Jest suite + build | (no commit — verification only) | — |

## Decisions Made

- Two controllers ship in one file following the `ResourcesController` dual-namespace pattern (cleaner than per-method `@UseGuards`)
- `VariantsModule` does NOT export `VariantsService` (Phase 2 D-01: service stays internal)
- `VariantsModule` placed after `ExamTasksModule` in AppModule imports for Phase-2/Phase-3 grouping
- `GET /variants/:id` does not filter by `published` — preview-by-id is intentionally shareable; Phase 4 will gate attempt creation on `variant.published` (T-03-13 accepted)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test used non-v4 UUIDs that fail @IsUUID validation**
- **Found during:** Task 2 test execution
- **Issue:** Plan spec case 7 used `11111111-1111-1111-1111-111111111111` and `22222222-2222-2222-2222-222222222222` which are not valid UUID v4 (version nibble must be `4`); `class-validator` v0.14.4 correctly rejected them
- **Fix:** Replaced test UUIDs with actual v4 UUIDs (`a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`, `b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12`)
- **Files modified:** `backend/src/variants/variants.controller.spec.ts`
- **Commit:** b6db637

## Security Mitigations Applied

| Threat ID | Status | Evidence |
|-----------|--------|---------|
| T-03-10 | Mitigated | `@UseGuards(JwtAuthGuard, RolesGuard)` at class level on VariantsAdminController |
| T-03-11 | Mitigated | `@Roles(Role.ADMIN)` enforced by RolesGuard; verified by spec test case 8 |
| T-03-12 | Mitigated | Global `ValidationPipe({ whitelist: true })` strips unknown fields from UpdateVariantDto |
| T-03-13 | Accepted | `GET /variants/:id` preview-by-id not filtered by published (per RESEARCH recommendation) |
| T-03-15 | Mitigated | `Math.min(100, ...)` caps limit at 100 on both admin and student list routes |
| T-03-16 | Mitigated | Prisma parameterized queries via `findUnique({ where: { id } })` |

## Self-Check: PASSED

Files verified:
- `backend/src/variants/variants.controller.ts` — exists, 2 exported controllers
- `backend/src/variants/variants.module.ts` — exists
- `backend/src/app.module.ts` — VariantsModule imported and in imports array
- `backend/src/variants/variants.controller.spec.ts` — 8 passing tests
- TypeScript compiles cleanly (npx tsc --noEmit exits 0)
- Full Jest suite: 31 tests pass, 0 failed (6 test suites)
- nest build exits 0
- Compiled output: `backend/dist/src/variants/variants.controller.js` exists
- Compiled output: `backend/dist/src/variants/variants.module.js` exists
- `backend/dist/src/app.module.js` references variants.module
- Commits f59a88d and b6db637 exist in git log
