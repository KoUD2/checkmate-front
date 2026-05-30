# Метрики Checkmate в собственной админке — дизайн

**Дата**: 2026-05-30
**Тип**: дизайн (архитектура аналитики)
**Контекст**: переход с PostHog на самостоятельный подсчёт всех метрик дерева в собственной админке. Никаких сторонних ресурсов.
**Источник дерева**: `ClaudeCheckMateMain/Checkmate/wiki/synthesis/metrics-tree.md` (NSM = PAC, дерево из 3 веток).

---

## Цель

Считать и показывать дерево метрик (NSM = PAC + декомпозиция) полностью внутри продукта: данные из собственной Postgres, вычисления на бэке (NestJS), отображение в существующей админке (Next.js + recharts). PostHog удаляется целиком.

## Принятые решения

1. **Движок: on-demand из сырых данных.** Эндпоинт считает агрегации живыми запросами при открытии дашборда. Ноль новых таблиц, ноль крона. История любой недели выводится из таймстемпов `User/Task/Subscription/Payment` задним числом. Кэш не добавляем (введём позже, если запросы начнут тормозить).
2. **Объём v1: только то, что считается из существующих данных.** Метрики, требующие правок продукта/схемы (сегмент, настоящий UTM, paywall-знаменатель, явный dispute, причина churn), выносятся в v2 отдельной фазой.
3. **Quality в v1 — прокси.** `check_failed` нигде в БД нет (было чисто PostHog-событие, упавшие проверки строк не создают). Вместо «% успешных проверок» используем рейтинг `LIKE/DISLIKE` и средний `totalScore`. Логирование упавших проверок — v2.

---

## Архитектура

### Бэкенд

Новый модуль `backend/src/analytics/`:

- `analytics.module.ts` — модуль, импортирует `PrismaModule`.
- `analytics.controller.ts` — `GET /admin/analytics?from=<ISO>&to=<ISO>` под `JwtAuthGuard` + `RolesGuard(Role.ADMIN)` (та же связка, что в `admin.controller.ts`).
- `analytics.service.ts` — оркестратор: принимает диапазон, возвращает единый JSON со всеми метриками дерева.
- `lib/` — чистые функции без БД, юнит-тестируемые отдельно:
  - `coverage.ts` — реконструкция интервалов покрытия подписки из платежей.
  - `text-hash.ts` — нормализация и хеш текста для дедупликации.
  - `weeks.ts` — нарезка диапазона на ISO-недели (нед. = пн 00:00 — вс 23:59:59, TZ проекта).

Сервис тянет нужные срезы (`User`, `Task`, `Subscription`, `Payment`) и считает метрики в TS поверх них. Тяжёлые группировки по дням/неделям — через Prisma `groupBy` / `$queryRaw`, где это уместно; дедупликация по хешу текста — в TS (текст в БД, хешируем на лету).

### Фронтенд

Расширяем существующий `frontend/src/components/screens/AdminDashboard/AdminDashboard.tsx`:

- Блок NSM сверху: текущий PAC + WoW-дельта + спарклайн по неделям.
- Три раскрывающихся секции дерева: New PAC / Retained PAC / Reactivated PAC с их узлами.
- Секция Backup-метрик (revenue, MRR-экв, DAU/WAU) и Anti-fraud guardrails.
- Фильтр диапазона дат (по умолчанию — последние 8 недель).
- Графики на recharts (уже в зависимостях). Новых библиотек не добавляем.

Данные тянутся через существующий прокси `frontend/src/shared/utils/api.ts` (`/api/proxy` → бэк), `Authorization: Bearer`.

---

## Определения метрик (v1)

Везде «неделя» = ISO-неделя (пн 00:00 — вс 23:59:59) в таймзоне `Europe/Moscow` (зафиксировать на этапе плана, если у проекта иная). «Проверка» = строка `Task`.

### Уникальность проверки (для PAC и guardrails)

```
normalize(text) = collapseWhitespace(trim(lowercase(text)))
hash(text) = sha256(normalize(text))
текст проверки = Task.solution, иначе Task.transcription (для аудио-заданий)
```

