# REVO — твой личный трекер

Персональный приватный трекер привычек и воздержания в формате Telegram Mini App.
Построен по принципу Flo, но для мужской аудитории: домашний экран со статистикой,
календарь с цветовой кодировкой, аналитика, цели, достижения, настройки и полная приватность.

**Стек:** Next.js 14 (App Router) + TypeScript · Tailwind CSS · Supabase (Postgres + Row Level Security) · recharts · @twa-dev/sdk · Vercel

---

## Содержание

1. [Структура проекта](#1-структура-проекта)
2. [SQL для Supabase](#2-sql-для-supabase)
3. [Настройка Supabase](#3-настройка-supabase)
4. [Подключение Telegram-бота](#4-подключение-telegram-бота)
5. [Публикация на Vercel](#5-публикация-на-vercel)
6. [Переменные окружения](#6-переменные-окружения)
7. [Локальный запуск](#7-локальный-запуск)
8. [Как всё устроено](#8-как-всё-устроено)

---

## 1. Структура проекта

```
.
├── app/
│   ├── api/
│   │   ├── account/route.ts        # полное удаление аккаунта (DELETE)
│   │   ├── auth/route.ts           # валидация Telegram initData + выпуск JWT
│   │   ├── cron/reminders/route.ts # ежедневные напоминания (Vercel Cron)
│   │   ├── export/route.ts         # экспорт JSON/CSV
│   │   ├── notify/route.ts         # ручное тестовое напоминание в Telegram
│   │   └── webhook/route.ts        # вебхук бота: привязка chat_id по /start<код>
│   ├── calendar/page.tsx           # календарь (Flo-стиль)
│   ├── profile/page.tsx            # профиль, цели, достижения, история, настройки
│   ├── stats/page.tsx              # аналитика и графики
│   ├── page.tsx                    # главный экран
│   ├── globals.css                 # темы (light/dark), дизайн-система
│   └── layout.tsx                  # корневой layout + подгрузка Telegram WebApp SDK
├── components/
│   ├── AppProvider.tsx             # глобальный стейт: auth + данные + действия
│   ├── AppShell.tsx                # гейт загрузки/ошибки + нижняя навигация
│   ├── BottomNav.tsx               # 4 вкладки
│   ├── EventModal.tsx              # добавление/редактирование записи
│   ├── Toasts.tsx                  # всплывающие уведомления
│   └── ui.tsx                      # карточки, заголовки, статистика
├── lib/
│   ├── auth.ts                     # извлечение userId из Bearer-токена
│   ├── dates.ts                    # даты, календарная сетка, часовой пояс
│   ├── jwt.ts                      # выпуск/проверка Supabase-совместимого JWT
│   ├── stats.ts                    # чистый движок статистики
│   ├── supabase.ts                 # клиенты (браузерный + service role)
│   ├── telegram-bot.ts             # Bot API (sendMessage, getMe)
│   ├── telegram.ts                 # HMAC-валидация initData
│   ├── tg.ts                       # обёртка над @twa-dev/sdk (+ dev-режим)
│   └── types.ts                    # типы, достижения, мотивация
├── supabase/
│   └── schema.sql                  # таблицы + RLS + триггеры
├── vercel.json                     # cron-расписание напоминаний
├── .env.example                    # пример переменных окружения
├── next.config.mjs / tailwind.config.ts / tsconfig.json
└── README.md
```

---

## 2. SQL для Supabase

Готовая схема лежит в [supabase/schema.sql](./supabase/schema.sql). Содержит:

- **users** — профиль (telegram_id, имя, тема, настройки уведомлений, chat_id).
- **events** — записи событий (дата, время, настроение, комментарий).
- **goals** — цели на 7/14/30/60/90 дней (одна активная за раз).
- **achievements** — достижения пользователя.
- **notifications** — журнал отправленных напоминаний.

### Row Level Security

RLS включён на **каждой** таблице:

| Таблица | Политики |
|---|---|
| users | select/insert/update только `auth.uid() = id` |
| events | select/insert/update/delete только `auth.uid() = user_id` |
| goals | select/insert/update/delete только `auth.uid() = user_id` |
| achievements | select/insert/delete только `auth.uid() = user_id` |
| notifications | select/insert/delete только `auth.uid() = user_id` |

Ни один пользователь не может прочитать или изменить чужие данные — запросы анонимного
клиента имеют `auth.uid() = NULL` и не соответствуют ни одной политике.

---

## 3. Настройка Supabase

1. Зарегистрируйтесь на [supabase.com](https://supabase.com) и создайте проект (выберите регион, ближайший к пользователям — например `eu-central` или Москва).
2. Откройте **SQL Editor → New query**, вставьте содержимое `supabase/schema.sql` и нажмите **Run**.
3. Откройте **Settings → API** и скопируйте три значения:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (**храните в секрете, не публикуйте**)
   - **JWT Secret** → `SUPABASE_JWT_SECRET`
4. В **Settings → API → JWT expiry** при желании можно скорректировать срок жизни токена (у нас 90 дней).

> `service_role` и `JWT Secret` используются **только** в серверных API-роутах
> (`/api/auth`, `/api/export`, `/api/account`, `/api/webhook`, `/api/cron/reminders`).
> Они никогда не попадают на клиент.

---

## 4. Подключение Telegram-бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram.
2. `/newbot` → введите имя и username бота (например `my_revo_bot`).
3. BotFather вернёт **токен** → вносим в `TELEGRAM_BOT_TOKEN`.
4. Username бота (без `@`) → в `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`.

### Создание Mini App для приложения

Бот должен открывать приложение как Mini App. Сделайте TMA через BotFather:

- `/mybots` → выберите бота → **Bot Settings** → **Menu Button** → задайте URL приложения (после деплоя на Vercel).
- Либо используйте command `/newapp` (последние версии BotFather) для полноценного Mini App.

### Вебхук (для привязки и напоминаний)

После деплоя на Vercel выполните (в терминале или в поле для запросов браузера):

```bash
curl -F "url=https://ВАШ_URL.vercel.app/api/webhook" \
     "https://api.telegram.org/bot<ВАШ_ТОКЕН>/setWebhook"
```

Как работает связка:
- Пользователь в приложении жмёт «Связать бота (нажми Start)».
- Открывается `t.me/<бот>?start=<код>`, где код = base64 от `user_id`.
- Бот принимает хэндшейк-сообщение `/start <код>` → сохраняет `chat_id` у юзера.
- После этого приложение может слать напоминания строго этому пользователю.

### Напоминания

Два вида:
- **Тестовое** — кнопка «Отправить тест» в профиле («/api/notify»).
- **Ежедневное** — Vercel Cron (`/api/cron/reminders`, расписание `0 9 * * *` в `vercel.json`)
  отправляет общее поддерживающее сообщение. В текст **никогда не включается** личная
  статистика — только нейтральная поддержка.

> Напоминания отправляются только если пользователь: включил уведомления **и** связал бота.

---

## 5. Публикация на Vercel

### Через GitHub

1. Создайте репозиторий на GitHub и запушьте проект:
   ```bash
   git init
   git add .
   git commit -m "feat: revo tracker"
   git branch -M main
   git remote add origin git@github.com:ВАШ_ЮЗЕР/ВАШ_РЕПО.git
   git push -u origin main
   ```
2. На [vercel.com](https://vercel.com) нажмите **New Project → Import** и выберите репозиторий.
3. Vercel сам определит Next.js. В разделе **Environment Variables** добавьте все переменные
   из п.6 (включая `NEXT_PUBLIC_*` и секретные `SUPABASE_*`, `TELEGRAM_BOT_TOKEN`).
4. Нажмите **Deploy**. После успешного деплоя:
   - пропишите URL боту (см. п.4);
   - добавьте ссылку Mini App в BotFather (Menu Button);
   - если включены cron-напоминания — Vercel Cron активируется в настройках проекта (Hobby-план).

Приложение адаптировано под мобильные устройства: safe-area insets для iOS, отсутствие
зумминга, нижняя навигация, Telegram WebApp SDK для полного экрана.

---

## 6. Переменные окружения

Всё перечислено в [.env.example](./.env.example):

| Переменная | Где | Обязательна |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | да |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | да |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (секретно) | да |
| `SUPABASE_JWT_SECRET` | Supabase → Settings → API (секретно) | да |
| `TELEGRAM_BOT_TOKEN` | @BotFather (секретно) | да |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | username бота (публично) | для кнопки «Связать бота» |
| `NEXT_PUBLIC_APP_URL` | URL развёрнутого приложения | для ссылок |
| `SESSION_SECRET` | произвольная длинная строка | опционально |
| `CRON_SECRET` | защита cron-эндпоинта | опционально |
| `NEXT_PUBLIC_DEV_TELEGRAM_ID` | Telegram ID для локальной разработки вне Telegram | для dev |

---

## 7. Локальный запуск

```bash
npm install
cp .env.example .env.local   # заполните значения
npm run dev                  # http://localhost:3000
```

Вне Telegram приложение автоматически перейдёт в **dev-режим** и использует
`NEXT_PUBLIC_DEV_TELEGRAM_ID` для авторизации — удобно тестировать в обычном браузере.

Чтобы открыть именно Mini App: создайте бота и в BotFather задайте Menu Button с URL
`https://localhost:3000` (или используйте ngrok), затем откройте бота в Telegram.

---

## 8. Как всё устроено

### Авторизация (безопасная)

1. Клиент получает `initData` из Telegram WebApp SDK.
2. `/api/auth` проверяет подпись `initData` (официальный HMAC-SHA256, `WebAppData`) и срок действия.
3. На сервере под user upsert-ится строка в `users`.
4. Выпускается **Supabase-совместимый JWT** (HS256, JWT Secret), где `sub` = `user_id`, `role = authenticated`.
5. Клиент хранит токен в `localStorage` и шлёт его в `Authorization: Bearer`.
6. RLS видит `auth.uid() = sub` → доступ строго к своим данным.

### Данные

Все действия с записями (добавить/удалить/изменить/отменить последнюю) идут напрямую
в Supabase через быстрый браузерный клиент с токеном. Статистика пересчитывается
**чистой функцией** (`lib/stats.ts`) после каждого изменения — в реальном времени.

### Часовой пояс

Все даты хранятся как локальные `date` (YYYY-MM-DD) и `time` (HH:mm:ss). Никакого
смещения по UTC — события всегда записываются на тот день, который видит пользователь.

### Приватность

- RLS изолирует данные каждого пользователя.
- Личная статистика **не передаётся** в Telegram-уведомления (только нейтральный текст).
- Экспорт — только собственных данных, удаление истории и аккаунта — полное (каскадное).

---

## Возможные улучшения (бесплатно)

- **Синхронизация устройств** — уже есть благодаря облачной Supabase-БД.
- **Deep-link достижения** — можно отправлять ачивки в Telegram через `/api/notify`.
- **Аналитика в PDF** — подключите скилл pdf у сборщика для экспорта отчёта.
- **Расписание напоминаний по времени** — расширьте `notification_time` и cron-логику.

## Лицензия

MIT — используйте свободно. Все данные принадлежат пользователям и хранятся приватно.