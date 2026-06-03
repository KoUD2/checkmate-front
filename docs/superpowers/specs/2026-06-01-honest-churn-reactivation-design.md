# V2.3 — Честный churn + reactivation (дизайн)

**Дата:** 2026-06-01
**Тип:** дизайн фичи (волна V2.3 дерева метрик)
**Статус:** одобрено пользователем, готово к написанию плана
**Репозиторий:** `~/Desktop/CheckMate` (продукт), модуль `backend/src/analytics/`

---

## Контекст и постановка

Дерево метрик Checkmate дорабатывается волнами. V2.1 (исключить внутренних) и V2.2 (сегмент) — на проде. V2.3 углубляет две ветки дерева: **отток (churn)** и **reactivation**.

### Ключевое уточнение платёжной модели

Подписка в Checkmate — это **разовые пополнения**, а не авто-продление:
- Платёж ЮКассы → `SubscriptionsService.addDaysToSubscription` продлевает `expiresAt`. Рекуррентного списания с карты **нет**.
- Явной кнопки «отменить» **нет**. `Subscription.isActive` гаснет лениво, когда `expiresAt < now` (в `getMySubscription`).

Следствие: **классический voluntary/involuntary churn здесь неприменим** — нет авто-списания (нечему «отвалиться») и нет кнопки отмены (нечего «отменять»). Любой churn = «подписка истекла и юзер не докупил».

Поэтому «честный churn» в V2.3 = **exit-survey при лапсе**: когда подписка истекла и юзер возвращается, ненавязчиво спрашиваем причину. Это даёт voluntary-причину без введения авто-продления.

---

## Scope

1. Захват причины отмены через exit-survey (баннер на главной) + хранение в новой таблице.
2. Блок «отток: причины» в админской аналитике.
3. Углубление ветки Reactivated: сплит warm (≤90 дней) / cold (>90 дней) по длине разрыва PAC.

### Вне scope (YAGNI → кандидаты в V2.4+)
- Win-back офферы / скидки, триггерящиеся по причине отмены.
- Voluntary/involuntary различение (платёжная модель не поддерживает).
- Response-rate знаменатель оттока (ответивших / всех залапсивших).
- Авто-продление подписки (отдельная крупная фича оплаты).

---

## 1. Модель данных (Prisma)

```prisma
enum CancelReason {
  PRICE              // Дорого
  NO_NEED_NOW        // Не нужно сейчас / сезон закончился
  MISSING_FEATURES   // Не хватает функций
  QUALITY            // Качество проверки не устроило
  TECH_ISSUES        // Технические проблемы
  SWITCHED           // Ушёл к конкуренту
  OTHER              // Другое (+ comment)
}

model CancelFeedback {
  id        String       @id @default(uuid())
  userId    String
  reason    CancelReason
  comment   String?      // заполняется в основном для OTHER
  createdAt DateTime     @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
  @@map("cancel_feedback")
}
```

- Append-only журнал: юзер может лапсить несколько раз → несколько строк, история churn сохраняется.
- Обратная связь в `User` модель: добавить `cancelFeedback CancelFeedback[]`.
- Миграция: `backend/prisma/migrations/<timestamp>_add_cancel_feedback/migration.sql`. Применяется **авто** через Dockerfile бэка (`prisma migrate deploy`), ручной шаг не нужен.

---

## 2. Backend API

### `POST /users/me/cancel-feedback` (auth)
- Body: `{ reason: CancelReason, comment?: string }`.
- Валидация: `reason` ∈ enum (DTO с `@IsEnum`); `comment` опционален, обрезается до 500 символов.
- Создаёт строку `CancelFeedback` для текущего юзера. Идемпотентность не требуется — повторная отправка просто добавит строку (на практике фронт гасит баннер после первого ответа; защита от двойного клика — `disabled` на время запроса).

### Флаг показа баннера — расширение `getMySubscription`
Вместо нового эндпоинта добавляем в ответ `getMySubscription` поле:
```ts
churnSurveyPending: boolean
```
Истина, когда:
- `expiresAt != null && expiresAt < now` — подписка реально была и истекла; **И**
- нет строки `CancelFeedback` с `createdAt >= expiresAt` (за текущий лапс ещё не отвечали).

Обоснование: Main и так читает подписку; отдельный round-trip не нужен. Логика «показывать ли» остаётся на сервере.

---

## 3. Аналитика (дерево метрик)

Файл `backend/src/analytics/lib/metrics.ts`, чистые функции под jest.

### (a) Сплит reactivation warm/cold

Текущая логика (`metrics.ts` ~179–195): юзер `reactivated`, если PAC на этой неделе, был PAC раньше (`everPac`), но не на прошлой неделе (`prevPac`) — любой разрыв ≥1 недели.

