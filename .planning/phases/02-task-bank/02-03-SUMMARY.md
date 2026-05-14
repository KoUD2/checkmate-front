---
phase: 02-task-bank
plan: "03"
subsystem: api
tags: [phase2, nestjs-backend, controller, module, unit-tests, access-control]

requires:
  - phase: 02-task-bank/02-02
    provides: [ExamTasksService, CreateExamTaskDto, UpdateExamTaskDto, service-spec-4-green]

provides:
  - ExamTasksController with 5 admin-guarded REST endpoints at /admin/exam-tasks
  - ExamTasksModule registering controller + service
  - AppModule updated with ExamTasksModule import
  - 4 green controller spec tests (DTO conditional validation + RolesGuard access control)

affects: [02-04-PLAN, 02-05-PLAN, 02-06-PLAN, admin-task-bank-ui]

tech-stack:
  added: []
  patterns:
    - "Class-level @UseGuards(JwtAuthGuard, RolesGuard) + @Roles(Role.ADMIN) on controller (no per-method guards)"
    - "confirm query string coerced to boolean via confirm === 'true' before service call"
    - "plainToInstance + validate() pattern for DTO unit tests without NestJS testing module"
    - "makeMockContext + makeGuardWithAdminRole helpers for RolesGuard isolation tests"

key-files:
  created:
    - backend/src/exam-tasks/exam-tasks.controller.ts
    - backend/src/exam-tasks/exam-tasks.module.ts
  modified:
    - backend/src/app.module.ts
    - backend/src/exam-tasks/exam-tasks.controller.spec.ts

key-decisions:
  - "Class-level guards only — no per-method @UseGuards or @Roles (anti-pattern per RESEARCH.md D-02)"
  - "ExamTasksModule does not export ExamTasksService (internal to module per D-01)"
  - "ExamTasksModule placed after StorageModule in AppModule imports to group Phase-2 modules"
  - "DELETE confirm mapping: confirm === 'true' string comparison (query params are always strings)"

requirements-completed: [TASK-01, TASK-02, TASK-04, TASK-05, TASK-06]

duration: ~10min
completed: "2026-05-14"
---

# Phase 2 Plan 03: ExamTasksController + Module Wiring Summary

**ExamTasksController exposing 5 admin-guarded REST endpoints at /admin/exam-tasks with class-level JwtAuthGuard + RolesGuard, ExamTasksModule registered in AppModule, and 4 green controller spec tests covering DTO conditional validation and RolesGuard ADMIN enforcement**

## Performance

- **Duration:** ~10 minutes
- **Started:** 2026-05-14T15:20:00Z
- **Completed:** 2026-05-14T15:29:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- `ExamTasksController` at `@Controller('admin/exam-tasks')` with class-level guards; all 5 methods return `{ success: true, data }` envelope
- `ExamTasksModule` wires controller + service; no exports (PrismaModule is global)
- `AppModule.imports` updated with `ExamTasksModule` — NestJS bootstraps the full admin/exam-tasks route tree
- `exam-tasks.controller.spec.ts` fully replaced 4 `it.todo` placeholders with real tests; all 8 exam-tasks tests pass; full backend suite (18 tests) green

## Task Commits

Each task was committed atomically:

1. **Task 1: ExamTasksController + ExamTasksModule** — `913ed10` (feat)
2. **Task 2: Register ExamTasksModule in AppModule** — `2c2c789` (feat)
3. **Task 3: Replace it.todo in controller spec** — `8e604f1` (test)

## Controller Route Table

| Method | Path | Guard | Summary |
|--------|------|-------|---------|
| GET | /admin/exam-tasks | JwtAuth + Roles(ADMIN) | Список заданий банка (admin) |
| GET | /admin/exam-tasks/:id | JwtAuth + Roles(ADMIN) | Получить задание по id (admin) |
| POST | /admin/exam-tasks | JwtAuth + Roles(ADMIN) | Создать задание (admin) |
| PATCH | /admin/exam-tasks/:id | JwtAuth + Roles(ADMIN) | Обновить задание (admin) |
| DELETE | /admin/exam-tasks/:id?confirm | JwtAuth + Roles(ADMIN) | Удалить задание (admin) |

