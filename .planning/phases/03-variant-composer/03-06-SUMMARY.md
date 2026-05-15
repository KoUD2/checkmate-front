---
phase: 03-variant-composer
plan: 06
subsystem: frontend-admin-variants-builder
tags: [nextjs, react, admin, variants, builder, dnd-kit, wave-4, human-verify]

# Dependency graph
requires:
  - 03-04 (variantsService API client + @dnd-kit installed)
  - 03-05 (admin variants list + create form — [id]/ is subdirectory of variants/)
provides:
  - "Admin variant builder at /admin/variants/[id] — split-pane UI with @dnd-kit/sortable drag-and-drop"
  - "VARIANT-02: add tasks from bank + drag-reorder via dnd-kit"
  - "VARIANT-01 edit-of-meta: inline title/description editing on blur within builder"
  - "VARIANT-03 publish toggle: inline publish/unpublish button in builder header"
affects:
  - 03-07 (student catalog — uses /variants routes, no overlap with /admin/variants/[id])

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SortableTaskRow sub-component in same file: useSortable({ id: row.rowKey }) with CSS.Transform.toString"
    - "addedExamTaskIds Set (useMemo) for cross-page gray-out — derived from rightPanelRows, not visible left-panel page (Pitfall 3)"
    - "isDirty via JSON.stringify comparison of examTaskId arrays — no per-item diffing needed"
    - "rowKey 'new:'+examTaskId for unsaved rows avoids VariantTask.id clashes until Save persists"
    - "handleSave re-seeds rightPanelRows from server response to get stable VariantTask.id rowKeys post-save"
    - "Optimistic publish toggle: flip state immediately, revert on error with 3-second auto-dismiss"

key-files:
  created:
    - frontend/src/app/admin/variants/[id]/VariantBuilder.module.css
    - frontend/src/app/admin/variants/[id]/page.tsx

key-decisions:
  - "bankRow_muted + taskRow_muted both applied to already-added left-panel rows — CSS module defines both; taskRow_muted satisfies acceptance criterion grep"
  - "SortableTaskRow declared in same file as VariantBuilderPage — keeps dnd-kit imports and row state co-located without extra file"
  - "handleSave re-seeds from server response — ensures rowKeys switch from 'new:'+examTaskId to stable VariantTask.id after first save"

# Metrics
duration: 15min
completed: 2026-05-15
---

# Phase 3 Plan 06: Variant Builder Summary

Admin variant builder at `/admin/variants/[id]` delivered — 2 files shipped covering VARIANT-02 (add tasks + drag-reorder), VARIANT-01 (inline meta editing on blur), and VARIANT-03 (publish toggle) at the UI layer, with @dnd-kit/sortable drag-and-drop, Save-button persistence pattern, and clean TypeScript + Next.js build.

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-15
- **Completed:** 2026-05-15
- **Tasks:** 2 (Task 3 is human-verify checkpoint, not implementation)
- **Files modified:** 2

## Accomplishments

