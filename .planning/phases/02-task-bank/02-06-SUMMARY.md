---
phase: 02-task-bank
plan: "06"
subsystem: frontend-form
tags: [phase2, frontend, dynamic-form, audio-upload, exam-task-create-edit]

requires:
  - phase: 02-task-bank/02-04
    provides: [examTasksService, ExamTask, CreateExamTaskPayload, TaskFormat, ExamSection, AiTaskType]
  - phase: 02-task-bank/02-03
    provides: [ExamTasksController, /admin/exam-tasks routes]
  - phase: 01
    provides: [/storage/presign endpoint, YOS presigned URL upload]

provides:
  - ExamTaskForm shared component at frontend/src/app/admin/task-bank/ExamTaskForm.tsx
  - ExamTaskForm.module.css CSS module for form styling
  - /admin/task-bank/new route — create mode form wrapper
  - /admin/task-bank/[id] route — edit mode form wrapper with getById prefetch

affects: [admin-task-bank-ui, TASK-01, TASK-02, TASK-03, TASK-05]

tech-stack:
  added: []
  patterns:
    - "useState-only form state (no react-hook-form/Formik) per project convention"
    - "handleAudioUpload: presign → fetch PUT to YOS → store cdnUrl; 15MB/audio/mpeg guard before any network call"
    - "Format-conditional fieldset rendering via form.format equality checks — instant swap on select change"
    - "options array shared for MCQ rows and Matching pairs/distractors; isCorrect boolean distinguishes pairs vs distractors"
    - "Link component used for cancel button (styled as .btn_cancel) to avoid useRouter navigation for simple back links"

key-files:
  created:
    - frontend/src/app/admin/task-bank/ExamTaskForm.tsx
    - frontend/src/app/admin/task-bank/ExamTaskForm.module.css
    - frontend/src/app/admin/task-bank/new/page.tsx
    - frontend/src/app/admin/task-bank/[id]/page.tsx

key-decisions:
  - "cancel button rendered as <Link> (not useRouter().push) — cleaner HTML semantics for nav-away without side effects"
  - "options array holds both MCQ rows and Matching pairs+distractors — isCorrect=true marks pairs, isCorrect=false marks distractors"
  - "No delete button in ExamTaskForm — per plan spec, delete handled exclusively from list page (Plan 05)"
  - "audioStatus state machine ('idle'|'uploading'|'success'|'error') drives mutually exclusive upload UI states"
  - "spinner implemented via CSS @keyframes border-spin (no SVG icon dep) — zero new dependencies"

requirements-completed: [TASK-01, TASK-02, TASK-03, TASK-05]

duration: ~22min
completed: "2026-05-15"
---

# Phase 2 Plan 06: ExamTaskForm Create/Edit Form Summary

**Shared ExamTaskForm component with 6 format-conditional fieldsets, audio upload via /storage/presign presigned URL, and two thin route wrappers mounting the form in create vs edit mode**

## Performance

- **Duration:** ~22 minutes
- **Started:** 2026-05-15T07:24:39Z
- **Completed:** 2026-05-15T07:46:25Z
- **Tasks:** 2/3 auto complete (Task 3 is human-verify checkpoint)
- **Files created:** 4

## Accomplishments

- `frontend/src/app/admin/task-bank/ExamTaskForm.tsx` — 320-line `'use client'` component implementing all 6 format-specific fieldsets (MCQ, Matching, True/False, Open Cloze, Word Formation, AI_CHECK), audio upload flow with 15MB/MP3 guard, client-side validation per UI-SPEC, and create/edit mode via `taskId` prop
- `frontend/src/app/admin/task-bank/ExamTaskForm.module.css` — CSS module with 20+ classes matching ResourceForm.module.css visual language
- `frontend/src/app/admin/task-bank/new/page.tsx` — thin wrapper with h1 "Новое задание", back link "← Банк заданий", mounts `<ExamTaskForm />` with no props
- `frontend/src/app/admin/task-bank/[id]/page.tsx` — edit wrapper that calls `examTasksService.getById(id)`, handles not-found branch, mounts `<ExamTaskForm initial={task} taskId={id} />`

## Task Commits

1. **Task 1: ExamTaskForm + CSS module** — `f238f98` (feat)
2. **Task 2: new/page.tsx + [id]/page.tsx wrappers** — `5643fb8` (feat)

## Format/Section Label Maps

### Section Options

| Enum | Display |
|------|---------|
| LISTENING | Аудирование |
| READING | Чтение |
| GRAMMAR | Грамматика |
| WRITING | Письмо |
| SPEAKING | Говорение |

### Format Options

| Enum | Display |
|------|---------|
| MCQ | MCQ |
| MATCHING | Matching |
| TRUE_FALSE | True/False |
| OPEN_CLOZE | Open Cloze |
| WORD_FORMATION | Word Formation |
| AI_CHECK | AI Проверка (37–42) |

### AI Task Type Options

