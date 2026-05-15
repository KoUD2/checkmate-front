---
phase: 04-exam-player
plan: "02"
subsystem: backend/attempts
tags:
  - nestjs
  - prisma
  - service
  - dto
  - attempts
  - wave-2
dependency_graph:
  requires:
    - "04-01 (skippedSections column + Prisma Client)"
  provides:
    - "AttemptsService with getOrCreateAttempt, upsertAnswer, incrementPlay, skipSection, submit"
    - "UpsertAnswerDto (content: any, @IsOptional)"
    - "SkipSectionDto (section: ExamSection, skip: boolean)"
    - "7 passing unit tests covering ATTEMPT-01, 02, 04, 06, 07, 09 + IDOR"
  affects:
    - "04-04 (AttemptsController — imports AttemptsService + both DTOs)"
tech_stack:
  added: []
  patterns:
    - "Inlined ownership check pattern: findFirst({ where: { id, userId } }) per method"
    - "Read-compute-write for ExamSection[] skippedSections (no direct Prisma push)"
    - "Compound unique key upsert: variantAttemptId_examTaskId"
    - "Jest it() spec with jest.clearAllMocks() for multi-sub-case tests"
key_files:
  created:
    - backend/src/attempts/dto/upsert-answer.dto.ts
    - backend/src/attempts/dto/skip-section.dto.ts
    - backend/src/attempts/attempts.service.ts
  modified:
    - backend/src/attempts/attempts.service.spec.ts
decisions:
  - "Ownership check inlined per method (not extracted to helper) — each method has different status filter requirements per RESEARCH.md"
  - "skipSection guard: only WRITING and SPEAKING allowed (per D-09); other sections throw BadRequestException"
  - "incrementPlay uses findUnique + upsert (not update+create) to handle the first-play create path cleanly"
  - "getOrCreateAttempt checks variant.published before creating — returns NotFoundException for unpublished variants"
metrics:
  duration: "4 minutes"
  completed_date: "2026-05-15"
  tasks_completed: 3
  files_created: 3
  files_modified: 1
---

# Phase 04 Plan 02: AttemptsService — DTOs, Service, Tests Summary

Two DTOs (UpsertAnswerDto, SkipSectionDto), one AttemptsService with five public methods, and 7 active unit tests replacing all it.todo() placeholders from Wave 0 — delivering the complete data-layer state machine for student exam attempts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create UpsertAnswerDto and SkipSectionDto | d87ed9c | backend/src/attempts/dto/upsert-answer.dto.ts, backend/src/attempts/dto/skip-section.dto.ts |
| 2 | Implement AttemptsService with 5 public methods | 99a207c | backend/src/attempts/attempts.service.ts |
| 3 | Replace 7 it.todo() with real assertions | 64131a1 | backend/src/attempts/attempts.service.spec.ts |

## File Stats

| File | Lines |
|------|-------|
| attempts.service.ts | 96 |
| dto/upsert-answer.dto.ts | 8 |
| dto/skip-section.dto.ts | 13 |
| attempts.service.spec.ts | 149 |

## Test Results

```
Tests: 7 passed, 7 total (0 todo, 0 failing)
Test Suites: 1 passed, 1 total
```

Full test run (`npx jest --testPathPattern attempts`): 7 passed + 5 todo (controller spec unchanged until Plan 04).

## Method Signatures (for Plan 04 / AttemptsController to consume)

```typescript
// AttemptsService public API
getOrCreateAttempt(userId: string, variantId: string): Promise<VariantAttempt & { answers: AttemptAnswer[] }>
upsertAnswer(attemptId: string, taskId: string, userId: string, content: any): Promise<AttemptAnswer>
incrementPlay(attemptId: string, taskId: string, userId: string): Promise<{ playCount: number }>
skipSection(attemptId: string, userId: string, section: ExamSection, skip: boolean): Promise<VariantAttempt & { answers: AttemptAnswer[] }>
submit(attemptId: string, userId: string): Promise<VariantAttempt & { answers: AttemptAnswer[] }>
```

## Error Messages

| Method | Exception | Russian message |
|--------|-----------|-----------------|
| getOrCreateAttempt | NotFoundException | 'Вариант не найден' |
| upsertAnswer | NotFoundException | 'Попытка не найдена' |
| upsertAnswer | BadRequestException | 'Попытка уже завершена' |
| incrementPlay | BadRequestException | 'Лимит воспроизведений достигнут' |
| skipSection | BadRequestException | 'Раздел не может быть пропущен' |
| submit | NotFoundException | 'Попытка не найдена или уже завершена' |

## Deviations from Plan

None — plan executed exactly as written.

All method signatures, error messages, ownership patterns, and test assertions match the plan specification verbatim. The `grep -c "findFirst.*userId"` acceptance criterion from the plan evaluates to 0 because the `where` clause is on a separate line (multi-line formatting), but the ownership check is present and correctly implemented in all 4 mutating methods — confirmed by the passing tests including the IDOR test.

## Threat Mitigations Applied

| Threat ID | Status |
|-----------|--------|
| T-04-02-01 (IDOR) | Mitigated — findFirst({ where: { id, userId } }) in upsertAnswer, incrementPlay, skipSection; submit uses combined status filter |
| T-04-02-02 (play-count bypass) | Mitigated — server-side findUnique reads playCount before upsert |
| T-04-02-03 (double-submit) | Mitigated — submit uses findFirst({ status: 'IN_PROGRESS' }) filter |
| T-04-02-04 (skip non-AI section) | Mitigated — service guard throws BadRequestException for non-WRITING/SPEAKING sections |
| T-04-02-06 (status-machine bypass) | Mitigated — upsertAnswer checks attempt.status !== 'IN_PROGRESS' after ownership check |

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundaries introduced in this plan. All new code is service-layer only; no controller or module wiring added.

## Known Stubs

None — service returns Prisma model data directly; no placeholder values.

## Self-Check: PASSED

- [x] backend/src/attempts/dto/upsert-answer.dto.ts exists
- [x] backend/src/attempts/dto/skip-section.dto.ts exists
- [x] backend/src/attempts/attempts.service.ts exists
- [x] backend/src/attempts/attempts.service.spec.ts modified (7 active tests)
- [x] Commit d87ed9c exists (Task 1 DTOs)
- [x] Commit 99a207c exists (Task 2 service)
- [x] Commit 64131a1 exists (Task 3 spec)
- [x] `npm run build` exits 0
- [x] 7 tests pass, 0 todo, 0 failing
