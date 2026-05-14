# Testing
<!-- last_mapped: 2026-05-14 -->

## Current State

**No tests exist in this codebase.**

- Zero spec/test files found anywhere (confirmed via `find`)
- `@nestjs/testing` is listed in `devDependencies` but never used
- No Jest config, no Vitest config, no test runner configured
- Frontend has no testing libraries in `package.json`

## Framework Available (Backend)

- `@nestjs/testing` — NestJS test utilities available but unused
- Jest would be the natural choice given NestJS defaults

## Framework Available (Frontend)

- No testing libraries installed in frontend `package.json`
- Vitest or Jest + React Testing Library would be typical additions

## Coverage

- Unit tests: 0%
- Integration tests: 0%
- E2E tests: 0%

## Notes

Testing infrastructure needs to be set up from scratch. Recommend adding:
- Backend: Jest + `@nestjs/testing` (already installed)
- Frontend: Vitest + React Testing Library

---
*Mapped: 2026-05-14*
