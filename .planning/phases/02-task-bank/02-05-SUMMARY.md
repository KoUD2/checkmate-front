---
phase: 02-task-bank
plan: "05"
subsystem: frontend-list-page
tags: [phase2, frontend, admin-list, filters, delete-modal, badges]

requires:
  - phase: 02-task-bank/02-04
    provides: [examTasksService, ExamTaskListItem, TaskFormat, ExamSection, RemoveResult]
  - phase: 02-task-bank/02-03
    provides: [ExamTasksController, /admin/exam-tasks routes]

provides:
  - AdminTaskBankPage at /admin/task-bank with filter row, paginated table, badge rendering
  - DeleteWarningModal component handling draft (two-button) and blocked (single-button) states
  - AdminTaskBank.module.css with all overlay/modal/button/table/filter/chip/badge/pagination classes

affects: [02-06-PLAN, admin-task-bank-ui]

tech-stack:
  added: []
  patterns:
    - "useRef debounce pattern for source input (300ms) prevents one HTTP call per keystroke"
    - "Discriminated union handling for RemoveResult: checks 'deleted' in result vs 'needsConfirm' in result"
    - "CSS Module format_${item.format} dynamic class for color-coded badges"
    - "Two-tier delete UX: browser confirm -> service.remove(id,false) -> modal for draft/blocked states"

key-files:
  created:
    - frontend/src/app/admin/task-bank/page.tsx
    - frontend/src/app/admin/task-bank/AdminTaskBank.module.css
    - frontend/src/app/admin/task-bank/DeleteWarningModal.tsx

key-decisions:
  - "AdminTaskBankPage uses isFiltered flag (section||format||source) to switch empty-state message"
  - "handleDelete catches 409 via err.response?.status === 409 pattern (not isAxiosError) for consistency with codebase"
  - "Modal overlay click-to-close only works in 'blocked' mode; 'draft' mode requires explicit button choice per UI-SPEC"
  - "Plan 06 (ExamTaskForm) can reuse AdminTaskBank.module.css classes: overlay, modal, btn_destructive, btn_secondary, btn_primary_dark"

requirements-completed: [TASK-04, TASK-06]

duration: ~10min
completed: "2026-05-14"
---

# Phase 2 Plan 05: Admin Task Bank List Page Summary

**List page at /admin/task-bank wired to examTasksService with filter row, color-coded badges, paginated table, and two-tier delete modal consuming backend 200+needsConfirm and 409 responses**

## Performance

- **Duration:** ~10 minutes
- **Started:** 2026-05-14T15:35:28Z
- **Completed:** 2026-05-14T15:37:48Z
- **Tasks:** 2 (of 3 — Task 3 is human-verify checkpoint)
- **Files created:** 3

## Accomplishments

- `frontend/src/app/admin/task-bank/DeleteWarningModal.tsx` — client component with `mode: 'draft' | 'blocked'` prop; draft state shows two-button modal (Удалить всё равно / Не удалять); blocked state shows single-button modal (Понятно); exact UI-SPEC copy throughout
- `frontend/src/app/admin/task-bank/AdminTaskBank.module.css` — CSS module with 30+ classes covering overlay/modal, table, filters, badges (6 format colors), section chip, pagination, action buttons
- `frontend/src/app/admin/task-bank/page.tsx` — 200-line client component with full filter row, paginated table, two-tier delete flow, empty states, and 300ms debounced source input

## Task Commits

1. **Task 1: DeleteWarningModal + CSS module init** — `d59cafe` (feat)
2. **Task 2: AdminTaskBankPage full implementation** — `dc10c3e` (feat)

## Format/Section Label Maps

### FORMAT_LABELS (module-level constant)

| Enum | Display |
|------|---------|
| MCQ | MCQ |
| MATCHING | Matching |
| TRUE_FALSE | True / False |
| OPEN_CLOZE | Open Cloze |
| WORD_FORMATION | Word Formation |
| AI_CHECK | AI Проверка |

### SECTION_LABELS (module-level constant)

| Enum | Display |
|------|---------|
| LISTENING | Аудирование |
| READING | Чтение |
| GRAMMAR | Грамматика |
| WRITING | Письмо |
| SPEAKING | Говорение |

## CSS Module Reuse for Plan 06

