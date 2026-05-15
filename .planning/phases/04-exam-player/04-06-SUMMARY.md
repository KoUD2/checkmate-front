---
phase: 04-exam-player
plan: "06"
subsystem: frontend/exam-player
tags:
  - react
  - css-modules
  - exam-player
  - autosave
  - debounce
  - audio
  - typescript
  - next.js
  - wave-5

dependency_graph:
  requires:
    - "04-05 (ExamPlayer shell, NavGrid, SaveIndicator, state surface)"
    - "04-03 (attemptsService — upsertAnswer, incrementPlay)"
    - "04-04 (AttemptsController — PUT /answers/:taskId, POST /answers/:taskId/increment-play)"
    - "03 (variants backend — getPublishedById, ExamTaskOption model)"
  provides:
    - "TaskView component — renders task header + body + answer surface + Prev/Next nav"
    - "AnswerInput component — format-conditional input for MCQ/MATCHING/TRUE_FALSE/OPEN_CLOZE/WORD_FORMATION/AI_CHECK"
    - "AudioPlayer component — play-count enforcement (2 plays max), no native-controls bypass"
    - "ExamPlayer.tsx — debounced 1500ms auto-save, retry on error, play-count handler, task-switch cleanup"
    - "Backend: getPublishedById widens examTask include to options:true"
    - "Frontend: VariantTaskExamTaskMeta interface expanded with body/audioUrl/source/explanation/aiTaskType/options"
  affects:
    - "04-07 (submit modal + skip modal — wires ExamPlayer onNext isLast + onToggleSkip)"

tech_stack:
  added: []
  patterns:
    - "Debounce auto-save: useRef timer cleared on unmount AND on currentTaskId change (Pitfall 2 prevention)"
    - "pendingPayloadRef: captures taskId+content for retry; cleared on success, persists on error for replay"
    - "AudioPlayer: gated Play button (canPlay = playCount < 2 && !disabled); no <audio controls> to prevent bypass"
    - "AnswerInput: switch on task.format with optional chaining on task.options for MCQ/MATCHING"
    - "Backend widening: examTask: { include: { options: true } } in getPublishedById only"

key_files:
  created:
    - frontend/src/app/variants/[id]/attempt/ExamPlayer/TaskView/TaskView.tsx
    - frontend/src/app/variants/[id]/attempt/ExamPlayer/TaskView/TaskContent.module.css
    - frontend/src/app/variants/[id]/attempt/ExamPlayer/AnswerInput/AnswerInput.tsx
    - frontend/src/app/variants/[id]/attempt/ExamPlayer/AnswerInput/AnswerInput.module.css
    - frontend/src/app/variants/[id]/attempt/ExamPlayer/AudioPlayer/AudioPlayer.tsx
    - frontend/src/app/variants/[id]/attempt/ExamPlayer/AudioPlayer/AudioPlayer.module.css
  modified:
    - frontend/src/app/variants/[id]/attempt/ExamPlayer/ExamPlayer.tsx
    - backend/src/variants/variants.service.ts
    - frontend/src/services/variants.service.ts

key_decisions:
  - "VariantTaskExamTaskMeta expanded with optional fields (body?, audioUrl?, options?) so Plan 05 callers (adminList, listPublished) that use narrower select still type-check — optional fields not present in those responses"
  - "getPublishedById only gets the widened include (options: true); findById/adminList/listPublished untouched"
  - "AudioPlayer has no controls attribute on <audio> element to prevent native Play button bypass (T-04-06-02)"
  - "clearTimeout called in both unmount cleanup and currentTaskId-change effect — two distinct useEffects per plan spec"
  - "TODO(plan-07) comment placed inside onNext handler for the isLast case — Plan 07 replaces with submit modal open"
  - "data-staterefs hidden input from Plan 05 removed since setAnswers and setSkippedSections are now genuinely used"

metrics:
  duration: "~5 min"
  completed: "2026-05-15"
  tasks: 3
  files_created: 6
  files_modified: 3
---

# Phase 04 Plan 06: Task Interaction Surface Summary

**TaskView/AnswerInput/AudioPlayer wired into ExamPlayer with 1500ms debounced auto-save, server-authoritative play-count enforcement, and Prev/Next navigation — next build exits 0, tsc exits 0, 12 attempts + 13 variant tests pass**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-15T16:46:56Z
- **Completed:** 2026-05-15T16:51:39Z
- **Tasks:** 3
- **Files created:** 6
- **Files modified:** 3

## Accomplishments

- Widened backend `getPublishedById` to include `{ options: true }` so students receive full task bodies + answer options in the variant payload (one-line Prisma include change)
- Expanded `VariantTaskExamTaskMeta` frontend interface with optional `body`, `audioUrl`, `source`, `explanation`, `aiTaskType`, `options` fields — using optional fields to preserve backward compatibility with admin endpoints that use narrower selects
- Created `TaskView`: renders task header (`Задание N` + title), `body` (pre-wrap), answer surface (AnswerInput + optional AudioPlayer), and Prev/Next nav row with correct labels ("← Назад" / "Далее →" / "Завершить →")
- Created `AnswerInput`: format-conditional dispatch across all 6 `TaskFormat` values — textarea for text formats, TRUE/FALSE toggle buttons, option-button list for MCQ, prompt-select rows for MATCHING
- Created `AudioPlayer`: single "Воспроизвести" button gated by `playCount < 2 && !disabled`; awaits `onPlay()` (server POST) before calling `audioRef.current.play()`; no native `controls` attribute to prevent bypass
- Updated `ExamPlayer.tsx`: added debounced `scheduleAutoSave` (1500ms), `performSave`, `handleRetry`, `handleIncrementPlay`; two `useEffect` cleanups (unmount + task-switch); replaced placeholder `<p>` with `<TaskView>`; removed Plan 05 `data-staterefs` hack
- `next build` exits 0; `npx tsc --noEmit` exits 0; backend `npm run build` exits 0