Проверка считается **значимой**, если `length(normalize(text)) >= 50`. Проверки короче — исключаются из счёта уникальных (но видны в guardrails как сигнал накрутки). «≥3 уникальных проверки за неделю» = ≥3 различных `hash` среди значимых проверок пользователя за неделю.

### Реконструкция покрытия подписки

`Subscription` хранит только текущее `isActive` + `expiresAt`, поэтому историческое состояние реконструируем из `Payment`. Алгоритм **точно воспроизводит** боевую `SubscriptionsService.addDaysToSubscription` (проверено по `backend/src/subscriptions/subscriptions.service.ts` и success-путям `payments.service.ts:113,160`):

- учитываем только платежи `status = SUCCEEDED` **и** `daysToAdd > 0` (платежи с `daysToAdd = 0` — это разовые пакеты проверок: они инкрементят `freeChecksLeft`, подписку не трогают);
- момент применения платежа = `successTime` = `Payment.updatedAt` (когда статус переключился на SUCCEEDED), с фолбэком на `createdAt`. Это соответствует `now` в боевом коде;
- продление: если на `successTime` подписка истекла (или её не было) — старт «с нуля» от `successTime`; иначе — продление от текущего `expiry`. Это в точности `expiresAt < now ? now : expiresAt` из кода.

```
платежи пользователя: status=SUCCEEDED И daysToAdd>0, отсортированы по successTime
intervals = []
expiry = null
для каждого платежа p:
    t = successTime(p)                       # updatedAt, фолбэк createdAt
    если expiry == null ИЛИ expiry < t:      # боевой «fresh start» (expiresAt < now)
        expiry = addDays(t, p.daysToAdd)
        intervals.push({ start: t, end: expiry })
    иначе:                                    # боевое «extend from current expiry»
        expiry = addDays(expiry, p.daysToAdd)
        intervals[last].end = expiry
покрытие = intervals (разрывы между ними = периоды churn)
```

Пользователь считается платным на конец недели W, если `weekEnd(W)` попадает в один из интервалов покрытия.

**Edge case (зафиксирован осознанно):** покупатели только пакетов проверок (`daysToAdd = 0`, без подписки) в PAC не попадают — PAC по определению требует активной подписки Plus/Pro. Если в будущем check-packs захотим считать «платными», это меняет определение PAC и решается отдельно.

### NSM и ветки

| Метрика | Определение |
|---|---|
| **PAC (week W)** | число уник. пользователей, у кого `weekEnd(W)` в покрытии подписки **И** ≥3 уникальных значимых проверки за W |
| **WoW PAC growth %** | `(PAC[W] − PAC[W−1]) / PAC[W−1]` |
| **New PAC** | стали PAC на W, не были PAC на W−1 |
| **Retained PAC** | были PAC на W−1 и на W |
| **Reactivated PAC (база)** | стали PAC на W, имели разрыв покрытия (churn) до этого |
| **Weekly Registrations** | `count(User where createdAt in W)` |
| — канал (грубо) | referral-код → «referral/амбассадор»; иначе соц-id на момент регистрации → «соцсеть»; иначе «прямой». Помечается как приблизительный (точный UTM — v2) |
| **Activation Rate** | `% регистраций с ≥1 проверкой в течение 7 дней после createdAt` |
| **Free→Paid CR** | `% активированных с SUCCEEDED-платежом в течение 30 дней после активации` |
| — микс тарифов | вывод из `(checksToAdd, daysToAdd)` по тому же маппингу, что `salesByPackage` в `admin.service.ts` (Lite/Plus/Pro/Ultra/Mega) |
| **Weekly Subscription Retention** | `% платных на W−1, оставшихся платными на W` (по покрытию) |
| **Engagement Depth / ARPC** | сред. число уникальных значимых проверок на платного пользователя за неделю |
| **Quality (прокси)** | `DISLIKE / (LIKE + DISLIKE)` по `Task.userRating` + сред. `totalScore` |

### Backup-метрики

