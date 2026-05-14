---
phase: 02-task-bank
plan: "02"
subsystem: api
tags: [phase2, nestjs-backend, dto, service, class-validator, prisma, unit-tests]

requires:
  - phase: 02-task-bank/02-00
    provides: [AiTaskType-enum, exam-tasks-service-spec skeleton]
  - phase: 02-task-bank/02-01
    provides: [AiTaskType enum in DB and Prisma Client regenerated]

provides:
  - CreateExamTaskDto with @ValidateIf on correctAnswer/aiTaskType/options (D-04)
  - UpdateExamTaskDto extending PartialType(CreateExamTaskDto)
  - ExamTasksService with list/findById/getById/create/update/remove and D-08 delete protection
  - 4 green unit tests replacing it.todo placeholders in exam-tasks.service.spec.ts

affects: [02-03-PLAN, exam-tasks-controller, admin-task-bank-ui]

tech-stack:
  added: []
  patterns:
    - "@ValidateIf conditional required fields in class-validator DTOs"
    - "PartialType from @nestjs/swagger for update DTOs"
    - "Prisma $transaction array form for atomic delete-and-recreate"
    - "D-08 three-branch delete protection: published ConflictException, draft needsConfirm, confirm transaction"
    - "Jest mock object with jest.fn() for PrismaService (no NestJS testing module)"

key-files:
  created:
    - backend/src/exam-tasks/dto/create-exam-task.dto.ts
    - backend/src/exam-tasks/dto/update-exam-task.dto.ts
    - backend/src/exam-tasks/exam-tasks.service.ts
  modified:
    - backend/src/exam-tasks/exam-tasks.service.spec.ts

key-decisions:
  - "UpdateExamTaskDto uses PartialType from @nestjs/swagger (not @nestjs/mapped-types) to match UpdateResourceDto convention"
  - "Service update() only runs $transaction when options !== undefined so PATCH without options array does not wipe existing options"
  - "Service remove() returns { deleted: true } on success; returns { needsConfirm, variantNames } on draft-only (HTTP 200 both cases)"
  - "Service list() uses Promise.all for concurrent findMany + count calls"

requirements-completed: [TASK-01, TASK-02, TASK-04, TASK-05, TASK-06]

duration: ~15min
completed: "2026-05-14"
---

# Phase 2 Plan 02: DTO + Service Data-Access Layer Summary

**ExamTasksService with D-08 two-tier delete protection and conditional @ValidateIf DTOs for all 6 exam task formats, backed by 4 green unit tests against a mocked PrismaService**

## Performance

- **Duration:** ~15 minutes
- **Started:** 2026-05-14T15:22:00Z
- **Completed:** 2026-05-14T15:35:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- `CreateExamTaskDto` with three `@ValidateIf` groups: `correctAnswer` required for TRUE_FALSE/OPEN_CLOZE/WORD_FORMATION, `aiTaskType` required for AI_CHECK, `options` required for MCQ/MATCHING
- `ExamTasksService.remove()` implements D-08 three-branch logic: published variants → ConflictException; draft-only without confirm → `{ needsConfirm: true, variantNames }` ; confirm=true → Prisma `$transaction` ([deleteMany variantTask, delete examTask])
- `exam-tasks.service.spec.ts` fully replaced 4 it.todo placeholders with real unit tests; all 4 tests pass (0 failures, 0 todos)

## Task Commits

Each task was committed atomically:

1. **Task 1: CreateExamTaskDto and UpdateExamTaskDto** - `4ba7f6f` (feat)
2. **Task 2: ExamTasksService** - `198ee9a` (feat)
3. **Task 3: Replace it.todo in service spec** - `b9c91da` (test)

## Files Created/Modified

