---
phase: 03-variant-composer
plan: 07
subsystem: frontend-student-variants
tags: [nextjs, react, student, variants, catalog, preview, human-verify]

# Dependency graph
requires:
  - 03-04 (variantsService API client — list + getById methods)
  - 03-02 (backend variants API with published filter)
provides:
  - "Student catalog at /variants — card grid with section breakdown chips + AI check cost chip"
  - "Student preview at /variants/[id] — section list, cost callout, Начать вариант CTA"
  - "VARIANT-04: catalog with section breakdown and AI check task count"
  - "VARIANT-05: preview with section counts and check cost callout"
  - "MainLayout navigation extended with Варианты ЕГЭ entry for authenticated users"
affects:
  - Phase 4 (attempt creation route /variants/[id]/attempt — CTA already wired)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getSectionBreakdown helper: single-pass loop over variantTasks to build Partial<Record<ExamSection, number>> counts + AI_CHECK cost"
    - "SECTION_ORDER constant drives both section chip render order and preview sectionList order (LISTEN→READ→GRAM→WRITE→SPEAK)"
    - "pluralChecks function: mod10/mod100 pattern for Russian numeral agreement (1 чек / 2-4 чека / 5+ чеков, special case 11-14 чеков)"
    - "Loading skeleton: 6 grey cards at height:160px — matches UI-SPEC Student Catalog States"
    - "Variants Link in MainLayout wrapped in {user && (...)} — same pattern as /referral (auth-required nav item)"

key-files:
  created:
    - frontend/src/app/variants/page.tsx
    - frontend/src/app/variants/Variants.module.css
    - frontend/src/app/variants/[id]/page.tsx
    - frontend/src/app/variants/[id]/VariantPreview.module.css
  modified:
    - frontend/src/components/layout/MainLayout/MainLayout.tsx

key-decisions:
  - "Variants nav Link wrapped in {user && (...)} in both desktop and mobile — /variants is auth-required per D-09, consistent with /referral wrapping pattern in MainLayout"
  - "pluralChecks and getSectionBreakdown duplicated inline in both catalog and preview pages — Phase 3 two-page scope; extraction deferred to Phase 4 shared util if needed"
  - "Начать вариант Link points to /variants/[id]/attempt (Phase 4 route) — 404 in Phase 3 is intentional per UI-SPEC Student Preview Start Button Behavior"

# Metrics
duration: 20min
completed: 2026-05-15
---

# Phase 3 Plan 07: Student Catalog and Preview Summary

Student-facing variant catalog at `/variants` and per-variant preview at `/variants/[id]` delivered — 4 new files + 1 modified MainLayout — closing the Phase 3 loop. VARIANT-04 (catalog with section breakdown + check cost chip) and VARIANT-05 (preview with section list, task counts, cost callout, CTA) are complete. With Plan 07 done, all VARIANT-01 through VARIANT-05 requirements are delivered across Plans 02–07.

## Performance

- **Duration:** 20 min
- **Started:** 2026-05-15
- **Completed:** 2026-05-15
- **Tasks:** 2 (Task 3 is human-verify checkpoint, not implementation)
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments

