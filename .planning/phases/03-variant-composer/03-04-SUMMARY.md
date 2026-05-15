---
phase: 03-variant-composer
plan: 04
subsystem: frontend-variants-foundation
tags: [nextjs, api-client, typescript, variants, dnd-kit, wave-3]

# Dependency graph
requires:
  - 03-03 (Backend variant API routes shipped)
provides:
  - "@dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0, @dnd-kit/utilities@3.2.2 in package.json"
  - "variantsService default export with 8 typed methods at frontend/src/services/variants.service.ts"
  - "Admin sidebar Варианты nav entry linking to /admin/variants"
affects:
  - 03-05 (admin variants list page — imports variantsService)
  - 03-06 (variant task assignment — imports variantsService + uses @dnd-kit)
  - 03-07 (student-facing variant pages — imports variantsService)

# Tech tracking
tech-stack:
  added:
    - "@dnd-kit/core@6.3.1 — drag-and-drop core, pinned for React 19 compat"
    - "@dnd-kit/sortable@10.0.0 — sortable list primitives"
    - "@dnd-kit/utilities@3.2.2 — CSS transform utilities for dnd-kit"
  patterns:
    - "variantsService follows exam-tasks.service.ts pattern: api wrapper, res.data.data unwrap, no try/catch"
    - "Re-export shared enums (ExamSection, TaskFormat) from variants.service so callers use single import path"
    - "Admin nav entry inherits startsWith active matching — no per-item logic needed"

key-files:
  created:
    - frontend/src/services/variants.service.ts
  modified:
    - frontend/package.json
    - frontend/package-lock.json
    - frontend/src/app/admin/layout.tsx

key-decisions:
  - "Pin exact @dnd-kit versions (no ^ or ~) to prevent API drift between dnd-kit major versions"
  - "Re-export ExamSection/TaskFormat from variants.service — consumers use single import path"
  - "No try/catch or console.log in service — error handling belongs to caller (Phase 2 convention)"

# Metrics
duration: 5min
completed: 2026-05-15
---

# Phase 3 Plan 04: Frontend Variants Foundation Summary

@dnd-kit packages installed at pinned versions, typed variantsService API client created with 8 methods covering all backend routes, admin sidebar extended with Варианты entry — Wave 4 plans (05, 06, 07) can now run in parallel.

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-15
- **Completed:** 2026-05-15
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Installed `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2` at exact pinned versions; no `npm ERR!` during install; all three modules resolve via `node -e "require(...)"`.
- Created `frontend/src/services/variants.service.ts`:
  - 8 typed async methods: `adminList`, `adminGetById`, `adminCreate`, `adminUpdate`, `adminAssignTasks`, `adminRemove`, `list`, `getById`
  - Type exports: `VariantTaskExamTaskMeta`, `VariantTask`, `VariantListItem`, `VariantListResult`, `CreateVariantPayload`, `UpdateVariantPayload`
  - Re-exports `ExamSection`, `TaskFormat` from `exam-tasks.service`
  - Uses `api` wrapper (no direct axios, no console.log)
- Updated `frontend/src/app/admin/layout.tsx`: NAV_ITEMS array extended from 7 to 8 items; `{ href: '/admin/variants', label: 'Варианты' }` inserted between `Банк заданий` and `Полезное`.
- `npx tsc --noEmit` exits 0; `npm run build` (Next.js production) exits 0.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install @dnd-kit packages | de135ab | package.json, package-lock.json |
| 2 | Create variantsService typed API client | 4e67425 | variants.service.ts |
| 3 | Add Варианты admin sidebar nav entry | 7db2993 | admin/layout.tsx |

## Decisions Made

- Exact version pinning for `@dnd-kit` packages — prevents silent API drift between major versions (React 19 compatible at these versions)
- `ExamSection` and `TaskFormat` re-exported from `variants.service.ts` so Wave 4 callers use a single import path
- No error handling in service methods — consistent with `exam-tasks.service.ts` convention (caller responsibility)

## Deviations from Plan

None - plan executed exactly as written.

## Security Mitigations Applied

| Threat ID | Status | Evidence |
|-----------|--------|---------|
| T-03-19 | Mitigated | `grep -c "console\."` returns 0 — no sensitive data logged in variantsService |
| T-03-21 | Inherited | Existing AdminLayout guard (lines 25-36) redirects non-admin users before nav renders |

## Self-Check: PASSED

Files verified:
- `frontend/package.json` — contains `"@dnd-kit/core": "6.3.1"`, `"@dnd-kit/sortable": "10.0.0"`, `"@dnd-kit/utilities": "3.2.2"` (exact, no `^`)
- `frontend/package-lock.json` — exists and updated
- `frontend/src/services/variants.service.ts` — exists, 8 methods, default export, no console/axios
- `frontend/src/app/admin/layout.tsx` — 8 href entries, `/admin/variants` between task-bank and resources
- `npx tsc --noEmit` — exits 0
- `npm run build` — exits 0 (standalone output built)
- Commits de135ab, 4e67425, 7db2993 exist in git log
