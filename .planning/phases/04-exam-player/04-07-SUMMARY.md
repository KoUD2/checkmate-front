---
phase: 04-exam-player
plan: "07"
subsystem: frontend/exam-player
tags:
  - react
  - css-modules
  - exam-player
  - modals
  - skip-section
  - submit
  - typescript
  - next.js
  - wave-6
  - checkpoint

dependency_graph:
  requires:
    - "04-06 (ExamPlayer with TaskView, AnswerInput, AudioPlayer, auto-save)"
    - "04-03 (attemptsService — skipSection, submit)"
    - "04-04 (AttemptsController — PATCH skip-section, POST submit)"
  provides:
    - "SkipModal component — skip/unskip confirmation for WRITING or SPEAKING section"
    - "SubmitModal component — submit confirmation with unanswered count + Russian pluralization"
    - "ExamPlayer.tsx — fully wired: handleToggleSkip, handleSkipConfirm, handleSubmit, unansweredCount"
  affects:
    - "Phase 5 result page (receives redirect from handleSubmit)"

tech_stack:
  added: []
  patterns:
    - "Cross-module CSS import: both modals import AdminTaskBank.module.css directly (Assumption A3 confirmed)"
    - "submitting guard: prevents double-submit during in-flight POST"
    - "unansweredCount useMemo: excludes skipped sections, counts non-empty answers"
    - "handleSkipConfirm: try/catch/finally clears skipModalState regardless of success/failure"

key_files:
  created:
    - frontend/src/app/variants/[id]/attempt/ExamPlayer/SkipModal/SkipModal.tsx
    - frontend/src/app/variants/[id]/attempt/ExamPlayer/SubmitModal/SubmitModal.tsx
  modified:
    - frontend/src/app/variants/[id]/attempt/ExamPlayer/ExamPlayer.tsx

key_decisions:
  - "Cross-module CSS import (AdminTaskBank.module.css) succeeded in next build — no local Modal.module.css fallback needed"
  - "SkipModal does not close on overlay click — skip is a consequential action requiring explicit Cancel or Confirm"
  - "handleSkipConfirm uses finally block to clear skipModalState ensuring modal always closes even on API error"
  - "unansweredCount excludes tasks whose section is in skippedSections, matching UI-SPEC §10 spec"
  - "submitting flag prevents double-submit; only resets on error (success navigates away)"

metrics:
  duration: "~25 min"
  completed: "2026-05-16"
  tasks: 3
  files_created: 2
  files_modified: 1
---

# Phase 04 Plan 07: SkipModal + SubmitModal + ExamPlayer Wiring Summary

**SkipModal and SubmitModal created with verbatim UI-SPEC §9/§10 copy; wired into ExamPlayer with skip/submit handlers calling the API; developer-approved human-verify checkpoint; Phase 4 exam player complete**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-05-16
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify — APPROVED)
- **Files created:** 2
- **Files modified:** 1

## Accomplishments

- Created `SkipModal.tsx`: renders four copy variants (skip/unskip × WRITING/SPEAKING) with exact UI-SPEC §9 strings; en-dash character U+2013 used in "37–38" and "39–42"; overlay click does NOT close modal; uses `.btn_primary_dark` for Confirm, `.btn_secondary` for Cancel
- Created `SubmitModal.tsx`: `pluralZadanij(n)` implements correct Russian pluralization for "задание/задания/заданий"; renders unanswered count or "Все задания отвечены" when count is 0; same overlay/modal structure
- Both modals import `AdminTaskBank.module.css` via cross-module import — no fallback needed, next build passes cleanly
- Updated `ExamPlayer.tsx` with 6 additive changes:
  - `useRouter` + three new state declarations (`skipModalState`, `submitModalOpen`, `submitting`)
  - `handleToggleSkip` callback: rejects non-WRITING/SPEAKING sections, opens SkipModal with correct action
  - `handleSkipConfirm` callback: calls `attemptsService.skipSection`, updates `skippedSections` from response, clears modal in `finally`
  - `handleSubmit` callback: guards double-submit, calls `attemptsService.submit`, redirects to `/variants/${variantId}/result/${attemptId}`
  - `unansweredCount` useMemo: excludes skipped sections, counts tasks with null/empty content
  - Sidebar Submit button: `disabled={submitting}` only, `onClick={() => setSubmitModalOpen(true)}`
  - TaskView `onNext`: opens submit modal when `isLast`, removes `TODO(plan-07)` comment

## Task Commits