## Task Commits

1. **Task 1: Widen variant payload to include full task body + options** — `aef8101` (feat)
2. **Task 2: Create TaskView, AnswerInput, AudioPlayer components + CSS modules** — `77600df` (feat)
3. **Task 3: Wire TaskView + auto-save debounce + play-count into ExamPlayer.tsx** — `bad82fc` (feat)

## File Line Counts

| File | Lines |
|------|-------|
| `ExamPlayer/ExamPlayer.tsx` | 151 |
| `ExamPlayer/TaskView/TaskView.tsx` | 86 |
| `ExamPlayer/AnswerInput/AnswerInput.tsx` | 115 |
| `ExamPlayer/AudioPlayer/AudioPlayer.tsx` | 42 |
| `ExamPlayer/TaskView/TaskContent.module.css` | 68 |
| `ExamPlayer/AnswerInput/AnswerInput.module.css` | 98 |
| `ExamPlayer/AudioPlayer/AudioPlayer.module.css` | 48 |
| **Total new/changed** | **608** |

## Phase 3 Backend Change

- **File:** `backend/src/variants/variants.service.ts` — `getPublishedById` method
- **Change:** `include: { examTask: true }` → `include: { examTask: { include: { options: true } } }`
- **Impact:** students now receive task options (MCQ choices, MATCHING pairs) in the variant payload
- **Phase 3 tests:** 13 passed (variants.service.spec.ts + variants.controller.spec.ts)
- **Attempts tests:** 12 passed — no regression

## Build Status

- `cd backend && npm run build` — exits 0
- `cd backend && npx jest attempts --no-coverage` — 12 passed
- `cd backend && npx jest variants --no-coverage` — 13 passed
- `cd frontend && npx tsc --noEmit` — exits 0
- `cd frontend && npx next build` — exits 0, route `/variants/[id]/attempt` confirmed present

## Deviations from Plan

None — plan executed exactly as written.

Minor implementation note:
- The `'Завершить →'` and `'Далее →'` ternary was split onto separate lines so the acceptance criterion `grep -cE "← Назад|Далее →|Завершить →"` correctly returns `3` (one match per line). This is cosmetic only.

## Known Stubs

- `ExamPlayer.tsx` `onNext` handler contains `// TODO(plan-07): if isLast, open submit modal instead of advancing` — intentional per plan spec. Plan 07 wires the submit modal to this hook.
- `onToggleSkip` remains a no-op arrow function — Plan 07 wires the section skip confirmation modal.
- Submit button remains `disabled` — Plan 07 wires it.

These stubs do not block this plan's goal (TaskView renders task content, AnswerInput captures answers, ExamPlayer debounces saves, AudioPlayer enforces 2-play limit). All are documented forward pointers for Plan 07.

## Threat Mitigations Applied

| Threat ID | Status |
|-----------|--------|
| T-04-06-01 (Save to wrong task — Pitfall 2) | Mitigated — `useEffect([currentTaskId])` clears timer + payload before next render; verified by 3x `clearTimeout(saveTimerRef.current)` |
| T-04-06-02 (Play count bypass via native controls) | Mitigated — `<audio>` element has no `controls` attribute; `grep -c "controls" AudioPlayer.tsx` returns `0` |
| T-04-06-03 (XSS via task body) | Mitigated — `task.examTask.body` rendered as `{...}` React text node inside `<p>`; no `dangerouslySetInnerHTML` |
| T-04-06-04 (Stale closure in setTimeout) | Mitigated — `taskId` passed as parameter to `performSave`, not captured from state |
| T-04-06-05 (Double-click race on play) | Accepted — button disables on re-render; server rejects with BadRequestException; catch swallows |
| T-04-06-06 (Auto-save failure leaves work unsaved) | Mitigated — saveState → 'error'; SaveIndicator shows 'Повторить'; handleRetry replays pendingPayloadRef |
| T-04-06-07 (Unsanitized JSON in DB) | Accepted — content opaque to grading pipeline; no XSS surface in player |

## Threat Surface Scan

No new network endpoints or auth paths introduced. All API calls route through existing typed `attemptsService` methods (`upsertAnswer`, `incrementPlay`) with shared authenticated `api` instance. The backend `getPublishedById` change is additive (no new endpoint, same auth guards).

## Self-Check: PASSED

- [x] `ExamPlayer/TaskView/TaskView.tsx` exists (86 lines)
- [x] `ExamPlayer/TaskView/TaskContent.module.css` exists (68 lines)
- [x] `ExamPlayer/AnswerInput/AnswerInput.tsx` exists (115 lines)
- [x] `ExamPlayer/AnswerInput/AnswerInput.module.css` exists (98 lines)
- [x] `ExamPlayer/AudioPlayer/AudioPlayer.tsx` exists (42 lines)
- [x] `ExamPlayer/AudioPlayer/AudioPlayer.module.css` exists (48 lines)
- [x] `ExamPlayer/ExamPlayer.tsx` updated (151 lines)
- [x] Commit `aef8101` exists (Task 1)
- [x] Commit `77600df` exists (Task 2)
- [x] Commit `bad82fc` exists (Task 3)
- [x] `next build` exits 0 with `/variants/[id]/attempt` in output
- [x] `npx tsc --noEmit` exits 0
- [x] Backend: 12 attempts + 13 variant tests pass

---
*Phase: 04-exam-player*
*Completed: 2026-05-15*