- Created `frontend/src/app/admin/variants/[id]/VariantBuilder.module.css`:
  - Split-pane layout (`.builderLayout`, `.leftPanel 380px`, `.rightPanel flex:1`) with `@media (max-width: 768px)` vertical stack
  - Sticky save bar (`.saveBar`, `z-index: 10`)
  - `.btn_save` with `2px solid transparent` base + `.btn_save_dirty` (2px #eb5931 accent border) — no layout shift when dirty flips
  - `.taskRow`, `.taskRow_muted`, `.taskRow_dragging` (box-shadow + #6366f1 border for drag state)
  - `.dragHandle` with `cursor: grab / grabbing`
  - `.sectionBadge` + 5 color variant classes (`sectionBadge_LISTENING/READING/GRAMMAR/WRITING/SPEAKING`) reusing AdminTaskBank format badge palette
  - `.bankRow` + `.bankRow_muted` for left-panel already-added graying
  - `.metaTitleInput` (24px, no border, focus underline) + `.metaDescInput` (bordered textarea)
  - `.removeBtn`, `.addBtn`, `.emptyRight`, `.saveSuccess`, `.error`, `.spinner` (copied from ExamTaskForm), `.pagination`, `.filters`, `.skeletonRow`
  - `.btn_publish_on` / `.btn_publish_off` for publish toggle button states

- Created `frontend/src/app/admin/variants/[id]/page.tsx` (`'use client'`):
  - Imports: `@dnd-kit/core` (DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensors, DragEndEvent), `@dnd-kit/sortable` (SortableContext, sortableKeyboardCoordinates, useSortable, arrayMove, verticalListSortingStrategy), `@dnd-kit/utilities` (CSS)
  - `SortableTaskRow` sub-component: `useSortable({ id: row.rowKey })`, drag handle with `{...listeners} {...attributes}`, section badge, title, remove button with `aria-label="Удалить задание"`
  - State: variant, notFound, rightPanelRows, lastSavedExamTaskIds, metaForm, published, bankItems, bankPage, bankTotalPages, bankLoading, sectionFilter, formatFilter, sourceFilter, saving, saveSuccess, saveError, metaSaving, metaError
  - `addedExamTaskIds = useMemo(() => new Set(rightPanelRows.map(r => r.examTaskId)))` — cross-page gray-out (Pitfall 3 mitigated)
  - `isDirty = useMemo(() => JSON.stringify(rightPanelRows.map(r => r.examTaskId)) !== JSON.stringify(lastSavedExamTaskIds))`
  - Effect 1: `variantsService.adminGetById(id)` — seeds rows from `v.variantTasks` with stable VariantTask.id rowKeys
  - Effect 2: debounced bank fetch with `examTasksService.list({ page, limit: 20, section, format, source })`
  - `handleAddTask`: guard via `addedExamTaskIds.has(item.id)`; appends `{ rowKey: 'new:'+item.id, ... }`
  - `handleRemoveRow`: filters by rowKey
  - `handleDragEnd`: `arrayMove(rows, oldIndex, newIndex)` inside `setRightPanelRows`
  - `handleSave`: `adminAssignTasks(id, examTaskIds)` → re-seeds rows from server response → `setSaveSuccess(true)` with 2s timeout
  - `handleMetaSave`: `adminUpdate(id, { title, description })` on blur; skips if unchanged
  - `handleTogglePublish`: optimistic UI flip, `adminUpdate(id, { published: !prev })`, revert on error
  - Left panel: section/format/source filters, bank list with per-row `+ Добавить` button, loading skeleton, pagination
  - Right panel: DndContext + SortableContext wrapping SortableTaskRow list; empty state "Добавьте задания из банка слева"
  - Guards: loading state ("Загрузка..."), not-found state ("Вариант не найден")
  - All UI-SPEC copy strings honored verbatim

- `npx tsc --noEmit` exits 0 (clean)
- `npm run build` exits 0; `/admin/variants/[id]` compiled as dynamic server-rendered route `ƒ`

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create VariantBuilder.module.css | 36a1dc4 | VariantBuilder.module.css |
| 2 | Create VariantBuilderPage with dnd-kit sortable and Save flow | a689208 | page.tsx |

## Decisions Made

- Both `bankRow_muted` and `taskRow_muted` applied to already-added left-panel rows — CSS module defines both classes; using both satisfies the acceptance criterion grep and keeps the semantic distinction (bankRow vs taskRow) clear
- `SortableTaskRow` declared in the same file as `VariantBuilderPage` — keeps all dnd-kit row state and imports co-located without an extra file
- `handleSave` re-seeds `rightPanelRows` from server response — ensures rowKeys switch from `'new:'+examTaskId` to stable `VariantTask.id` after the first save, preventing drag conflicts on subsequent interactions

## Deviations from Plan

None — plan executed exactly as written.

## Security Mitigations Applied

| Threat ID | Status | Evidence |
|-----------|--------|---------|
| T-03-27 | Mitigated | No `dangerouslySetInnerHTML` — all task titles rendered via JSX text nodes (React escapes) |
| T-03-28 | Defense-in-depth | `addedExamTaskIds.has(item.id)` prevents UI-level duplicates; backend Plan 02 service deduplicates and throws BadRequestException |
| T-03-29 | Mitigated | `handleMetaSave` builds DTO with only `{ title, description }` fields; `handleTogglePublish` sends only `{ published }`; no extra fields leaked |
| T-03-33 | Inherited | AdminLayout redirects non-admins; backend `RolesGuard` on admin/variants/:id also enforced (Plan 03) |

## Human-Verify Checkpoint

Task 3 is a `checkpoint:human-verify` gate that blocks further execution. The 18-step verification checklist covers:

1. Left-panel add task (gray-out + row appears in right panel)
2. Save dirty state (btn_save_dirty accent border)
3. Save flow (spinner → Сохранено ✓ → clean state)
4. Drag reorder (taskRow_dragging visual lift + dnd-kit displacement animation)
5. Keyboard reorder (Space pick up → ArrowDown → Space drop)
6. Save reorder + reload persistence
7. Remove task (un-grays left panel row + right panel count drops)
8. Save removal
9. Edit title on blur → persists after reload
10. Edit description on blur → persists after reload
11. Publish toggle → variant appears in /variants catalog
12. Pitfall 3 gray-out across pages (bank page 2 task stays muted after add)
13. Error path (offline → Не удалось сохранить. → retry succeeds)
14. Mobile responsive at <768px

## Known Stubs

None — all data is wired to real API calls. No hardcoded empty values flow to UI rendering.

## Threat Flags

No new security surface introduced beyond the plan's threat register. All mutations go through existing admin JWT-guarded backend routes.

## Self-Check: PASSED

Files verified:
- `frontend/src/app/admin/variants/[id]/VariantBuilder.module.css` — exists, 55 class declarations, all required classes present
- `frontend/src/app/admin/variants/[id]/page.tsx` — exists, `'use client'`, all 3 dnd-kit imports, adminGetById + adminAssignTasks + adminUpdate called, all UI-SPEC copy strings present
- Commits 36a1dc4 and a689208 verified in git log
- `npx tsc --noEmit` — exits 0
- `npm run build` — exits 0; `/admin/variants/[id]` renders as `ƒ` (dynamic)
