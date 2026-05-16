---
phase: 04-exam-player
verified: 2026-05-16T00:00:00Z
status: gaps_found
score: 5/6 roadmap success criteria verified
overrides_applied: 0
gaps:
  - truth: "Student can open a variant, answer all task formats (MCQ, MATCHING) with their answer options visible"
    status: failed
    reason: "Backend getPublishedById in variants.service.ts still uses `include: { examTask: true }` (scalar fields only, no nested options relation). The commit aef8101 that changed this to `{ include: { options: true } }` was executed in a worktree but never merged into the main branch — git confirms it is NOT an ancestor of HEAD. MCQ and MATCHING tasks will render 'Варианты не загружены' placeholder for all students."
    artifacts:
      - path: "backend/src/variants/variants.service.ts"
        issue: "getPublishedById method line 34: `include: { examTask: true }` must be `include: { examTask: { include: { options: true } } }` — options relation is NOT loaded"
    missing:
      - "Change `include: { examTask: true }` to `include: { examTask: { include: { options: true } } }` inside the `getPublishedById` method in backend/src/variants/variants.service.ts (one-line fix)"
---

# Phase 4: Exam Player Verification Report

**Phase Goal:** Students can take a complete ЕГЭ English exam attempt — open a variant, answer all 42 tasks (auto-saved), optionally skip Writing/Speaking sections, and submit the exam.
**Verified:** 2026-05-16
**Status:** GAPS FOUND
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Student can start a new attempt and land in the exam player; closing and reopening restores saved answers | VERIFIED | `attemptsService.getOrCreateAttempt` filters by `status: 'IN_PROGRESS'`, returns existing with answers; page.tsx fetches on mount; ExamPlayer initializes answers state from server data |
| 2 | Student sees a numbered navigation grid where cells reflect unanswered/answered/current state in real time | VERIFIED | NavGrid.tsx renders `{index}` (1-based) per task; cell classes driven by `isAnswered`, `isCurrent`, `isSkipped` props; `setCurrentTaskId` wired to `onSelectTask` |
| 3 | Every answer change triggers an auto-save; UI displays Сохранено, spinner during save, failure-with-retry on error | VERIFIED | ExamPlayer.tsx: `scheduleAutoSave` → 1500ms debounce → `performSave` → `attemptsService.upsertAnswer`; `saveState` drives SaveIndicator; `handleRetry` replays `pendingPayloadRef` |
| 4 | Student can skip Writing/Speaking after confirming an explicit prompt; skipped sections excluded from AI grading | VERIFIED | NavGrid skip buttons → `handleToggleSkip` → `setSkipModalState`; `handleSkipConfirm` calls `attemptsService.skipSection`; skipped sections stored in DB via `skippedSections ExamSection[]` column; `unansweredCount` excludes skipped tasks |
| 5 | Each audio track enforces max 2 plays; play count shown and survives reload | VERIFIED | AudioPlayer gates play on `playCount < 2`; `handleIncrementPlay` calls `attemptsService.incrementPlay`; `playCount` stored in `AttemptAnswer.playCount` (DB); answers map re-initialized from server on resume |
| 6 | Student can open submit modal, see unanswered count, confirm to submit | PARTIAL-FAILED | SubmitModal exists with Russian pluralization; `unansweredCount` useMemo computed correctly; `attemptsService.submit` called on confirm; redirect to `/variants/${variantId}/result/${attemptId}` — BUT for MCQ/MATCHING format tasks, answer options are NOT loaded (see gap below), so students cannot answer those tasks before submitting |

