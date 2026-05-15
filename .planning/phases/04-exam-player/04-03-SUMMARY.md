---
phase: 04-exam-player
plan: "03"
subsystem: frontend/api-client
tags:
  - typescript
  - axios
  - attempts
  - api-client
  - frontend
  - wave-2

dependency_graph:
  requires:
    - "04-01 (skippedSections ExamSection[] column on VariantAttempt)"
    - "04-02 (AttemptsService backend — 5 endpoint methods)"
    - "02-04 (exam-tasks.service.ts — ExamSection type definition)"
    - "03-04 (variants.service.ts — ExamSection re-export pattern)"
  provides:
    - "attemptsService default export with getOrCreate, upsertAnswer, incrementPlay, skipSection, submit"
    - "AttemptWithAnswers interface including skippedSections: ExamSection[]"
    - "AttemptAnswer interface with content: unknown (strict-mode safe)"
    - "AttemptStatus type union"
    - "SaveState type union (consumed by SaveIndicator in Plan 05)"
    - "ExamSection re-export from exam-tasks.service"
  affects:
    - "04-05 (ExamPlayerPage — consumes attemptsService.getOrCreate)"
    - "04-06 (SaveIndicator — consumes SaveState type)"
    - "04-07 (SubmitButton — consumes attemptsService.submit)"

tech_stack:
  added: []
  patterns:
    - "Service object pattern: const service = { async method() {} }; export default service"
    - "Response unwrap: api.get<{ data: T }>(...) then return res.data.data"
    - "ExamSection re-export pattern: export type { ExamSection } from './exam-tasks.service'"
    - "Strict mode: content: unknown not content: any"

key_files:
  created:
    - frontend/src/services/attempts.service.ts
    - frontend/src/services/exam-tasks.service.ts
    - frontend/src/services/variants.service.ts
  modified: []

key_decisions:
  - "exam-tasks.service.ts and variants.service.ts created in worktree (Rule 3 — blocking dependency: files exist on master but not in this worktree's HEAD; required for tsc --noEmit to pass)"
  - "content field typed as unknown not any — strict mode requires unknown for untyped JSON"
  - "All 5 HTTP methods use generic api.method<{ data: T }>() so TypeScript infers the response shape at call site"

patterns-established:
  - "Typed service object pattern with { data: T } envelope unwrap"
  - "Re-export ExamSection from exam-tasks.service for downstream component single-import point"

requirements-completed:
  - ATTEMPT-01
  - ATTEMPT-02
  - ATTEMPT-04
  - ATTEMPT-05
  - ATTEMPT-06
  - ATTEMPT-07
  - ATTEMPT-09

duration: 8min
completed: "2026-05-15"
---

# Phase 04 Plan 03: Attempts API Client Summary

**Typed frontend attemptsService with 5 endpoint methods and AttemptWithAnswers/AttemptAnswer/AttemptStatus/SaveState interfaces — strict-mode TypeScript, zero :any, tsc --noEmit exits 0**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-15T00:00:00Z
- **Completed:** 2026-05-15T00:08:00Z
- **Tasks:** 1
- **Files created:** 3 (attempts.service.ts + 2 blocking dependencies)

## Accomplishments

- Created `frontend/src/services/attempts.service.ts` (62 lines) with 5 typed async methods
- All 4 named type exports present: AttemptStatus, SaveState, AttemptAnswer, AttemptWithAnswers
- ExamSection re-exported from exam-tasks.service for downstream component imports
- TypeScript strict mode: no `:any`, `content: unknown`, `aiFeedback: unknown | null`
- All 18 acceptance criteria pass

## Task Commits

1. **Task 1: Create attempts.service.ts with 5 endpoint methods and typed interfaces** - `9de9793` (feat)

## Method Signature Surface (for Plans 05-07)

```typescript
import attemptsService from '@/services/attempts.service'
import type { AttemptWithAnswers, AttemptAnswer, AttemptStatus, SaveState, ExamSection } from '@/services/attempts.service'

// 5 methods:
attemptsService.getOrCreate(variantId: string): Promise<AttemptWithAnswers>
  // GET /attempts/by-variant/{variantId}

attemptsService.upsertAnswer(attemptId: string, taskId: string, content: unknown): Promise<AttemptAnswer>
  // PUT /attempts/{attemptId}/answers/{taskId}  body: { content }

attemptsService.incrementPlay(attemptId: string, taskId: string): Promise<{ playCount: number }>
  // POST /attempts/{attemptId}/answers/{taskId}/increment-play

attemptsService.skipSection(attemptId: string, section: ExamSection, skip: boolean): Promise<AttemptWithAnswers>
  // PATCH /attempts/{attemptId}/skip-section  body: { section, skip }

attemptsService.submit(attemptId: string): Promise<AttemptWithAnswers>
  // POST /attempts/{attemptId}/submit
```