`AdminTaskBank.module.css` is ready for Plan 06 (ExamTaskForm create/edit page) to reuse these classes:
- `.overlay` / `.modal` / `.modalTitle` / `.modalBody` / `.modalFooter` — for any modal dialogs in the form
- `.btn_destructive` — for the delete button in the edit form footer
- `.btn_secondary` — for cancel / secondary actions
- `.btn_primary_dark` — for the save/create primary CTA

Plan 06 may also create a separate `ExamTaskForm.module.css` for form-specific styles, extending the visual language established here.

## Delete Flow Coverage

| Case | Backend response | UI behavior | Status |
|------|-----------------|-------------|--------|
| Case 1: No variants | `{ deleted: true }` | browser `confirm()` → direct delete → list refetch | Implemented |
| Case 2: Draft variants only | `200 { needsConfirm: true, variantNames: [...] }` | Draft modal with "Удалить всё равно" | Implemented |
| Case 3: Published variants | `409 Conflict { variants: [...] }` | Blocked modal with "Понятно" | Implemented |

Cases 2 and 3 require VariantsModule (Phase 3) to be fully exercised end-to-end. They are implemented at the UI layer and will be tested once Phase 3 ships variant publishing.

## Human Verify Checkpoint (Task 3 — Pending)

The following manual checks are required against the running backend:
1. Navigate to `/admin/task-bank` — page renders with table, heading, CTA
2. Admin sidebar "Банк заданий" is highlighted (active)
3. Section filter: select "Аудирование" → refetch → only listening tasks
4. Format filter: select "MCQ" → only MCQ tasks
5. Source input: type "ФИПИ" → wait ~300ms → debounced refetch
6. Pagination: >20 tasks shows "Стр. 1 / 2" and arrow buttons
7. Delete Case 1 (no variants): browser confirm → task removed from list

Steps 8–9 (Cases 2 and 3) deferred until Phase 3.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### ESLint Note

`npx eslint` exits with a pre-existing "TypeError: Converting circular structure to JSON" error in the ESLint 9 + eslint-config-next configuration (not related to new files). Next.js v16 does not ship a `next lint` command. TypeScript compilation (`npx tsc --noEmit`, excluding .next/dev/ cache) is clean with 0 errors in source files.

## Known Stubs

None — page is fully wired to `examTasksService.list()` for data. No hardcoded empty arrays or mock data. Delete flow is fully wired to `examTasksService.remove()`. The only deferred behavior is Cases 2 and 3 of the delete flow which require Phase 3 data (variant publishing status).

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| No new surface | — | All API calls route through existing `examTasksService` which uses `api` (axios instance with cookie auth). No new network endpoints or auth paths introduced. Backend RolesGuard (Plan 03) enforces ADMIN role. T-02-05-01 mitigation (backend re-validates published state) is enforced server-side; UI sends `confirm=true` flag as hint only. T-02-05-02 mitigation (AdminLayout redirect for non-ADMIN) was already in place from Phase 2 Plan 04. |

## Self-Check: PASSED

- [x] `frontend/src/app/admin/task-bank/DeleteWarningModal.tsx` exists
- [x] File starts with `'use client'`
- [x] Contains: "Задание используется в черновиках", "Удаление невозможно", "Удалить всё равно", "Не удалять", "Понятно"
- [x] `frontend/src/app/admin/task-bank/AdminTaskBank.module.css` exists
- [x] CSS contains `.overlay`, `.modal`, `.btn_destructive`, `.btn_secondary`, `.btn_primary_dark` (count: 8 matches >= 5)
- [x] `frontend/src/app/admin/task-bank/page.tsx` exists, starts with `'use client'`
- [x] Imports `examTasksService` from `@/services/exam-tasks.service`
- [x] Imports `DeleteWarningModal` from `./DeleteWarningModal`
- [x] Contains "Банк заданий", "+ Создать задание", links to "/admin/task-bank/new"
- [x] Contains 6 column headers: Название, Раздел, Формат, Источник, Создан, Действия (count: 7 matches)
- [x] Contains both empty state strings
- [x] Contains `needsConfirm` and `status === 409` checks
- [x] CSS has all 6 format color classes (count: 6)
- [x] CSS has `.btn_create`, `.btn_edit`, `.btn_delete`, `.table`, `.filters`, `.pagination`, `.sectionChip`
- [x] TypeScript clean (0 source errors, excluding pre-existing .next/dev cache errors)
- [x] Commits d59cafe, dc10c3e verified in git log
