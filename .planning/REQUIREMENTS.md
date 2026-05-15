# Requirements: CheckMate — ЕГЭ Variants

**Defined:** 2026-05-14
**Core Value:** Students can practice a full ЕГЭ English exam from start to result — with instant scoring and AI feedback — exactly as they would on the real exam day.

## v1 Requirements

### Task Bank

- [x] **TASK-01**: Admin can create exam tasks in 5 auto-graded formats: MCQ, Matching, True/False, Open Cloze, Word Formation
- [x] **TASK-02**: Admin can create AI-check tasks linked to existing task types (37/38/39/40/41/42)
- [x] **TASK-03**: Admin can upload an audio file (MP3, max 15 MB) to a listening task via browser-direct upload to Yandex Object Storage using a presigned URL
- [x] **TASK-04**: Admin can edit and delete exam tasks; system warns if the task is used in any published variant
- [x] **TASK-05**: Admin can tag tasks with a source label (e.g., "ФИПИ 2024", "собственное")
- [x] **TASK-06**: Admin can browse and filter the task bank by section, format, and source

### Variant Management

- [x] **VARIANT-01**: Admin can create a variant with a title and optional description
- [x] **VARIANT-02**: Admin can add tasks from the bank to a variant and reorder them via drag-and-drop
- [x] **VARIANT-03**: Admin can publish and unpublish variants (published variants become visible to students)
- [x] **VARIANT-04**: Student can browse a catalog of published variants with name, section breakdown, and task count
- [x] **VARIANT-05**: Student can view a variant preview page showing sections, task count per section, and check cost before starting

### Attempt Flow

- [ ] **ATTEMPT-01**: Student can start a new attempt for a variant (creates a VariantAttempt record, redirects to exam player)
- [ ] **ATTEMPT-02**: Student can resume an interrupted in-progress attempt from the variant preview page
- [ ] **ATTEMPT-03**: Student sees a task navigation grid with numbered cells in three states: unanswered, answered, current
- [ ] **ATTEMPT-04**: Student's answers are auto-saved to the server after each change, with visible save state ("Сохранено", spinner, failure + retry)
- [ ] **ATTEMPT-05**: Student can navigate between tasks in any order without losing saved answers
- [ ] **ATTEMPT-06**: Student can skip the writing section (37–38) and the speaking section (39–42) with an explicit confirmation step
- [ ] **ATTEMPT-07**: Each audio track in the listening section can be played a maximum of 2 times; play count is displayed and persisted in attempt state across reloads
- [ ] **ATTEMPT-08**: Student sees a confirm-submit modal that shows the number of unanswered tasks before finalizing
- [ ] **ATTEMPT-09**: Student can submit the attempt to trigger grading

### Grading & Scoring

- [ ] **SCORE-01**: Tasks 1–36 are auto-checked against answer keys immediately on submit; score is available in the HTTP response
- [ ] **SCORE-02**: AI-graded tasks 37–42 are sent for grading via GeminiService (same pipeline as existing TasksService)
- [ ] **SCORE-03**: Checks for AI tasks are deducted atomically at submit using a single Prisma transaction with an optimistic concurrency lock (prevents race conditions and double-charges)
- [ ] **SCORE-04**: Primary scores are calculated per section and converted to a ФИПИ 2024 scaled score using the lookup table constant
- [ ] **SCORE-05**: Attempt status progresses: IN_PROGRESS → SUBMITTED (1–36 scored, AI pending) → COMPLETED (all scored) or FAILED (AI error with retry)

### Results Page

- [ ] **RESULT-01**: Student sees their primary score and ФИПИ 2024 scaled score prominently above the fold on the result page
- [ ] **RESULT-02**: Student sees a per-section score breakdown (Аудирование, Чтение, Грамматика и лексика, Письмо, Говорение)
- [ ] **RESULT-03**: Student sees a per-task breakdown for tasks 1–36: their answer, the correct answer, color-coded pass/fail
- [ ] **RESULT-04**: Student sees AI criterion scores and feedback text for each of tasks 37–42 in expandable detail rows
- [ ] **RESULT-05**: Result page shows "AI проверяет..." indicator for pending tasks 37–42 and auto-updates to full result when AI grading completes (polling, no manual refresh)
- [ ] **RESULT-06**: Student can view their attempt history list (date, variant name, scaled score) with navigation to each result page

### Monetization

- [ ] **MONO-01**: If a student has insufficient checks when submitting tasks 37–42, they see an upsell modal ("Нужен чек → купить / пригласить друга") instead of AI submission
- [ ] **MONO-02**: Backend verifies check balance before deducting at submit; returns a clear error if balance is insufficient

## v2 Requirements

### Timer

- **TIMER-01**: Student can optionally enable a countdown timer matching real ЕГЭ duration

### Practice Mode

- **PRAC-01**: Student can practice individual task formats outside of a full variant

### AI Content Generation

- **AIGEN-01**: Admin can generate new exam tasks using AI given a topic and format

### Analytics

- **ANALY-01**: Student can view score trends over multiple attempts on the same variant
- **ANALY-02**: Student sees a weak-section highlight (lowest-scoring section across all attempts)

### Public Task Bank

- **BANK-01**: Student can browse and practice from a public task bank without creating a full attempt

## Out of Scope

| Feature | Reason |
|---------|--------|
| Timer mode | Deferred to next milestone — UX complexity, not blocking core exam flow |
| Per-task trainer / practice mode | Separate product surface — deferred |
| AI-generated tasks | Deferred — requires separate AI spec and quality gates |
| Public student task bank | Separate product surface — deferred |
| Score trend charts / analytics | Deferred — needs attempt history volume first |
| PDF export / certificate | Deferred — low value until user base is established |
| Share / print result page | Deferred — trivial to add after core result page ships |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TASK-01 | Phase 2 | Complete |
| TASK-02 | Phase 2 | Complete |
| TASK-03 | Phase 2 | Complete |
| TASK-04 | Phase 2 | Complete |
| TASK-05 | Phase 2 | Complete |
| TASK-06 | Phase 2 | Complete |
| VARIANT-01 | Phase 3 | Complete |
| VARIANT-02 | Phase 3 | Complete |
| VARIANT-03 | Phase 3 | Complete |
| VARIANT-04 | Phase 3 | Complete |
| VARIANT-05 | Phase 3 | Complete |
| ATTEMPT-01 | Phase 4 | Pending |
| ATTEMPT-02 | Phase 4 | Pending |
| ATTEMPT-03 | Phase 4 | Pending |
| ATTEMPT-04 | Phase 4 | Pending |
| ATTEMPT-05 | Phase 4 | Pending |
| ATTEMPT-06 | Phase 4 | Pending |
| ATTEMPT-07 | Phase 4 | Pending |
| ATTEMPT-08 | Phase 4 | Pending |
| ATTEMPT-09 | Phase 4 | Pending |
| SCORE-01 | Phase 5 | Pending |
| SCORE-02 | Phase 5 | Pending |
| SCORE-03 | Phase 5 | Pending |
| SCORE-04 | Phase 5 | Pending |
| SCORE-05 | Phase 5 | Pending |
| RESULT-01 | Phase 5 | Pending |
| RESULT-02 | Phase 5 | Pending |
| RESULT-03 | Phase 5 | Pending |
| RESULT-04 | Phase 5 | Pending |
| RESULT-05 | Phase 5 | Pending |
| RESULT-06 | Phase 5 | Pending |
| MONO-01 | Phase 5 | Pending |
| MONO-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-14*
*Last updated: 2026-05-14 after roadmap creation*
