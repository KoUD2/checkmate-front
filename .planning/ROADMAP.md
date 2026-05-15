# Roadmap: CheckMate — ЕГЭ Variants

## Overview

This milestone adds full ЕГЭ English variant support to CheckMate. Work proceeds in horizontal layers: first the data foundation (schema + storage), then the backend modules (task bank, variants, attempts, grading), then the admin UI to populate the bank and compose variants, then the student-facing exam player, and finally the grading pipeline and results page. Each layer depends on the one beneath it; the stack is coherent at every phase boundary.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Database & Infrastructure** - Prisma schema migration (5 new models + 2 enums) and Yandex Object Storage setup (CORS, presigned URL endpoint) (completed 2026-05-14)
- [x] **Phase 2: Task Bank** - ExamTasksModule with CRUD for all 6 task formats, audio upload integration, and admin UI for managing the task bank (completed 2026-05-15)
- [ ] **Phase 3: Variant Composer** - VariantsModule backend (create, assign tasks, reorder, publish/unpublish) and admin UI variant builder with student catalog and preview page
- [ ] **Phase 4: Exam Player** - AttemptsModule backend and full exam player frontend (navigation grid, auto-save, audio play-count enforcement, resume, section-skip, submit modal)
- [ ] **Phase 5: Grading & Results** - Submit endpoint (atomic check deduction + instant 1–36 grading + AI fire-and-forget) and result page (PARTIAL/COMPLETED/FAILED states, per-task breakdown, AI feedback, attempt history, upsell flow)

## Phase Details

### Phase 1: Database & Infrastructure
**Goal**: The data layer and storage infrastructure exist so every subsequent module can be built against stable contracts
**Depends on**: Nothing (first phase)
**Requirements**: TASK-03
**Success Criteria** (what must be TRUE):
  1. Prisma migration runs cleanly on the production database with zero existing-data errors
  2. All 5 new models (ExamTask, ExamTaskOption, Variant, VariantTask, VariantAttempt, AttemptAnswer) and 2 enums (TaskFormat, AttemptStatus) are queryable via Prisma Client
  3. Admin can obtain a presigned upload URL from the backend and successfully PUT an MP3 directly to Yandex Object Storage
  4. Uploaded audio files are publicly accessible via their CDN URL after upload completes
**Plans**: 4 plans
- [x] 01-00-PLAN.md — Wave 0 test infrastructure (jest.config.js + storage spec skeletons)
- [x] 01-01-PLAN.md — Prisma schema: 6 new models + 3 new enums per D-01..D-09
- [x] 01-02-PLAN.md — [BLOCKING] Run `prisma migrate dev` + regenerate Prisma Client
- [x] 01-03-PLAN.md — StorageModule + presigned URL endpoint + YOS env vars (TASK-03)

### Phase 2: Task Bank
**Goal**: Admins can build and curate the exam task bank across all 6 task formats
**Depends on**: Phase 1
**Requirements**: TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, TASK-06
**Success Criteria** (what must be TRUE):
  1. Admin can create a task in each of the 5 auto-graded formats (MCQ, Matching, True/False, Open Cloze, Word Formation) and the answer key is saved correctly
  2. Admin can create an AI-check task (types 37–42) and it is linked to the appropriate existing task type
  3. Admin can attach an MP3 audio file to a listening task via browser-direct upload; the audioUrl is stored and the file streams from the CDN
  4. Admin can edit any task field and delete a task; the system blocks deletion (with a warning) when the task is used in a published variant
  5. Admin can browse the task bank filtered by section, format, and source label, and see correct pagination
**Plans**: 7 plans
- [x] 02-00-PLAN.md — Wave 0 schema edit (AiTaskType enum + nullable aiTaskType field) + spec skeletons for ExamTasksController and ExamTasksService
- [x] 02-01-PLAN.md — [BLOCKING] Run `prisma migrate dev --name add_ai_task_type` + regenerate Prisma Client
- [x] 02-02-PLAN.md — Backend DTOs (CreateExamTaskDto with @ValidateIf, UpdateExamTaskDto) + ExamTasksService (list/findById/getById/create/update/remove with D-08 delete protection) + service.spec implementation (TASK-01, TASK-02, TASK-04, TASK-05, TASK-06)
- [x] 02-03-PLAN.md — Backend ExamTasksController (5 admin-guarded routes) + ExamTasksModule + AppModule wire + controller.spec implementation (TASK-01, TASK-02, TASK-04, TASK-05, TASK-06)
- [x] 02-04-PLAN.md — Frontend exam-tasks.service.ts typed API client + admin sidebar "Банк заданий" nav entry with startsWith active matching
- [x] 02-05-PLAN.md — Frontend /admin/task-bank list page + filters + DeleteWarningModal (two-tier delete UX) (TASK-04, TASK-06) ✓ human-verify approved 2026-05-15
- [x] 02-06-PLAN.md — Frontend ExamTaskForm (format-conditional fields + audio upload via /storage/presign) + new/page + [id]/page (TASK-01, TASK-02, TASK-03, TASK-05) ✓ human-verify approved 2026-05-15
**UI hint**: yes

