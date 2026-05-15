---
phase: 04-exam-player
plan: "04"
subsystem: backend/attempts
tags:
  - nestjs
  - controller
  - module
  - attempts
  - wave-3
dependency_graph:
  requires:
    - "04-02 (AttemptsService + DTOs)"
  provides:
    - "AttemptsController with 5 REST routes at /attempts"
    - "AttemptsModule registering controller + provider"
    - "AppModule updated with AttemptsModule"
    - "5 active controller spec tests (DTO validation + guard metadata)"
  affects:
    - "04-05+ (frontend — can now call /attempts/* endpoints)"
tech_stack:
  added: []
  patterns:
    - "Class-level @UseGuards(JwtAuthGuard) only — no per-method guards (D-03)"
    - "{ success: true, data } response envelope on all 5 handlers"
    - "@CurrentUser('id') param decorator for JWT-derived userId"
    - "Reflect.getMetadata('__guards__', ControllerClass) for guard metadata testing"
key_files:
  created:
    - backend/src/attempts/attempts.controller.ts
    - backend/src/attempts/attempts.module.ts
  modified:
    - backend/src/app.module.ts
    - backend/src/attempts/attempts.controller.spec.ts
decisions:
  - "JwtAuthGuard at class level only — no per-method guards per D-03 (student-facing routes, no role distinction needed)"
  - "AttemptsModule has no exports array — AttemptsService is internal to the module"
  - "PrismaModule is global so no imports needed in AttemptsModule"
  - "Test 5 verifies no per-method guards via Reflect.getMetadataKeys on prototype"
metrics:
  duration: "10 minutes"
  completed_date: "2026-05-15"
  tasks_completed: 3
  files_created: 2
  files_modified: 2
---

# Phase 04 Plan 04: AttemptsController — HTTP Layer, Module, Tests Summary

AttemptsController wired to AttemptsService via AttemptsModule; 5 REST routes registered in AppModule; all 5 it.todo() controller spec placeholders replaced with passing DTO validation and guard metadata tests — 12 total passing tests in the attempts suite.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create AttemptsController with 5 route handlers | e726cd3 | backend/src/attempts/attempts.controller.ts |
| 2 | Create AttemptsModule and register in AppModule | c5e69f4 | backend/src/attempts/attempts.module.ts, backend/src/app.module.ts |
| 3 | Replace 5 it.todo() with real DTO + guard tests | bdde37e | backend/src/attempts/attempts.controller.spec.ts |

## File Stats

| File | Lines |
|------|-------|
| attempts.controller.ts | 78 |
| attempts.module.ts | 9 |
| attempts.controller.spec.ts | 39 |
| app.module.ts | +2 lines (import + array entry) |

## Route Map (for Plan 05+ / frontend consumption)

| Method | Path | Service Method |
|--------|------|----------------|
| GET | /attempts/by-variant/:variantId | getOrCreateAttempt(userId, variantId) |
| PUT | /attempts/:id/answers/:taskId | upsertAnswer(id, taskId, userId, content) |
| POST | /attempts/:id/answers/:taskId/increment-play | incrementPlay(id, taskId, userId) |
| PATCH | /attempts/:id/skip-section | skipSection(id, userId, section, skip) |
| POST | /attempts/:id/submit | submit(id, userId) |

## Test Results

```
Tests: 12 passed, 12 total (0 todo, 0 failing)
Test Suites: 2 passed, 2 total
  - attempts.service.spec.ts: 7 passed
  - attempts.controller.spec.ts: 5 passed
```

## Deviations from Plan

None — plan executed exactly as written.

All route paths, decorator stacking, guard placement, response envelope shape, DTO test patterns, and guard metadata assertion patterns match the plan specification verbatim.

## Threat Mitigations Applied

| Threat ID | Status |
|-----------|--------|
| T-04-04-01 (Auth bypass) | Mitigated — class-level @UseGuards(JwtAuthGuard); test 5 verifies guard metadata |
| T-04-04-02 (IDOR via URL) | Mitigated — @CurrentUser('id') extracts userId from JWT, not body; service enforces ownership |
| T-04-04-03 (Mass assignment) | Mitigated — global ValidationPipe + whitelist DTOs; tests 3+4 verify rejection |
| T-04-04-04 (CSRF) | Accepted — Bearer-token auth (Authorization header), not cookie-only |
| T-04-04-05 (HTTP method confusion) | Mitigated — PUT/PATCH/POST/GET per RESEARCH.md endpoint map |

## Threat Surface Scan

New network endpoints introduced: 5 routes at /attempts/*. All protected by JwtAuthGuard (class-level). No new auth paths, file access patterns, or schema changes beyond what Plan 02 established. No unplanned trust boundaries.

## Known Stubs

None — controller delegates all logic to AttemptsService which returns Prisma model data directly.

## Self-Check: PASSED

- [x] backend/src/attempts/attempts.controller.ts exists (78 lines)
- [x] backend/src/attempts/attempts.module.ts exists (9 lines)
- [x] backend/src/app.module.ts contains AttemptsModule (2 occurrences)
- [x] backend/src/attempts/attempts.controller.spec.ts has 5 active it() and 0 it.todo()
- [x] Commit e726cd3 exists (Task 1 controller)
- [x] Commit c5e69f4 exists (Task 2 module + AppModule)
- [x] Commit bdde37e exists (Task 3 spec)
- [x] npm run build exits 0
- [x] 12 tests pass, 0 todo, 0 failing
