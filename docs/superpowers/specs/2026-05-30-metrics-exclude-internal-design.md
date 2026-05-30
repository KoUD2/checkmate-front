# V2.1 — Исключение внутренних аккаунтов из метрик

**Дата**: 2026-05-30
**Тип**: дизайн (доработка аналитики)
**Контекст**: метрики V1 на проде считают ВСЕХ юзеров, включая тестовые/QA/основательские аккаунты (на 2026-05-30: `direct: 57` из 62 — почти всё это внутренние). Это раздувает регистрации/активацию и портит anti-fraud guardrails. Нужно исключить внутренних из всех метрик.
**Предыдущий слой**: [[2026-05-30-admin-metrics-design]] (V1, на проде).

---

## Принятые решения

1. **Метка**: новое поле `User.isInternal Boolean @default(false)`. Явно, надёжно, управляемо из админки.
2. **Бэкфилл существующих**: вручную через тоггл в `/admin/users` (PATCH уже есть). Костя сам отметит ~57 своих аккаунтов. Без угадывания по email/домену.
3. **Где режем**: в чистой функции `computeMetrics` по флагу на `RawUser` — логика в одном месте, полностью юнит-тестируема без БД.

---

## Архитектура

### A. Схема (`backend/prisma/schema.prisma`)

В модель `User` добавить:

```prisma
  isInternal         Boolean        @default(false)
```

Аддитивная Prisma-миграция (`ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false`). Все существующие строки получат `false`. Безопасно, обратимо (drop column).

### B. Метрики — фильтрация (`backend/src/analytics/lib/metrics.ts`)

- `RawUser` получает новое поле `isInternal: boolean`.
- В начале `computeMetrics`: вычислить множество внутренних `userId` и **полностью исключить** этих юзеров и все их `tasks`/`payments` из дальнейших расчётов:
  ```
  const internalIds = new Set(users.filter(u => u.isInternal).map(u => u.id));
  const users    = input.users.filter(u => !internalIds.has(u.id));
  const tasks     = input.tasks.filter(t => !internalIds.has(t.userId));
  const payments  = input.payments.filter(p => !internalIds.has(p.userId));
  ```
  (имена локальных переменных уточнятся в плане, чтобы не конфликтовать с деструктуризацией `input`).
- Эффект: внутренние не попадают НИ В ОДНУ метрику — PAC, New/Retained/Reactivated, регистрации, каналы, активация, Free→Paid, тарифы, retention, ARPC, quality, revenue, MRR, DAU/WAU, guardrails.

### C. Сервис (`backend/src/analytics/analytics.service.ts`)

- В `user.findMany` select добавить `isInternal: true` и пробросить в `RawUser`.
- Сервис тянет ВСЕХ юзеров (включая внутренних), фильтрация — внутри `computeMetrics`. Так чистая функция остаётся единственным местом правды.

### D. Управление флагом (`backend/src/admin/`)

- `UpdateUserDto`: добавить
  ```ts
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
  ```
  (`updateUser` использует `data: dto` напрямую — поле прокинется само).
- `admin.service.ts`: в select-списки `updateUser` и `listUsers` добавить `isInternal: true`, чтобы фронт видел и возвращал актуальное значение.

### E. Фронтенд — тоггл (`/admin/users`)

В таблице пользователей добавить колонку «Внутренний» с чекбоксом, который дёргает существующий `PATCH /admin/users/:id` с `{ isInternal }` и обновляет строку. Паттерн — как у существующих правок юзера в админке.

---

## Тестирование

- Юнит-тест в `metrics.spec.ts`: internal-юзер с активной подпиской и ≥3 уникальными проверками в неделю **не попадает** в PAC, его регистрация не считается, его revenue не учитывается, его проверки не идут в guardrails. Не-internal юзер в том же наборе считается нормально.
- Существующие 23 теста должны остаться зелёными (новое поле `isInternal` в фикстурах `RawUser` — добавить `isInternal: false` в хелпер `user()`).
- Проверка сборки бэка/фронта.

---

## Деплой

Как V1: push master → ssh checkmate → `git pull` → `docker compose up -d --build`. Prisma-миграция применяется **автоматически**: Dockerfile бэка имеет `CMD ["sh","-c","node_modules/.bin/prisma migrate deploy && node dist/src/main.js"]` — при старте контейнера `migrate deploy` прогонит новую миграцию до запуска приложения. Ручной шаг не нужен.

Миграция создаётся как папка `backend/prisma/migrations/<timestamp>_add_user_is_internal/migration.sql` (формат как у существующих, напр. `20260518105004_add_checks_to_promo`).

После деплоя — Костя заходит в `/admin/users`, отмечает внутренние аккаунты, метрики очищаются на следующем запросе.

---

## Вне объёма (следующие волны V2)

- V2.2 — сегмент репетитор/ученик/родитель.
- V2.3 — честный churn (voluntary/involuntary) + 90-дневная reactivation.
- V2.4 — реальный UTM + paywall_shown + check_dispute.
- Автоопределение внутренних по домену/паттерну email — не делаем, только ручной флаг.