- `backend/src/exam-tasks/dto/create-exam-task.dto.ts` — ExamTaskOptionDto + CreateExamTaskDto with 3 @ValidateIf groups covering all format-specific required fields
- `backend/src/exam-tasks/dto/update-exam-task.dto.ts` — UpdateExamTaskDto extends PartialType(CreateExamTaskDto) from @nestjs/swagger
- `backend/src/exam-tasks/exam-tasks.service.ts` — @Injectable ExamTasksService: list/findById/getById/create/update/remove with D-08 delete branches and source contains+insensitive filter
- `backend/src/exam-tasks/exam-tasks.service.spec.ts` — 4 real unit tests with beforeEach Prisma mock (jest.fn()), covers published block, draft needsConfirm, $transaction path, and list filter shape

## DTO ValidateIf Predicates

| Field | Condition | Validators |
|-------|-----------|------------|
| `correctAnswer` | `format === TRUE_FALSE \|\| OPEN_CLOZE \|\| WORD_FORMATION` | @IsString() @IsNotEmpty() |
| `aiTaskType` | `format === AI_CHECK` | @IsEnum(AiTaskType) @IsNotEmpty() |
| `options` | `format === MCQ \|\| MATCHING` | @IsArray() @ValidateNested({ each: true }) @Type(() => ExamTaskOptionDto) |

## Service Method Signatures

```typescript
list(filters: { section?: ExamSection; format?: TaskFormat; source?: string }, page = 1, limit = 20): Promise<{ items, total, totalPages }>
getById(id: string): Promise<ExamTask & { options: ExamTaskOption[] }>
create(dto: CreateExamTaskDto): Promise<ExamTask & { options: ExamTaskOption[] }>
update(id: string, dto: UpdateExamTaskDto): Promise<ExamTask & { options: ExamTaskOption[] }>
remove(id: string, confirm = false): Promise<{ deleted: true } | { needsConfirm: true; variantNames: string[] }>
```

## Unit Test Results (service spec)

```
Tests: 4 passed, 4 total (0 failing, 0 todo)
```

Coverage:
- Test 1 (TASK-04): published variant → ConflictException with Russian message + variants array
- Test 2 (TASK-04): draft-only, no confirm → `{ needsConfirm: true, variantNames }`, no $transaction called
- Test 3 (TASK-04): draft-only, confirm=true → `prisma.$transaction` called exactly once with array arg
- Test 4 (TASK-06): list with section+format+source → findMany called with correct `where`, `skip: 10`, `take: 10`

## Open Items for Plan 03 (Controller)

- `ExamTasksController` wires `ExamTasksService` into HTTP at `@Controller('admin/exam-tasks')`
- Class-level `@UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)` on controller
- 4 remaining `it.todo` in `exam-tasks.controller.spec.ts` to be replaced (DTO validation + RolesGuard tests)
- `ExamTasksModule` registers controller + service + imports PrismaModule, gets registered in AppModule

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no UI placeholders or hardcoded empty values introduced in this plan. Service returns real DB data via PrismaService.

## Threat Surface Scan

No new network endpoints introduced in this plan (service only, no controller). Controller (Plan 03) will introduce the `/admin/exam-tasks` endpoints — threat model enforcement (JwtAuthGuard + RolesGuard) is documented for that plan.

## Self-Check: PASSED

- [x] `backend/src/exam-tasks/dto/create-exam-task.dto.ts` exists with 3 @ValidateIf decorators
- [x] `backend/src/exam-tasks/dto/update-exam-task.dto.ts` exists with PartialType import
- [x] `backend/src/exam-tasks/exam-tasks.service.ts` exists with @Injectable and all 6 methods
- [x] `backend/src/exam-tasks/exam-tasks.service.spec.ts` — 0 it.todo, 4 it() tests
- [x] Commits 4ba7f6f, 198ee9a, b9c91da verified in git log
- [x] `npx tsc --noEmit` exits 0
- [x] `npm test --testPathPattern=exam-tasks.service.spec --runInBand` — 4 passed, 0 failed, 0 todo