| Метрика | Определение |
|---|---|
| **Revenue (период)** | `sum(Payment.amount where status=SUCCEEDED, createdAt in период)` |
| **MRR-эквивалент** | trailing-30-day revenue (модель не чисто подписочная — помечается как прокси) |
| **DAU / WAU** | уник. пользователи с ≥1 проверкой за день / неделю (= активные чекеры; общих pageview-событий без PostHog нет) |

### Anti-fraud guardrails

| Guardrail | Норма | Расчёт |
|---|---|---|
| % проверок с дублем текста | < 5% | доля значимых проверок, чей `hash` встречается у того же пользователя > 1 раза |
| Медианная длина текста | > 100 симв | медиана `length(normalize(text))` по проверкам периода |
| % коротких проверок (< 50 симв) | низкая | доля незначимых проверок |

---

## Форма ответа API (эскиз)

```jsonc
GET /admin/analytics?from=2026-04-01&to=2026-05-30
{
  "range": { "from": "...", "to": "...", "weeks": ["2026-W14", ...] },
  "nsm": {
    "pacByWeek": [{ "week": "2026-W14", "pac": 0, "new": 0, "retained": 0, "reactivated": 0 }],
    "current": 0, "wowGrowthPct": 0
  },
  "newPac":   { "registrationsByWeek": [...], "byChannel": {...}, "activationRate": 0, "freeToPaidCR": 0, "tariffMix": {...} },
  "retained": { "subscriptionRetentionByWeek": [...], "arpc": 0, "engagementDepth": 0, "quality": { "dislikeRate": 0, "avgScore": 0 } },
  "backup":   { "revenue": 0, "mrrEquivalent": 0, "dauByDay": [...], "wauByWeek": [...] },
  "guardrails": { "duplicateTextRate": 0, "medianTextLength": 0, "shortCheckRate": 0 }
}
```

Точные имена полей фиксируются на этапе плана.

---

## Снос PostHog

Удаляется полностью:

- `frontend/src/components/PostHogProvider.tsx` — файл целиком.
- Обёртка `<PostHogProvider>` в layout.
- Все `posthog.capture(...)` (10 мест): `AuthContext.tsx` (user_registered, user_logged_in), `TaskCheckContext.tsx` (check_started, check_completed, user_activated, check_failed), `SubscribePage.tsx` (subscription_page_viewed, promo_activated), `payment.service.ts` (payment_started), `SocialConnect.tsx` (social_connected).
- Все `posthog.identify(...)`.
- Пакет `posthog-js` из `package.json`.
- Ключ/хост PostHog (захардкожены в провайдере) и любые связанные env.

После сноса ни одного обращения к стороннему аналитическому сервису не остаётся.

---

## Отложено в v2 (требует правок продукта/схемы)

- `User.segment` (репетитор/ученик/родитель) + вопрос в онбординге → разрез узла 1.4.
- Настоящая UTM/channel-атрибуция на регистрации → точный канал в 1.1.
- `paywall_shown` / `check_limit_hit` → корректный знаменатель Free→Paid.
- Явный `check_dispute` → метрика «% жалоб на точность ИИ» вместо прокси.
- Разделение voluntary / involuntary churn (нужна причина отмены).
- Логирование упавших проверок в БД → честный «% успешных проверок».
- Углублённый Reactivation (90-дневное окно, reactivation→PAC).
- Опциональная оптимизация: `Task.textHash` колонкой + бэкофилл, если on-the-fly хеширование начнёт тормозить.

---

## Тестирование

- Юнит-тесты на чистые функции: `coverage.ts` (интервалы, разрывы, продление), `text-hash.ts` (нормализация, порог 50), `weeks.ts` (границы ISO-недель, TZ).
- Тесты сервиса на фикстурах БД: контрольный набор пользователей/задач/платежей с заранее посчитанным PAC и ретеншеном.
- Проверка эндпоинта: только ADMIN, валидация диапазона дат.

## Вне объёма

- Real-time стриминг метрик.
- Экспорт/выгрузки.
- A/B-инфраструктура.
- Любые сторонние аналитические сервисы.
