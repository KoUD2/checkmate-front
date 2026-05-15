---
phase: 03-variant-composer
plan: 05
subsystem: frontend-admin-variants
tags: [nextjs, react, admin, variants, list-page, create-form, wave-4]

# Dependency graph
requires:
  - 03-04 (variantsService API client with adminList, adminUpdate, adminCreate)
provides:
  - "Admin variants list page at /admin/variants — table, publish toggle, pagination, empty state"
  - "Admin create form at /admin/variants/new — VariantForm component with title+description fields"
affects:
  - 03-06 (variant builder adds [id]/ subdirectory alongside these files — no overlap)
  - 03-07 (student catalog — uses /variants routes, no overlap with /admin/variants)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual CSS import: sharedStyles from AdminTaskBank.module.css + styles from AdminVariants.module.css — avoids 200-line duplication"
    - "Optimistic publish toggle: flip state immediately, revert on error with 3-second auto-dismiss"
    - "Server component (new/page.tsx) wrapping client form (VariantForm.tsx) — same pattern as task-bank/new"

key-files:
  created:
    - frontend/src/app/admin/variants/AdminVariants.module.css
    - frontend/src/app/admin/variants/page.tsx
    - frontend/src/app/admin/variants/VariantForm.module.css
    - frontend/src/app/admin/variants/VariantForm.tsx
    - frontend/src/app/admin/variants/new/page.tsx

key-decisions:
  - "Dual CSS import pattern (sharedStyles + styles) avoids redefining 200 lines of AdminTaskBank classes"
  - "AdminVariants.module.css contains only new classes: togglePublish, togglePublish_published, togglePublish_draft, statusBadge, rowError"
  - "VariantForm.module.css copies generic form classes from ExamTaskForm.module.css verbatim (form, fieldset, label, input, textarea, error, footer, btn_save, btn_cancel, spinner)"
  - "new/page.tsx is a server component (no 'use client') wrapping the VariantForm client component — matches Phase 2 task-bank/new pattern"

# Metrics
duration: 10min
completed: 2026-05-15
---

# Phase 3 Plan 05: Admin Variants List + Create Form Summary

Admin variants list page and create form delivered — 5 files shipped covering VARIANT-01 (create) and VARIANT-03 (publish/unpublish) at the UI layer, with optimistic publish toggle, dual CSS import pattern, and clean TypeScript build.

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-15
- **Completed:** 2026-05-15
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `frontend/src/app/admin/variants/AdminVariants.module.css`:
  - Contains only variant-specific classes: `.togglePublish`, `.togglePublish_published`, `.togglePublish_draft`, `.togglePublish:disabled`, `.statusBadge`, `.rowError`
  - Published state colors: `#c4edc8` background / `#15803d` text — exact UI-SPEC values
  - Shared classes (table, pagination, empty state etc.) imported via `sharedStyles` from `AdminTaskBank.module.css`

- Created `frontend/src/app/admin/variants/page.tsx` (`'use client'`):
  - State: `items`, `page`, `totalPages`, `total`, `loading`, `toggleBusyId`, `rowError`
  - `fetchItems` calls `variantsService.adminList(page)`
  - `handleTogglePublish` implements optimistic UI flip, `adminUpdate` PATCH, revert on error with 3-second `setTimeout`
  - Table columns: Название (link to /admin/variants/[id]), Заданий, Статус, Создан, Действия
  - Task count formula: `item._count?.variantTasks ?? item.variantTasks?.length ?? 0`
  - Empty state: "Вариантов ещё нет" / "Создайте первый вариант и добавьте задания из банка."
  - Pagination block only rendered when `totalPages > 1`
  - `toggleBusyId` disables button while in-flight (T-03-25 mitigation)
  - No `dangerouslySetInnerHTML` (T-03-22 mitigation)

- Created `frontend/src/app/admin/variants/VariantForm.module.css`:
  - Copies generic classes verbatim from `ExamTaskForm.module.css`: `.form`, `.fieldset`, `.label`, `.input`/`.select`/`.textarea`, `.error`, `.footer`, `.btn_save`, `.btn_cancel`, `.spinner`