| Enum | Display |
|------|---------|
| TASK37 | Задание 37 (Письмо/Эссе) |
| TASK38 | Задание 38 (Описание таблицы/графика) |
| TASK39 | Задание 39 (Чтение вслух) |
| TASK40 | Задание 40 (Условный диалог — вопросы) |
| TASK41 | Задание 41 (Условный диалог — интервью) |
| TASK42 | Задание 42 (Монолог) |

## Validation Message Catalog

| Trigger | Message |
|---------|---------|
| MCQ: no correct option | Отметьте правильный вариант |
| MCQ: < 2 options | Добавьте минимум 2 варианта ответа |
| Matching: no valid pair | Добавьте минимум 1 правильную пару |
| Audio: wrong type or >15MB | Допустимый формат: MP3, максимум 15 МБ |
| Audio upload network error | Ошибка загрузки. Попробуйте ещё раз. |
| Generic save failure | Ошибка сохранения. Проверьте поля и попробуйте снова. |

## Audio Upload Flow

**Happy path:**
1. User clicks "Загрузить аудио (MP3, макс. 15 МБ)"
2. File picker opens (accept="audio/mpeg")
3. Client validates: `file.size <= 15MB` AND `file.type === 'audio/mpeg'`
4. `POST /api/proxy/storage/presign` with `{ fileName: "exam-tasks/<uuid>.mp3", contentType: "audio/mpeg" }`
5. Browser PUTs file to presignedUrl with `Content-Type: audio/mpeg`
6. On 200: stores cdnUrl in `form.audioUrl`, shows "✓ Файл загружен" chip + truncated URL + "Удалить" link

**Rejection path:**
1. File > 15MB or non-MP3 (file.type !== 'audio/mpeg')
2. Error shown: "Допустимый формат: MP3, максимум 15 МБ"
3. No network call made

## Phase 2 Requirements Closure

All 6 Phase 2 requirements (TASK-01 through TASK-06) are now implemented:

| Requirement | Plan | Status |
|-------------|------|--------|
| TASK-01: 5 auto-graded formats (MCQ, Matching, T/F, Open Cloze, Word Formation) | 02-06 | Implemented in ExamTaskForm |
| TASK-02: AI_CHECK format linking to AiTaskType | 02-06 | Implemented in ExamTaskForm |
| TASK-03: Audio upload via YOS presigned URL | Phase 1 (backend), 02-06 (UX) | Backend complete; UX wired in ExamTaskForm |
| TASK-04: Delete UX with two-tier modal | 02-05 | Complete |
| TASK-05: Source label field | 02-06 | Source input in common fields section |
| TASK-06: List page with filters/pagination | 02-05 | Complete |

**Hand-off note to `/gsd-verify-phase`:** TASK-03 storage endpoint was shipped in Phase 1 and was verified live (see Phase 1 SUMMARY). Plan 06 only re-verifies the audio upload UX from the admin form — the PUT to YOS path is exercised end-to-end in Task 3 (human-verify checkpoint).

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### ESLint Note

Pre-existing "TypeError: Converting circular structure to JSON" in ESLint 9 + eslint-config-next configuration (inherited from Plan 05 — not related to new files). TypeScript compilation (`npx tsc --noEmit`) is clean with 0 errors. Full `npm run build` compiles successfully.

## Known Stubs

None — ExamTaskForm is fully wired to `examTasksService.create` / `examTasksService.update`. Audio upload uses the real `/storage/presign` endpoint. No hardcoded empty arrays or mock data.

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| No new surface | — | All API calls route through existing `examTasksService` and `api` (axios with cookie auth). Audio upload uses pre-existing `/storage/presign` endpoint (Phase 1). No new network endpoints or auth paths introduced. T-02-06-02 mitigation (file type check) implemented: `file.type !== 'audio/mpeg'` guard client-side before any network call. T-02-06-05 mitigation (path traversal) implemented: fileName generated via `crypto.randomUUID()`, no user input in path. |

## Self-Check: PASSED

- [x] `frontend/src/app/admin/task-bank/ExamTaskForm.tsx` exists
- [x] File starts with `'use client'`
- [x] File contains `/storage/presign`
- [x] File contains `15 * 1024 * 1024`
- [x] File contains `section === 'LISTENING'`
- [x] File branches on all 6 format values (14 format === conditions)
- [x] File contains all required copy strings (verified 15/15)
- [x] `frontend/src/app/admin/task-bank/ExamTaskForm.module.css` exists with all required classes
- [x] `frontend/src/app/admin/task-bank/new/page.tsx` exists, starts with `'use client'`
- [x] Contains "Новое задание" and "← Банк заданий"
- [x] Renders `<ExamTaskForm />` with no props
- [x] `frontend/src/app/admin/task-bank/[id]/page.tsx` exists, starts with `'use client'`
- [x] Contains "Редактировать задание" and "← Банк заданий"
- [x] Calls `examTasksService.getById` inside useEffect
- [x] Renders `<ExamTaskForm initial={task} taskId={id} />`
- [x] Handles not-found branch with "Задание не найдено"
- [x] TypeScript clean (0 source errors)
- [x] `npm run build` compiled successfully
- [x] Commits f238f98, 5643fb8 verified in git log