**Score:** 5/6 truths verified (1 gap)

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/prisma/schema.prisma` | VariantAttempt.skippedSections ExamSection[] | VERIFIED | Line 279: `skippedSections  ExamSection[]` present |
| `backend/prisma/migrations/*_add_skipped_sections/migration.sql` | ALTER TABLE adds skippedSections column | VERIFIED | `20260515161332_add_skipped_sections/migration.sql` — SQL: `ALTER TABLE "variant_attempts" ADD COLUMN "skippedSections" "ExamSection"[] NOT NULL DEFAULT ARRAY[]::"ExamSection"[]` |
| `backend/src/attempts/dto/upsert-answer.dto.ts` | UpsertAnswerDto with @IsOptional content | VERIFIED | Exists; `@IsOptional() content: any` |
| `backend/src/attempts/dto/skip-section.dto.ts` | SkipSectionDto with @IsEnum(ExamSection) section, @IsBoolean skip | VERIFIED | Exists; correct decorators |
| `backend/src/attempts/attempts.service.ts` | 5 public methods with ownership checks | VERIFIED | All 5 methods: getOrCreateAttempt, upsertAnswer, incrementPlay, skipSection, submit — each does `findFirst({ where: { id, userId } })` ownership check |
| `backend/src/attempts/attempts.controller.ts` | 5 routes with class-level JwtAuthGuard | VERIFIED | `@UseGuards(JwtAuthGuard)` at class level only; 5 route handlers returning `{ success: true, data }` |
| `backend/src/attempts/attempts.module.ts` | AttemptsModule with controller + service | VERIFIED | Exists; no exports |
| `backend/src/app.module.ts` | AttemptsModule registered | VERIFIED | `AttemptsModule` appears twice (import + imports array) |
| `backend/src/attempts/attempts.service.spec.ts` | 7 active tests covering all requirement IDs | VERIFIED | 7 active `it()` blocks; covers ATTEMPT-01, 02, 04, 06, 07, 09, IDOR |
| `backend/src/attempts/attempts.controller.spec.ts` | 5 active tests for DTO + guard | VERIFIED | 5 active `it()` blocks; covers ATTEMPT-04, ATTEMPT-06, Auth bypass |
| `frontend/src/services/attempts.service.ts` | Typed API client with 5 methods | VERIFIED | All 5 methods; typed interfaces; `skippedSections: ExamSection[]` on AttemptWithAnswers |
| `frontend/src/app/variants/[id]/attempt/page.tsx` | Page shell with parallel fetch + loading/error states | VERIFIED | `Promise.all([attemptsService.getOrCreate, variantsService.getById])`; loading and error states rendered |
| `frontend/src/app/variants/[id]/attempt/ExamPlayer/ExamPlayer.tsx` | Container with all state + auto-save + modals | VERIFIED | 234 lines; all state declared; debounce at 1500ms; SkipModal and SubmitModal wired |
| `frontend/src/app/variants/[id]/attempt/ExamPlayer/NavGrid/NavGrid.tsx` | Numbered cells with 3 states + skip buttons | VERIFIED | Renders cells with `{index}`; applies navCellAnswered/navCellCurrent/navCellSkipped; skip buttons for WRITING/SPEAKING only |
| `frontend/src/app/variants/[id]/attempt/ExamPlayer/SaveIndicator/SaveIndicator.tsx` | 4-state save indicator | VERIFIED | Exists; idle=null, saving=spinner+text, saved=check+text, error=warning+retry |
| `frontend/src/app/variants/[id]/attempt/ExamPlayer/TaskView/TaskView.tsx` | Task header + body + answer surface + prev/next | VERIFIED | All elements present; conditional audioUrl rendering; Задание {taskIndex}; ← Назад/Далее →/Завершить → |
| `frontend/src/app/variants/[id]/attempt/ExamPlayer/AnswerInput/AnswerInput.tsx` | Format-conditional input for all 6 formats | VERIFIED | All 6 formats handled (OPEN_CLOZE, WORD_FORMATION, AI_CHECK, TRUE_FALSE, MCQ, MATCHING) with graceful fallback when options absent |
| `frontend/src/app/variants/[id]/attempt/ExamPlayer/AudioPlayer/AudioPlayer.tsx` | 2-play enforced audio player | VERIFIED | `canPlay = playCount < 2 && !disabled`; no `controls` attribute; awaits `onPlay()` before `audioRef.current?.play()` |
| `frontend/src/app/variants/[id]/attempt/ExamPlayer/SkipModal/SkipModal.tsx` | 4-variant skip/unskip confirmation modal | VERIFIED | All 4 combinations (skip/unskip × WRITING/SPEAKING); en-dash in 37–38 and 39–42; overlay click blocked |
| `frontend/src/app/variants/[id]/attempt/ExamPlayer/SubmitModal/SubmitModal.tsx` | Submit confirmation with Russian pluralization | VERIFIED | `pluralZadanij(n)` function correct; body for n=0 and n>0; title `Завершить вариант?` |
| `backend/src/variants/variants.service.ts` (getPublishedById) | Must include task options for MCQ/MATCHING rendering | FAILED | `getPublishedById` uses `include: { examTask: true }` — options relation NOT loaded. The fix commit (aef8101) was executed in an orphaned worktree and is NOT an ancestor of HEAD |
| `frontend/src/services/variants.service.ts` (VariantTaskExamTaskMeta) | Must include options field | VERIFIED | Interface includes `options?: ExamTaskOption[]` — the frontend type was correctly updated but the backend was not |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ExamPlayer.scheduleAutoSave | attemptsService.upsertAnswer | setTimeout 1500ms | WIRED | Line 76: `setTimeout(() => { void performSave(taskId, content) }, 1500)` |
| ExamPlayer.handleIncrementPlay | attemptsService.incrementPlay | immediate async call | WIRED | Line 86: `await attemptsService.incrementPlay(attempt.id, taskId)` |
| ExamPlayer.handleSkipConfirm | attemptsService.skipSection | await on confirm | WIRED | Line 104: `await attemptsService.skipSection(attempt.id, section, skip)` |
| ExamPlayer.handleSubmit | attemptsService.submit | await on confirm | WIRED | Line 117: `await attemptsService.submit(attempt.id)` |
| page.tsx | attemptsService.getOrCreate | useEffect on mount | WIRED | Line 17: `Promise.all([attemptsService.getOrCreate(id), variantsService.getById(id)])` |
| NavGrid onToggleSkip | ExamPlayer.handleToggleSkip | callback prop | WIRED | ExamPlayer line 174: `onToggleSkip={handleToggleSkip}` |
| Submit button + TaskView onNext (isLast) | setSubmitModalOpen(true) | click handler | WIRED | 2 occurrences confirmed (sidebar button + onNext handler) |
| AttemptsController routes | AttemptsService methods | constructor injection | WIRED | 5 handlers each delegate to `this.attemptsService.*` |
| AppModule.imports | AttemptsModule | module registration | WIRED | `grep -c "AttemptsModule" app.module.ts` = 2 |
| getPublishedById | examTask options (ExamTaskOption[]) | Prisma include | NOT WIRED | `include: { examTask: true }` only loads scalar fields — options relation not included |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| ExamPlayer.tsx answers state | `answers[taskId].content` | `attempt.answers` from getOrCreate API | Yes — Prisma `include: { answers: true }` returns real AttemptAnswer rows | FLOWING |
| NavGrid cells (answered state) | `isAnswered(taskId)` | `answers` map in ExamPlayer | Yes — driven by real API data | FLOWING |
| AnswerInput (MCQ options) | `task.options` | `variantTasks.examTask` from `getPublishedById` | NO — `include: { examTask: true }` loads scalar fields only; ExamTaskOption is a relation NOT loaded | DISCONNECTED |
| AudioPlayer playCount | `answers[taskId].playCount` | AttemptAnswer.playCount from server | Yes — upserted by incrementPlay, loaded on resume | FLOWING |
| SubmitModal unansweredCount | `unansweredCount` useMemo | `tasks` + `answers` + `skippedSections` all from server | Yes — computed from real data | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable entry points available without starting servers. Human checkpoint (04-07 Plan Task 3) was developer-approved and covered this verification for functional behaviors.

### Probe Execution

No conventional probe files found (`scripts/*/tests/probe-*.sh`) in this phase. No probes declared in plan frontmatter.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| ATTEMPT-01 | 04-00, 04-02, 04-04, 04-05 | Student can start new attempt | SATISFIED | `getOrCreateAttempt` creates IN_PROGRESS attempt; page navigates to player |
| ATTEMPT-02 | 04-00, 04-02, 04-04, 04-05 | Student can resume interrupted attempt | SATISFIED | `getOrCreate` finds existing IN_PROGRESS; answers loaded from server into ExamPlayer state |
| ATTEMPT-03 | 04-05 | Numbered nav grid with 3 cell states | SATISFIED | NavGrid renders `{index}` per task; navCellAnswered/navCellCurrent/navCellSkipped classes applied |
| ATTEMPT-04 | 04-02, 04-04, 04-06 | Auto-save with visible save state | SATISFIED | 1500ms debounce → upsertAnswer; saveState transitions idle→saving→saved/error; retry wired |
| ATTEMPT-05 | 04-02, 04-04, 04-05, 04-06 | Navigate between tasks without losing saved answers | SATISFIED | answers map keyed by examTaskId; persisted to DB; restored from server on resume |
| ATTEMPT-06 | 04-00, 04-02, 04-04, 04-07 | Skip Writing/Speaking with confirmation | SATISFIED | SkipModal confirmation; handleSkipConfirm → skipSection API; skippedSections updated from response |
| ATTEMPT-07 | 04-02, 04-04, 04-06 | Audio play count max 2, persisted | SATISFIED | AudioPlayer gates on `playCount < 2`; incrementPlay API; playCount stored in AttemptAnswer |
| ATTEMPT-08 | 04-07 | Submit modal with unanswered count | SATISFIED | SubmitModal with `pluralZadanij(unansweredCount)`; count excludes skipped sections |
| ATTEMPT-09 | 04-02, 04-04, 04-07 | Submit attempt triggers grading | PARTIAL — submit API call works (status→SUBMITTED, endedAt set); MCQ/MATCHING answers may not have been captured due to missing options in payload |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/src/variants/variants.service.ts` | 34 | `include: { examTask: true }` — options relation missing from getPublishedById | BLOCKER | MCQ and MATCHING answer options not delivered to student frontend; AnswerInput renders "Варианты не загружены" placeholder for those formats |