- Created `frontend/src/app/admin/variants/VariantForm.tsx` (`'use client'`):
  - State: `form { title, description }`, `submitting`, `error`
  - `handleSubmit` validates non-empty title, calls `variantsService.adminCreate(dto)`, redirects to `/admin/variants/[result.id]`
  - Error: reads `response?.data?.message` with fallback to "Не удалось создать вариант. Попробуйте ещё раз."
  - Fields: title (`maxLength={200}`, required), description (`maxLength={500}`, rows={4})
  - Footer: "Создать вариант" button with spinner when submitting + "Отмена" cancel link

- Created `frontend/src/app/admin/variants/new/page.tsx` (server component, no `'use client'`):
  - Back link: "← Варианты" → `/admin/variants`
  - Heading: "Новый вариант"
  - Renders `<VariantForm />`

- `npx tsc --noEmit` exits 0 (clean)
- `npm run build` exits 0; both `/admin/variants` and `/admin/variants/new` compiled as static pages

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create AdminVariants.module.css + admin variants list page | 1e939c2 | AdminVariants.module.css, page.tsx |
| 2 | Create VariantForm component + create-page wrapper | c624e41 | VariantForm.module.css, VariantForm.tsx, new/page.tsx |

## Decisions Made

- Dual CSS import pattern — `sharedStyles` from `AdminTaskBank.module.css` + `styles` from `AdminVariants.module.css` — avoids duplicating 200+ lines of shared table/pagination/empty-state CSS
- `VariantForm.module.css` copies ExamTaskForm classes verbatim (not imported) — each module is self-contained per CSS Modules convention; no cross-module class sharing
- `new/page.tsx` has no `'use client'` directive — server component wrapping a client form, matching Phase 2 task-bank/new pattern

## Deviations from Plan

None — plan executed exactly as written.

## Security Mitigations Applied

| Threat ID | Status | Evidence |
|-----------|--------|---------|
| T-03-22 | Mitigated | `grep -c "dangerouslySetInnerHTML"` returns 0 across all 3 modified .tsx files |
| T-03-23 | Mitigated | VariantForm builds DTO from explicit fields only: `{ title: form.title.trim(), description: form.description.trim() || undefined }` |
| T-03-24 | Mitigated | No localStorage writes; state is component-local React useState |
| T-03-25 | Mitigated | `disabled={toggleBusyId === item.id}` on publish toggle button prevents spam PATCH while in-flight |
| T-03-26 | Inherited | Existing AdminLayout guard (layout.tsx lines 25-32) redirects non-admins |

## File Overlap Check (Wave 4)

- This plan touches: `page.tsx`, `AdminVariants.module.css`, `VariantForm.tsx`, `VariantForm.module.css`, `new/page.tsx` — all in `frontend/src/app/admin/variants/`
- Plan 06 touches: `[id]/page.tsx`, `[id]/VariantBuilder.module.css` — subdirectory of `admin/variants/` — no overlap
- Plan 07 touches: `frontend/src/app/variants/*` — student-facing route, entirely separate directory — no overlap

## Self-Check: PASSED

Files verified:
- `frontend/src/app/admin/variants/AdminVariants.module.css` — exists, `.togglePublish`, `.statusBadge`, `.rowError` present
- `frontend/src/app/admin/variants/page.tsx` — exists, `'use client'`, adminList + adminUpdate called
- `frontend/src/app/admin/variants/VariantForm.module.css` — exists, 7 generic CSS classes
- `frontend/src/app/admin/variants/VariantForm.tsx` — exists, `'use client'`, adminCreate called, maxLength 200+500
- `frontend/src/app/admin/variants/new/page.tsx` — exists, no `'use client'`, VariantForm imported and rendered
- Commits 1e939c2 and c624e41 verified in git log
- `npx tsc --noEmit` — exits 0
- `npm run build` — exits 0 (static routes for /admin/variants and /admin/variants/new)
