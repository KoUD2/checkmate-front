---
phase: "06-promo-codes-checks-instead-of-days"
plan: "02"
subsystem: "admin-ui"
tags:
  - nextjs
  - react
  - admin-ui
  - promo-codes
  - checks-economy

dependency_graph:
  requires:
    - phase: "06-01"
      provides: "CreatePromoDto.checksToAdd replaces days; PromoCode.checksToAdd in GET response"
  provides:
    - "AdminPromos.tsx PromoCode interface with checksToAdd: number (no days field)"
    - "AdminPromos.tsx state hook [checks, setChecks] binding checks amount input"
    - "AdminPromos.tsx handleCreate posts checksToAdd: parseInt(checks) body"
    - "AdminPromos.tsx validation error 'Код и количество чеков обязательны'"
    - "AdminPromos.tsx form label 'Чеков *' with placeholder '10'"
    - "AdminPromos.tsx table header 'Чеков' and table cell {p.checksToAdd}"
  affects:
    - "frontend/src/components/screens/AdminPromos/AdminPromos.tsx"

tech-stack:
  added: []
  patterns:
    - "In-place rename pattern: TypeScript interface + state hook + validation + POST body + reset all updated atomically across two sequential tasks"

key-files:
  created: []
  modified:
    - "frontend/src/components/screens/AdminPromos/AdminPromos.tsx"

key-decisions:
  - "No changes to CSS module, pagination, or unrelated form fields — only checks/checksToAdd identifiers renamed per plan scope"
  - "TypeScript tsc check deferred to main repo with node_modules (worktree has no node_modules); no AdminPromos-specific type errors introduced — all errors in tsc output are pre-existing missing-module errors"

patterns-established:
  - "Admin form state pattern: string state for number inputs (parsed at submit via parseInt) — matches existing maxUses pattern"

requirements-completed:
  - "admin UI must let admins set check amount instead of days"

duration: "~2 min"
completed: "2026-05-18"
---

# Phase 06 Plan 02: AdminPromos UI — Checks Instead of Days Summary

**AdminPromos.tsx fully renamed from days/Дней to checksToAdd/Чеков: interface field, state hook, validation message, POST body, form label, placeholder, table header, and table cell all aligned with the Plan 01 backend contract.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-18T10:56:54Z
- **Completed:** 2026-05-18T10:58:47Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- PromoCode TypeScript interface: `days: number` renamed to `checksToAdd: number`, aligning frontend type with Plan 01 backend response shape
- State hook `[days, setDays]` renamed to `[checks, setChecks]`; handleCreate guard, POST body, and reset all updated in a single coherent pass
- JSX updated: form label `Дней *` → `Чеков *`, placeholder `30` → `10`, table header `Дней` → `Чеков`, table cell `{p.days}` → `{p.checksToAdd}`

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename PromoCode interface field and state variable** - `6e2fea4` (feat)
2. **Task 2: Update form input UI copy and table column to Чеков** - `bf60cbe` (feat)

**Plan metadata:** committed after summary creation (docs)

## Files Created/Modified

- `frontend/src/components/screens/AdminPromos/AdminPromos.tsx` — All checks/checksToAdd rename changes: interface, state, validation, POST body, reset, form label, placeholder, table header, table cell

## Decisions Made

- No changes to AdminPromos.module.css or any other file — the rename scope was contained entirely within AdminPromos.tsx
- TypeScript interface field renamed before JSX/copy changes (Task 1 first) ensures the interface is correct before the table renderer references `p.checksToAdd`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `npx tsc --noEmit` inside the worktree fails with "This is not the tsc command you are looking for" (npx stubs installed globally). Used `/Users/konstantinudod/Desktop/CheckMate/frontend/node_modules/.bin/tsc` directly. All errors in output were pre-existing infrastructure errors (missing node_modules in worktree — react, next, CSS modules); no errors were introduced by the changes to AdminPromos.tsx.

## Known Stubs

None — `{p.checksToAdd}` reads live data from the PromoCode object returned by GET /admin/promo; `checksToAdd: parseInt(checks)` sends real user input to POST /admin/promo.

## Threat Flags

No new attack surface introduced. Trust boundary T-06F-01 (server-side @IsInt + @Min(1) on CreatePromoDto.checksToAdd) remains the authoritative gate. Client-side `type='number'` + `min={1}` is UX-only, unchanged from original pattern. T-06F-04 mitigation confirmed: this plan removes the only client that emitted `days`; POST body now correctly sends `checksToAdd`.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- AdminPromos UI is fully aligned with the Plan 01 backend contract. Admins can now create promo codes that credit checks (checksToAdd) rather than days.
- Together with Plan 01, success criteria 1–5 from the ROADMAP are achievable end-to-end through the admin UI.
- No blockers for subsequent phases.

---
*Phase: 06-promo-codes-checks-instead-of-days*
*Completed: 2026-05-18*