### Phase 3: Variant Composer
**Goal**: Admins can assemble and publish variants; students can discover and preview them
**Depends on**: Phase 2
**Requirements**: VARIANT-01, VARIANT-02, VARIANT-03, VARIANT-04, VARIANT-05
**Success Criteria** (what must be TRUE):
  1. Admin can create a variant with a title and description, add tasks from the bank, and reorder them via drag-and-drop
  2. Admin can publish a variant; it immediately appears in the student catalog; admin can unpublish it and it disappears
  3. Student can browse the published variant catalog showing variant name, section breakdown, and task count
  4. Student can open a variant preview page and see sections, task count per section, and the check cost before committing to start
**Plans**: 7 plans
- [x] 03-01-PLAN.md — Wave 0 Jest spec skeletons for VariantsService and VariantsController (5+3 it.todo placeholders)
- [x] 03-02-PLAN.md — Backend DTOs (Create/Update/AssignTasks) + VariantsService (CRUD + bulk-replace assignTasks) + 5 service.spec tests (VARIANT-01..05)
- [ ] 03-03-PLAN.md — Backend Controllers (admin + student dual-namespace) + VariantsModule + AppModule wire + 8 controller.spec tests
- [ ] 03-04-PLAN.md — Frontend prerequisites: install @dnd-kit/core+sortable+utilities, create variantsService API client, add admin sidebar 'Варианты' nav
- [ ] 03-05-PLAN.md — Admin variants list page + create form + VariantForm component (VARIANT-01, VARIANT-03)
- [ ] 03-06-PLAN.md — Admin variant builder split-pane with @dnd-kit drag-and-drop + Save-button persistence (VARIANT-01, VARIANT-02, VARIANT-03) [checkpoint:human-verify]
- [ ] 03-07-PLAN.md — Student catalog + preview pages + MainLayout 'Варианты ЕГЭ' nav entry (VARIANT-04, VARIANT-05) [checkpoint:human-verify]
**UI hint**: yes

### Phase 4: Exam Player
**Goal**: Students can take a full ЕГЭ variant attempt with reliable auto-save, audio enforcement, section-skip, and submit flow
**Depends on**: Phase 3
**Requirements**: ATTEMPT-01, ATTEMPT-02, ATTEMPT-03, ATTEMPT-04, ATTEMPT-05, ATTEMPT-06, ATTEMPT-07, ATTEMPT-08, ATTEMPT-09
**Success Criteria** (what must be TRUE):
  1. Student can start a new attempt and land in the exam player; closing and reopening the variant preview shows a "resume" option that restores all previously saved answers
  2. Student sees a numbered navigation grid where cells reflect unanswered / answered / current state in real time
  3. Every answer change triggers an auto-save; the UI displays "Сохранено", a spinner during save, and a failure-with-retry indicator on network error
  4. Student can skip the writing section (37–38) or speaking section (39–42) after confirming an explicit prompt; skipped sections are excluded from AI grading
  5. Each audio track in the listening section enforces a maximum of 2 plays; the play count is shown and survives a page reload
  6. Student can open the submit modal, see the count of unanswered tasks, and confirm to submit the attempt
**Plans**: TBD
**UI hint**: yes

### Phase 5: Grading & Results
**Goal**: Students receive instant partial results and full AI-graded results, with monetization enforcement at submit
**Depends on**: Phase 4
**Requirements**: SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05, RESULT-01, RESULT-02, RESULT-03, RESULT-04, RESULT-05, RESULT-06, MONO-01, MONO-02
**Success Criteria** (what must be TRUE):
  1. On submit, tasks 1–36 are auto-checked instantly; the result page loads immediately showing the partial primary score while AI tasks are pending
  2. The result page shows primary score per section and the ФИПИ 2024 scaled score prominently; once AI grading completes the page updates without a manual refresh
  3. Student can see per-task breakdown for tasks 1–36 (their answer, correct answer, color-coded pass/fail) and expandable AI criterion scores and feedback for tasks 37–42
  4. Check balance is verified and deducted atomically at submit using an optimistic concurrency lock; a student with insufficient checks sees the upsell modal instead of AI submission proceeding
  5. Attempt status transitions correctly through IN_PROGRESS → SUBMITTED → COMPLETED (or FAILED with retry available)
  6. Student can navigate to their attempt history list showing date, variant name, and scaled score, with a link to each result page
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database & Infrastructure | 4/4 | Complete   | 2026-05-14 |
| 2. Task Bank | 7/7 | Complete | 2026-05-15 |
| 3. Variant Composer | 2/7 | In Progress|  |
| 4. Exam Player | 0/? | Not started | - |
| 5. Grading & Results | 0/? | Not started | - |