Доработка: вести `lastPacWeekEnd: Map<userId, number>` (timestamp конца последней PAC-недели). Когда юзер снова становится PAC после разрыва:
- `gapDays = (currentWeekEnd − lastPacWeekEnd) / MS_DAY`
- `gapDays ≤ 90` → `reactivatedWarm`, иначе `reactivatedCold`.
- Обновлять `lastPacWeekEnd` для каждого PAC-юзера каждую неделю.

Интерфейс `PacWeek` расширяется:
```ts
interface PacWeek {
  week: string;
  pac: number;
  new: number;
  retained: number;
  reactivated: number;       // = reactivatedWarm + reactivatedCold (обратная совместимость)
  reactivatedWarm: number;   // gap ≤ 90 дней
  reactivatedCold: number;   // gap > 90 дней
}
```

> ⚠️ **Известное ограничение (наследуется от текущего поведения):** окно reactivation считается только **в пределах запрошенного диапазона** — `everPac` и история PAC до `from` не реконструируются. Юзер, бывший PAC до начала диапазона и вернувшийся внутри, классифицируется как `new`, а не reactivated. Сплит warm/cold не вносит новой неточности — он работает поверх уже существующей внутридиапазонной логики. Точное историческое окно — отдельная задача (потребует чтения покрытия до `from`).

### (b) Блок `churn`

Новая секция в `MetricsResponse`:
```ts
churn: {
  reasonDistribution: Record<CancelReason, number>; // ответы за [effFrom, effEnd)
  totalResponses: number;
};
```
- Считается из `CancelFeedback`, отфильтрованных по `createdAt ∈ [effFrom, effEnd)`.
- `MetricsInput` расширяется полем `cancelFeedback: RawCancelFeedback[]`; сервис аналитики (`analytics.service.ts`) грузит строки из Prisma и передаёт в `computeMetrics`.
- Internal-юзеры исключаются тем же фильтром `internalIds`, что и остальные сущности (`isInternal` побеждает).

---

## 4. Frontend — exit-survey баннер

> **ЧЕКПОИНТ ДИЗАЙНА:** UI/вёрстку баннера (`ChurnSurveyBanner`) делает пользователь самостоятельно через Claude Design и присылает итог. На этапе реализации фронта исполнитель **останавливается** и ждёт готовый дизайн от Кости, прежде чем писать компонент/CSS. Описание ниже — функциональный контракт, не финальная вёрстка.

- Компонент `frontend/src/components/screens/Main/ui/ChurnSurveyBanner/` по образцу `SegmentBanner`.
- Показ при `churnSurveyPending === true`.
- 6 кнопок-причин (PRICE, NO_NEED_NOW, MISSING_FEATURES, QUALITY, TECH_ISSUES, SWITCHED) + «Другое» (раскрывает текст-инпут для `comment`).
- «Позже» / крестик — dismiss в `useState` на сессию (как у SegmentBanner; насовсем гаснет, когда `churnSurveyPending` станет false после ответа).
- On choose → `POST /users/me/cancel-feedback` → `refreshUser`/перечитать подписку → баннер скрывается.
- **Приоритет баннеров:** если одновременно pending и сегмент-баннер, и churn-survey — показываем **churn первым** (segment придерживаем до следующего захода).

---

## 5. Админка (`AdminMetrics`)

Файл `frontend/src/components/screens/AdminMetrics/`, recharts.

- Карточка **«Отток: причины»** — распределение `reasonDistribution` (bar chart) + подпись «всего ответов: N».
- В ветке Reactivated — отображение `reactivatedWarm` (≤90д) vs `reactivatedCold` (>90д): отдельная карточка или разбивка существующего reactivation-показателя.

---

## 6. Тестирование

- `backend/src/analytics/lib/metrics.spec.ts` — новые кейсы:
  - reactivation warm: PAC → разрыв ≤90 дней → PAC снова ⇒ `reactivatedWarm === 1`.
  - reactivation cold: PAC → разрыв >90 дней → PAC снова ⇒ `reactivatedCold === 1`.
  - `reactivated === reactivatedWarm + reactivatedCold` во всех кейсах.
  - churn `reasonDistribution`: набор `CancelFeedback` по причинам и диапазонам дат → корректный подсчёт; internal-юзеры исключены.
- Существующие 26 тестов остаются зелёными.

---

## 7. Деплой

- Ветка `feat/honest-churn-reactivation`.
- Мерж в master `--no-ff`, `git push origin master`.
- `ssh checkmate "cd /opt/checkmate && git pull origin master && docker compose up -d --build"`.
- Миграция применяется авто (Dockerfile CMD). Прод-проверка по доменам: `app.checkmateai.ru` / `api.checkmateai.ru`.

---

## Связанные документы

- V1 дизайн: `docs/superpowers/specs/2026-05-30-admin-metrics-design.md`
- V2.1: `docs/superpowers/specs/2026-05-30-metrics-exclude-internal-design.md`
- V2.2: `docs/superpowers/specs/2026-05-30-user-segment-design.md`
