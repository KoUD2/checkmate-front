---
phase: 04-exam-player
plan: "00"
subsystem: backend/schema + backend/tests
tags:
  - prisma
  - jest
  - attempts
  - wave-0
  - schema
dependency_graph:
  requires:
    - "03-07-PLAN.md (VariantAttempt model base)"
  provides:
    - "VariantAttempt.skippedSections ExamSection[] column contract"
    - "AttemptsService test contract (7 it.todo placeholders)"
    - "AttemptsController test contract (5 it.todo placeholders)"
  affects:
    - "backend/prisma/schema.prisma (Plan 01 will migrate)"
    - "backend/src/attempts/ (Plans 02 and 04 fill in spec stubs)"
tech_stack:
  added: []
  patterns:
    - "Prisma native array column (ExamSection[] without @default)"
    - "Jest it.todo() skeleton spec pattern (mirrors Phase 3 Plan 01)"
key_files:
  created:
    - backend/src/attempts/attempts.service.spec.ts
    - backend/src/attempts/attempts.controller.spec.ts
  modified:
    - backend/prisma/schema.prisma
decisions:
  - "skippedSections ExamSection[] has no @default — PostgreSQL arrays default to {} at the DB layer"
  - "AttemptsService import commented out with TODO(plan-02) marker so spec compiles before service exists"
  - "AttemptsController imports commented out with TODO(plan-04) markers"
  - "node_modules symlink created in worktree for Jest execution (not committed — gitignored)"
metrics:
  duration: "3 minutes"
  completed: "2026-05-15"
  tasks: 3
  files: 3
---

# Phase 04 Plan 00: Wave-0 Schema + Spec Skeletons Summary

Wave-0 of Phase 4 established the data contract (`skippedSections ExamSection[]` on `VariantAttempt`) and test contract (12 `it.todo()` placeholders across two spec files) before any service or controller code is written.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add skippedSections field to VariantAttempt model | 9593b51 | backend/prisma/schema.prisma |
| 2 | Create attempts.service.spec.ts skeleton (7 todos) | dcb403b | backend/src/attempts/attempts.service.spec.ts |
| 3 | Create attempts.controller.spec.ts skeleton (5 todos) | 2fa04d1 | backend/src/attempts/attempts.controller.spec.ts |

## Schema Change

Added one field to `model VariantAttempt` in `backend/prisma/schema.prisma`:

```diff
+  skippedSections  ExamSection[]
```

Inserted between `updatedAt DateTime @updatedAt` and the relations block, matching column-then-relations ordering of surrounding models. No `@default` clause — Prisma 6 PostgreSQL arrays default to empty `{}` at the DB layer (consistent with D-13 in CONTEXT.md).

## Spec File Stats

| File | Lines | it.todo count | Requirement IDs covered |
|------|-------|---------------|------------------------|
| attempts.service.spec.ts | 32 | 7 | ATTEMPT-01, 02, 04, 06, 07, 09, IDOR |
| attempts.controller.spec.ts | 11 | 5 | ATTEMPT-04, ATTEMPT-06, Auth bypass |

## Verification Results

- `DATABASE_URL=postgresql://localhost/dummy prisma validate` → `The schema at backend/prisma/schema.prisma is valid`
- `grep -c "skippedSections" backend/prisma/schema.prisma` → `1`
- `npx jest --testPathPattern attempts.service.spec --passWithNoTests` → `Tests: 7 todo, 7 total`
- `npx jest --testPathPattern attempts.controller.spec --passWithNoTests` → `Tests: 5 todo, 5 total`
- `npx jest --testPathPattern attempts --passWithNoTests` → `Tests: 12 todo, 12 total`
- Only `.spec.ts` files in `backend/src/attempts/` — no source files yet

## Deviations from Plan

None — plan executed exactly as written.

The `node_modules` symlink (from worktree `backend/` to main repo `backend/node_modules/`) was created as a dev-only workaround since worktrees do not have their own `node_modules`. It is untracked (the root `.gitignore` has `node_modules/`) and was not committed.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries beyond what the plan declared. The `skippedSections` column is a pure array column on an existing model — no new trust boundary introduced.

## Self-Check: PASSED

- [x] `backend/prisma/schema.prisma` modified — exists and contains `skippedSections`
- [x] `backend/src/attempts/attempts.service.spec.ts` exists
- [x] `backend/src/attempts/attempts.controller.spec.ts` exists
- [x] Commit `9593b51` exists (schema)
- [x] Commit `dcb403b` exists (service spec)
- [x] Commit `2fa04d1` exists (controller spec)