## Module Wiring Confirmation

```
AppModule.imports → ExamTasksModule
  ExamTasksModule.controllers → [ExamTasksController]
  ExamTasksModule.providers  → [ExamTasksService]
  (PrismaModule is global — no local import needed)
```

## Unit Test Results

### Controller Spec (4 new tests)

```
PASS src/exam-tasks/exam-tasks.controller.spec.ts
Tests: 4 passed, 4 total (0 failing, 0 todo)
```

| Test | Requirement | Result |
|------|-------------|--------|
| CreateExamTaskDto rejects missing options when format=MCQ | TASK-01 | PASS |
| CreateExamTaskDto rejects missing aiTaskType when format=AI_CHECK | TASK-02 | PASS |
| CreateExamTaskDto rejects missing correctAnswer when format=OPEN_CLOZE | TASK-01 | PASS |
| RolesGuard blocks USER role on @Roles(Role.ADMIN) routes | TASK-06 | PASS |

### Combined Exam-Tasks Suite

```
Test Suites: 2 passed, 2 total
Tests:       8 passed, 8 total (4 controller + 4 service)
```

### Full Backend Suite

```
Test Suites: 4 passed, 4 total
Tests:       18 passed, 18 total
```

## Frontend Readiness

Frontend plans 04–06 can now call `/api/proxy/admin/exam-tasks` end-to-end via Nginx → backend:3001/admin/exam-tasks, subject to a running backend with a valid admin JWT. All 5 CRUD routes are defined and guarded.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no UI placeholders or hardcoded empty values introduced in this plan. Controller delegates all logic to ExamTasksService which returns real DB data.

## Threat Surface Scan

New network surface introduced by this plan:

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new-admin-endpoints | backend/src/exam-tasks/exam-tasks.controller.ts | 5 new admin REST endpoints at /admin/exam-tasks — access controlled by class-level JwtAuthGuard + RolesGuard(ADMIN) (T-02-03-01, T-02-03-02) |

Mitigations in place per threat model:
- T-02-03-01 (Spoofing): JwtAuthGuard at class level — unauthenticated → 401
- T-02-03-02 (EoP): RolesGuard at class level — USER → ForbiddenException (verified by test 4)
- T-02-03-03 (Tampering): Global ValidationPipe(whitelist:true) strips unknown fields; @ValidateIf enforced (verified by tests 1–3)
- T-02-03-04 (Tampering confirm bypass): Service re-queries published state on every remove() call

## Self-Check: PASSED

- [x] `backend/src/exam-tasks/exam-tasks.controller.ts` exists with @Controller('admin/exam-tasks')
- [x] Controller has class-level @UseGuards(JwtAuthGuard, RolesGuard) and @Roles(Role.ADMIN)
- [x] All 5 HTTP methods present (GET, GET :id, POST, PATCH :id, DELETE :id)
- [x] All 5 methods return `{ success: true, data }` envelope
- [x] DELETE handler maps confirm === 'true' before calling service
- [x] `backend/src/exam-tasks/exam-tasks.module.ts` exists with ExamTasksModule export
- [x] Module has controllers: [ExamTasksController] and providers: [ExamTasksService], no exports
- [x] `backend/src/app.module.ts` contains ExamTasksModule import and array entry
- [x] `exam-tasks.controller.spec.ts` — 0 it.todo, 4 it() tests, all pass
- [x] Combined exam-tasks suite: 8 passed, 0 failed
- [x] Full backend suite: 18 passed, 0 failed
- [x] `npx tsc --noEmit` exits 0
- [x] `npm run build` exits 0
- [x] Commits 913ed10, 2c2c789, 8e604f1 verified in git log
