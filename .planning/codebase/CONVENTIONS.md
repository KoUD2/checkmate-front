# Conventions
<!-- last_mapped: 2026-05-14 -->

## Backend (NestJS / TypeScript)

### TypeScript Config
- `strictNullChecks: false` — loose null checking in backend
- Strict TypeScript enabled on frontend

### File Naming
- `ClassName.method.ts` pattern (e.g., `users.service.ts`, `auth.controller.ts`)
- Frontend components: PascalCase files, prop interfaces in `[ComponentName].props.ts`

### Error Handling
- NestJS HTTP exceptions thrown in services (not controllers)
- `throw new HttpException(...)` / `throw new NotFoundException(...)` pattern

### Response Envelope
- Consistent `{ success, data }` response shape across API endpoints

### Logging
- `Logger` service (NestJS built-in) used for logging

### Path Aliases
- Backend: standard NestJS module resolution
- Frontend: `@/` alias mapped to `src/`

## Frontend (Next.js / TypeScript)

### Component Patterns
- `FC<Props>` or `(): JSX.Element` component typing
- Props defined in separate `[ComponentName].props.ts` files
- `handle[Action]` naming for event handlers (e.g., `handleSubmit`, `handleClick`)

### Styling
- CSS Modules with BEM-style class names
- Tab indentation in TSX files

### Code Style
- No Prettier config file found (backend has a `format` script but no config)

## Naming Conventions

| Scope | Convention | Example |
|-------|------------|---------|
| NestJS files | `name.type.ts` | `users.service.ts` |
| React components | PascalCase | `TaskCard.tsx` |
| Component props | `[Name].props.ts` | `TaskCard.props.ts` |
| Event handlers | `handle[Action]` | `handleSubmit` |
| API responses | `{ success, data }` | `{ success: true, data: {...} }` |

---
*Mapped: 2026-05-14*