### Human Verification Required

None beyond the developer-approved checkpoint (Task 3 of Plan 07). The checkpoint was marked APPROVED by the developer.

However, the blocking gap (missing options in backend payload) was apparently NOT observed during the checkpoint — the checkpoint steps 7–9 describe typing a text answer (textarea format), which works correctly. MCQ/MATCHING format testing would have revealed the gap.

### Gaps Summary

**Single root-cause blocker:** The backend `getPublishedById` method in `backend/src/variants/variants.service.ts` does not include the `options` relation when fetching a variant for student use. This means:

1. MCQ tasks render "Варианты не загружены" — students cannot select an answer option
2. MATCHING tasks render with no prompt-to-option pairs — selection impossible
3. This was fixed in worktree commit `aef8101` but that commit is NOT an ancestor of HEAD (git confirmed). The merge commit `c6f3a28` included all frontend files and the SUMMARY.md but missed the backend file change.

**Fix:** One-line change in `backend/src/variants/variants.service.ts` `getPublishedById`:
```
include: { examTask: { include: { options: true } } }
```
This is the exact change in the orphaned commit. No migration required. Phase 3 tests will not break (they use `toMatchObject` not strict shape assertions per 04-06 plan documentation).

All other phase deliverables are fully implemented, correctly wired, and verified.

---

_Verified: 2026-05-16_
_Verifier: Claude (gsd-verifier)_