1. **Task 1: Create SkipModal and SubmitModal components** — `3c53bbc` (feat)
2. **Task 2: Wire SkipModal + SubmitModal into ExamPlayer** — `e75add2` (feat)
3. **Task 3: Human-verify the full Phase 4 exam-player flow** — APPROVED (no code commit; checkpoint gate)

## File Line Counts

| File | Lines |
|------|-------|
| `ExamPlayer/SkipModal/SkipModal.tsx` | 40 |
| `ExamPlayer/SubmitModal/SubmitModal.tsx` | 42 |
| `ExamPlayer/ExamPlayer.tsx` | 233 (was 151) |
| **Total new/changed** | **315** |

## Build Status

- `cd frontend && npx tsc --noEmit` — exits 0
- `cd frontend && npx next build` — exits 0, route `/variants/[id]/attempt` confirmed present
- `cd backend && npx jest --testPathPattern attempts --no-coverage` — 12 passed, 0 todo

## CSS Strategy

**Cross-module import succeeded.** Both modals import `@/app/admin/task-bank/AdminTaskBank.module.css` directly. The Next.js build (Turbopack) resolves the cross-module import cleanly — no local `Modal.module.css` fallback was needed. Assumption A3 from RESEARCH.md is confirmed valid.

## Checkpoint: Human-Verify (Task 3)

**STATUS: APPROVED** — Developer verified the full Phase 4 exam-player flow and returned `"approved"`.

Key verification steps completed:
- Steps 13–14: Skip Writing → modal copy → cells gray out → Вернуть раздел — confirmed
- Steps 15–16: Submit modal from sidebar + last task Next button — confirmed
- Steps 17–18: Cancel and Confirm submit (redirects to result page placeholder, 404 expected) — confirmed
- Step 22: Build + test suite remains green — confirmed

Note: A DB contamination issue with a `TEACHER` enum value was discovered and fixed during the checkpoint. This was unrelated to plan 07's changes and was resolved prior to approval.

## Deviations from Plan

None — plan executed exactly as written.

Implementation notes:
- The `handleSubmit` useCallback dependency array includes `attempt.variantId` (available on `AttemptWithAnswers` via the interface). Confirmed `variantId` is present in the `AttemptWithAnswers` interface.
- The `unansweredCount` check for objects uses `typeof a === 'object' && a !== null && !Array.isArray(a) && Object.keys(a as object).length === 0` to handle edge cases with object-type answers (MATCHING format).

## Known Stubs

None introduced in this plan. The submit redirect target `/variants/${variantId}/result/${attemptId}` is a Phase 5 placeholder — the 404 response on that route is expected and intentional per plan spec.

## Threat Mitigations Applied

| Threat ID | Status |
|-----------|--------|
| T-04-07-01 (Double-submit race) | Mitigated — `submitting` state gates handleSubmit; early return if already submitting |
| T-04-07-02 (Skip section bypass — non-WRITING/SPEAKING) | Mitigated — handleToggleSkip returns early if section is not WRITING or SPEAKING |
| T-04-07-03 (XSS via section/action props) | Mitigated — TypeScript string literal types constrain all values; no dangerouslySetInnerHTML |
| T-04-07-04 (Cross-module CSS leakage) | Accepted — CSS Modules generate scoped class names; confirmed no leakage in build |
| T-04-07-05 (Submit redirect to attacker-controlled URL) | Mitigated — URL built from API response UUIDs (attempt.variantId, attempt.id), not user input |
| T-04-07-06 (Unanswered count manipulation) | Accepted — count is purely informational; submit endpoint accepts any attempt |

## Threat Surface Scan

No new network endpoints or auth paths introduced. The two new API calls (`skipSection`, `submit`) were already defined in `attemptsService` and covered by backend IDOR/auth mitigations from Plans 02+04. The client-side `router.push` redirect does not introduce a new auth surface.

## Self-Check: PASSED

- [x] `ExamPlayer/SkipModal/SkipModal.tsx` exists (40 lines)
- [x] `ExamPlayer/SubmitModal/SubmitModal.tsx` exists (42 lines)
- [x] `ExamPlayer/ExamPlayer.tsx` updated (233 lines)
- [x] Commit `3c53bbc` exists (Task 1)
- [x] Commit `e75add2` exists (Task 2)
- [x] `next build` exits 0
- [x] `npx tsc --noEmit` exits 0
- [x] Backend: 12 attempts tests pass
- [x] Human-verify checkpoint: APPROVED by developer

---
*Phase: 04-exam-player*
*Completed: 2026-05-16*