## Named Exports (for Plans 05-07 to import)

```typescript
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'FAILED'
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'
export interface AttemptAnswer { id, variantAttemptId, examTaskId, content: unknown, playCount, aiScore, aiFeedback, createdAt, updatedAt }
export interface AttemptWithAnswers { id, userId, variantId, status: AttemptStatus, startedAt, endedAt, updatedAt, skippedSections: ExamSection[], answers: AttemptAnswer[] }
export type { ExamSection } from './exam-tasks.service'
export default attemptsService
```

## Files Created/Modified

- `frontend/src/services/attempts.service.ts` — 62 lines; typed API client; default export attemptsService
- `frontend/src/services/exam-tasks.service.ts` — 98 lines; source of ExamSection type; brought into worktree (Rule 3)
- `frontend/src/services/variants.service.ts` — 90 lines; brought into worktree (Rule 3) for consistent service directory

## Decisions Made

- Typed `content` as `unknown` (not `any`) — frontend tsconfig has `strict: true`, and the AttemptAnswer.content is a JSON blob whose shape varies by task type; consumers narrow the type as needed
- All 5 HTTP verb methods use generic parameter `api.method<{ data: T }>()` so TypeScript infers the unwrapped response at call site without casting
- `exam-tasks.service.ts` and `variants.service.ts` included in the commit because the worktree was branched before those files were committed on master — blocking dependency (Rule 3)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created exam-tasks.service.ts and variants.service.ts in worktree**
- **Found during:** Task 1 (attempts.service.ts creation)
- **Issue:** attempts.service.ts imports `ExamSection` from `./exam-tasks.service`, but that file does not exist in this worktree's HEAD (it was committed to master after this worktree branch was cut from commit 40b96ec). TypeScript compilation would fail without it.
- **Fix:** Created `exam-tasks.service.ts` and `variants.service.ts` in the worktree using the exact content from master. These are not new code — they are pre-existing files that the worktree was missing.
- **Files modified:** frontend/src/services/exam-tasks.service.ts, frontend/src/services/variants.service.ts
- **Verification:** `tsc --noEmit` exits 0 with attempts.service.ts present
- **Committed in:** 9de9793 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking)
**Impact on plan:** Required to unblock TypeScript compilation. Files are identical to master versions — no functional change.

## Issues Encountered

- Worktree did not have node_modules installed; TypeScript was verified via the main repo's `frontend/node_modules/.bin/tsc` after temporarily copying the file.

## Threat Mitigations Applied

| Threat ID | Status |
|-----------|--------|
| T-04-03-01 (Untyped response) | Mitigated — api.get<{ data: AttemptWithAnswers }>() generics enforce typed unwrap; content: unknown prevents accidental property access |
| T-04-03-02 (Logging) | Accepted — service does not log; api.ts does not log responses |
| T-04-03-03 (Auth bypass) | Mitigated — all calls routed through shared api instance with cookie token + 401 auto-refresh |

## Known Stubs

None — service is a thin RPC layer; no placeholder or hardcoded values.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. This is a frontend-only service file with no side effects at module load time.

## Next Phase Readiness

- Plans 05-07 can import `attemptsService` and all type exports from `@/services/attempts.service`
- `AttemptWithAnswers.skippedSections: ExamSection[]` is present and typed — Plan 05 ExamPlayerPage can use it for section skipping UI
- `SaveState` type is available for Plan 05 SaveIndicator component

## Self-Check: PASSED

- [x] frontend/src/services/attempts.service.ts exists (62 lines)
- [x] frontend/src/services/exam-tasks.service.ts exists (Rule 3 dependency)
- [x] frontend/src/services/variants.service.ts exists (Rule 3 dependency)
- [x] Commit 9de9793 exists
- [x] `grep -c "export default attemptsService"` returns 1
- [x] `grep -cE "async (getOrCreate|upsertAnswer|incrementPlay|skipSection|submit)"` returns 5
- [x] `grep -c ": any"` returns 0 (strict mode compliant)
- [x] tsc --noEmit exits 0

---
*Phase: 04-exam-player*
*Completed: 2026-05-15*
