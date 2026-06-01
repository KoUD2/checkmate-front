# V2.2 — Сегмент пользователя (репетитор/ученик/родитель)

**Дата**: 2026-05-30
**Тип**: дизайн (доработка продукта + аналитики)
**Контекст**: дерево метрик (узел 1.4) требует разреза «кого тащить» — какой сегмент лучше конвертируется в PAC. Сейчас сегмента в данных нет. Собираем его ненавязчиво и режем метрики по нему.
**Предыдущие слои**: [[2026-05-30-admin-metrics-design]] (V1), [[2026-05-30-metrics-exclude-internal-design]] (V2.1).

---

## Принятые решения

1. **Где спрашиваем**: баннер в личном кабинете (главный экран `Main`, `/`), показывается пока сегмент не заполнен. НЕ трогаем форму регистрации → воронка не страдает.
2. **Варианты**: ровно три — `TUTOR` / `STUDENT` / `PARENT` (репетитор/ученик/родитель). Пока не ответил — `null` («не указан»).
3. **Разрез в метриках**: (1) распределение всех юзеров по сегментам + (2) PAC по сегменту **суммарно за весь выбранный период** (стабильнее на малых данных, отвечает «кто конвертируется»).

---

## Архитектура

### A. Схема (`backend/prisma/schema.prisma`)

```prisma
enum Segment {
  TUTOR
  STUDENT
  PARENT
}
```

В модель `User` добавить:

```prisma
  segment            Segment?
```

Nullable = «не указан». Аддитивная миграция `backend/prisma/migrations/<timestamp>_add_user_segment/migration.sql` (CREATE TYPE + ADD COLUMN). Авто-применяется контейнером (`prisma migrate deploy` в CMD).

### B. Бэкенд — приём сегмента

- DTO `backend/src/users/dto/set-segment.dto.ts`: `{ segment: Segment }` с `@IsEnum(Segment)`.
- Эндпоинт `PATCH /users/me/segment` в `UsersController` под `JwtAuthGuard` (любой залогиненный, не только admin). Берёт userId из JWT, пишет `user.segment`. Возвращает `{ success: true, data: { segment } }`.
- Сверить, как сейчас устроен `UsersController`/`UsersService` и паттерн «текущий юзер из токена» (декоратор/req.user) — следовать ему.

### C. Фронтенд — баннер сбора

- `User`-интерфейс (`AuthContext.tsx`): добавить `segment: 'TUTOR' | 'STUDENT' | 'PARENT' | null`.
- Источник `user` (то, чем фронт грузит профиль — `/auth/me` или аналог) должен начать отдавать `segment`. Сверить бэкенд-сериализацию юзера и добавить поле.
- Компонент баннера на экране `Main`: показывается если `user && user.segment == null`. Заголовок «Кто вы?», три кнопки (Репетитор/Ученик/Родитель) + «Позже».
  - Клик по сегменту → `PATCH /users/me/segment` → `refreshUser()` → баннер исчезает (segment больше не null).
  - «Позже» → локально скрыть на текущую сессию (state), баннер вернётся при следующем заходе пока segment null. Без записи в БД.

### D. Метрики — разрез по сегменту (`backend/src/analytics/lib/metrics.ts`)

- `RawUser.segment: 'TUTOR' | 'STUDENT' | 'PARENT' | null` добавить в тип.
- В `MetricsResponse` добавить блок `segments`:
  ```ts
  segments: {
    // распределение всех (не-internal) юзеров периода по сегментам
    distribution: { TUTOR: number; STUDENT: number; PARENT: number; unknown: number };
    // PAC суммарно за весь период (уникальные PAC-юзеры), разбитые по сегменту
    pacBySegment: { TUTOR: number; STUDENT: number; PARENT: number; unknown: number };
  }
  ```
- `distribution`: считается по `usersInRange` (тем, что уже отфильтрованы от internal в V2.1), сегмент `null` → `unknown`.
- `pacBySegment`: объединить множества PAC-юзеров по всем неделям диапазона в один Set уникальных userId (кто был PAC хоть на одной неделе), затем разбить по `segment`. Внутренние уже исключены фильтром V2.1.

### E. Сервис + админка

- `AnalyticsService`: добавить `segment: true` в `user.findMany` select, пробросить в `RawUser`.
- `AdminMetrics.tsx`: две новые таблички — «Сегменты (все юзеры)» (distribution) и «PAC по сегменту» (pacBySegment). Лейблы: Репетитор/Ученик/Родитель/Не указан. Без новых графиков.

---

## Тестирование

- Юнит в `metrics.spec.ts`:
  - распределение по сегментам считается верно, включая `null`→`unknown`;
  - `pacBySegment` режет PAC-юзеров (уникальных за период) по сегменту;
  - internal-юзеры (V2.1) не попадают ни в distribution, ни в pacBySegment.
- Обновить `user()`-хелпер: добавить `segment: null` в дефолт (RawUser стал строже).
- Существующие 24 теста зелёные.
- Сборка бэка/фронта, tsc чист.
- Smoke: `PATCH /users/me/segment` пишет значение; `/admin/analytics` возвращает блок `segments`.

---

## Деплой

push master → ssh checkmate → git pull → `docker compose up -d --build`. Миграция (CREATE TYPE Segment + ADD COLUMN) применяется авто через CMD контейнера. На проде дрейфа миграций нет (проверено в V2.1).

После деплоя: юзеры при заходе увидят баннер и постепенно проставят сегмент; админ-метрики покажут распределение и PAC-разрез по мере накопления ответов.

---

## Вне объёма (следующие волны)

- V2.3 — честный churn (voluntary/involuntary) + 90-дневная reactivation.
- V2.4 — реальный UTM + paywall_shown + check_dispute.
- Принудительный сбор сегмента в онбординге/регистрации (выбрали баннер, не блокирующий).
- Разрез других метрик (активация, Free→Paid) по сегменту — пока только distribution + PAC.