- Created `frontend/src/app/variants/Variants.module.css`:
  - `.page`, `.container`, `.title`, `.subtitle`, `.grid` (auto-fill minmax 300px), `.card` (hover box-shadow), `.cardTitle` (18px semibold), `.cardMeta` (flex-wrap), `.sectionChip` (neutral #f3f4f6), `.checkCost` (accent #fdeeea/#eb5931), `.emptyState`, `.emptyTitle`, `.pagination`
  - `@media (max-width: 768px)`: padding 16px, grid 1 column

- Created `frontend/src/app/variants/page.tsx` (`'use client'`):
  - `VariantsCatalogPage`: state items/page/totalPages/loading; `fetchItems(p)` calls `variantsService.list(p)`
  - `getSectionBreakdown`: single-pass loop building section counts + AI_CHECK cost
  - `pluralChecks`: standard Russian mod10/mod100 numeral agreement
  - `SECTION_CATALOG_LABEL`: short labels (Ауд/Чт/Грам/Пис/Гов)
  - `SECTION_ORDER`: canonical exam order drives chip rendering
  - Loading skeleton: 6 grey cards; empty state: "Вариантов пока нет" + body copy; populated: card grid with section chips + optional check cost chip; pagination arrows when totalPages > 1
  - Cards are `<Link href="/variants/[id]">` — clickable to preview

- Created `frontend/src/app/variants/[id]/VariantPreview.module.css`:
  - `.page` (max-width 720px centered), `.back`, `.title`, `.description`, `.sectionList`, `.sectionRow`, `.sectionLabel`, `.sectionCount`, `.costCallout` (#fdeeea bg), `.costHighlight` (#eb5931), `.btn_start` (#111827 full-width)
  - `@media (max-width: 768px)`: padding 16px

- Created `frontend/src/app/variants/[id]/page.tsx` (`'use client'`):
  - `VariantPreviewPage`: `useParams<{ id: string }>()`, state variant/loading/error; `variantsService.getById(id)` on mount
  - Section breakdown computed inline; `visibleSections` filtered by count > 0
  - Russian task plural (задание/задания/заданий) applied per sectionRow
  - `SECTION_PREVIEW_LABEL`: full Russian labels (Аудирование/Чтение/Грамматика и лексика/Письмо/Говорение)
  - `pluralChecks` for check cost callout
  - `.costCallout` rendered only when checkCost > 0
  - "Начать вариант" `<Link>` to `/variants/[id]/attempt` (Phase 4 route — 404 acceptable)
  - Back link `← Варианты` present on both loaded and error states

- Modified `frontend/src/components/layout/MainLayout/MainLayout.tsx`:
  - Desktop nav: `{user && (<Link href="/variants" className={styles["main-layout__checks"]}>Варианты ЕГЭ</Link>)}` inserted between "Полезное" and "Пригласить друга"
  - Mobile menu: `{user && (<Link href="/variants" onClick={() => setMenuOpen(false)}>Варианты ЕГЭ</Link>)}` inserted at same position

- `npx tsc --noEmit` exits 0 (clean)
- `npm run build` exits 0; `/variants` compiled as `○` (static), `/variants/[id]` as `ƒ` (dynamic)

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create student catalog page and main-nav entry | 23541d7 | page.tsx, Variants.module.css, MainLayout.tsx |
| 2 | Create student variant preview page and CSS module | 50acaae | [id]/page.tsx, [id]/VariantPreview.module.css |

## Decisions Made

- `{user && (...)}` wrapping for `/variants` Link in both desktop and mobile nav — /variants is auth-required per D-09; follows the existing `/referral` wrapping pattern in MainLayout
- `pluralChecks` and `getSectionBreakdown` duplicated in both catalog and preview files — two pages, small functions, Phase 3 scope; no shared util extraction needed at this scale
- "Начать вариант" `<Link>` targets `/variants/[id]/attempt` — Phase 4 route, 404 is intentional per UI-SPEC; no disabled state or placeholder added

## Deviations from Plan

None — plan executed exactly as written.

## Security Mitigations Applied

| Threat ID | Status | Evidence |
|-----------|--------|---------|
| T-03-34 | Mitigated | No `dangerouslySetInnerHTML` in either page — variant title/description rendered via React JSX text nodes (React escapes) |
| T-03-35 | Inherited | Backend `listPublished` (Plan 02) filters `published: true`; frontend trusts backend filter; no client-side published toggle |
| T-03-37 | Inherited | Existing middleware.ts blocks unauthenticated access to all non-PUBLIC routes; /variants is not in PUBLIC_PAGES or PUBLIC_PREFIXES |

## Human-Verify Checkpoint

**Status: APPROVED** — developer verified all steps and approved.

The 14-step verification checklist covers:
1. Desktop nav shows "Варианты ЕГЭ" between "Полезное" and "Пригласить друга"
2. Catalog page title/subtitle
3. Card section breakdown chips (non-zero only, canonical order)
4. Check cost chip with correct Russian plural
5. Card click navigates to /variants/[id]
6. Preview page: back link, title, description, section list (full Russian labels)
7. Section rows show task counts with задание/задания/заданий plural
8. Cost callout with "Проверка письма и говорения: N чек(а/ов)"
9. "Начать вариант" CTA navigates to /attempt (Phase 4 404 — acceptable)
10. Back link returns to /variants
11. Pagination arrows (if >20 variants)
12. Empty state when no published variants
13. Auth boundary: unauthenticated navigates to /login
14. Mobile responsive: 1-column grid, "Варианты ЕГЭ" in mobile menu

## Known Stubs

None — all data is wired to real API calls (`variantsService.list` and `variantsService.getById`). No hardcoded empty values flow to UI rendering.

## Threat Flags

No new security surface introduced beyond the plan's threat register. Both pages are read-only (no user input, no mutations). Middleware already protects /variants routes.

## Self-Check: PASSED

Files verified:
- `frontend/src/app/variants/Variants.module.css` — exists, 6 required class definitions present, #fdeeea and #eb5931 color values present, @media (max-width: 768px) present
- `frontend/src/app/variants/page.tsx` — exists, 'use client', variantsService.list called, copy strings present, pluralChecks + getSectionBreakdown declared and used, SECTION_CATALOG_LABEL declared and used
- `frontend/src/app/variants/[id]/VariantPreview.module.css` — exists, 7 class blocks including .costCallout and .btn_start, #fdeeea and #111827 colors present
- `frontend/src/app/variants/[id]/page.tsx` — exists, 'use client', variantsService.getById called, all 5 Russian section labels present, Начать вариант and ← Варианты copy present, /attempt link present
- `frontend/src/components/layout/MainLayout/MainLayout.tsx` — 2 href="/variants" entries (desktop + mobile), 2 "Варианты ЕГЭ" text entries
- Commits 23541d7 and 50acaae verified in git log
- `npx tsc --noEmit` — exits 0
- `npm run build` — exits 0; /variants (static), /variants/[id] (dynamic)
