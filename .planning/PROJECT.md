# CheckMate — ЕГЭ Variants

## What This Is

CheckMate is a Russian-language SaaS platform for AI-powered ЕГЭ English preparation. Students currently submit individual writing and speaking tasks (37–42) for criterion-by-criterion AI grading. This milestone adds full exam variants: users can pass a complete ЕГЭ English variant (all 42 tasks), receive instant auto-checking for tasks 1–36, and AI-graded feedback for tasks 37–42 with ФИПИ primary-to-scaled score conversion.

## Core Value

Students can practice a full ЕГЭ English exam from start to result — with instant scoring and AI feedback — exactly as they would on the real exam day.

## Requirements

### Validated

(Existing CheckMate capabilities)

- ✓ User can register and log in (email/password, VK, Yandex OAuth) — existing
- ✓ User can submit individual tasks 37–42 for AI grading — existing
- ✓ User can view criterion-by-criterion AI feedback per task — existing
- ✓ User can buy checks/subscription via YooKassa — existing
- ✓ Admin can manage users, promo codes, view platform stats — existing
- ✓ Resource library (articles, checklists, trainers, templates) — existing
- ✓ Referral system with bonus checks — existing

### Active

(This milestone — ЕГЭ Variants)

- [ ] Admin can create and manage exam task bank (6 formats: MCQ, Matching, True/False, Open Cloze, Word Formation, AI-check)
- [ ] Admin can upload audio files for listening tasks via Yandex Object Storage presigned URL
- [ ] Admin can compose a variant by selecting tasks from the bank and ordering them
- [ ] Admin can publish/unpublish variants
- [ ] User can browse the catalog of published variants
- [ ] User can start a variant attempt and have progress auto-saved per answer
- [ ] User can navigate between tasks in any order within an attempt
- [ ] User can skip the optional writing (37–38) and speaking (39–42) sections
- [ ] User can submit the completed attempt
- [ ] Tasks 1–36 are auto-checked instantly on submit using answer keys
- [ ] Tasks 37–42 are sent for AI grading (via existing TasksService) with checks deducted at submit
- [ ] User sees an interim result (tasks 1–36 score) while AI is processing
- [ ] User sees a full result page: primary score per section, ФИПИ scaled score, per-task breakdown with correct answers
- [ ] AI feedback and criterion scores for tasks 37–42 are shown in the result page
- [ ] Score conversion uses the ФИПИ 2024 primary→scaled table (stored as a constant)
- [ ] If user has no checks, writing/speaking sections show upsell prompt instead of submitting

### Out of Scope

- Timer — deferred to next milestone
- Per-task trainer / individual task practice mode — deferred to next milestone
- AI-generated tasks — deferred to next milestone
- Public task bank visible to students — deferred to next milestone
- OAuth login (already exists, not in scope for this milestone)

## Context

- **Existing AI pipeline**: `TasksService` + `GeminiService` already handle tasks 37–42 end-to-end. Variants reuse this — `AttemptAnswer.linkedTaskId` stores the created `Task.id` for each AI-graded answer.
- **CDN**: Yandex Object Storage (S3-compatible) for audio files. Backend generates presigned upload URLs; `ExamTask.audioUrl` stores the result. MP3, max 15 MB.
- **Check deduction timing**: Checks for tasks 37–42 are deducted at attempt submit (when AI processing starts), not when the user enters the section.
- **Score scale**: ФИПИ 2024 primary→scaled constant lives in backend code. Max 100 primary = 100 scaled; tasks 1–36 ceiling is 58 primary.
- **Stack**: NestJS 11 + Prisma 6 + PostgreSQL 16 (backend), Next.js 16 App Router (frontend), Docker Compose deployment on `app.checkmateai.ru`.

## Constraints

- **Stack**: NestJS / Next.js / Prisma — no new frameworks; extend existing modules
- **AI model**: Existing `GeminiService` with `gpt-5.4-mini` — reuse as-is for tasks 37–42
- **Storage**: Yandex Object Storage (S3-compatible) — new dependency for audio CDN
- **Deployment**: Docker Compose on existing server — no infra changes beyond env vars

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Reuse existing TasksService for AI tasks in variants | Avoids duplicating grading logic; `AttemptAnswer.linkedTaskId` links to created Task | — Pending |
| Checks deducted at submit, not section entry | Consistent with current per-task flow; user only pays when AI actually starts | — Pending |
| Yandex Object Storage for audio CDN | Already have Yandex infra (OAuth, Metrika); simpler ops | — Pending |
| ФИПИ scale stored as code constant, not DB table | Rarely changes; no admin UI overhead | — Pending |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-14 after initialization*
