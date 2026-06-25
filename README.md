# ANT Access · Midnight Observatory

Современная веб-платформа для управления устройствами контроля доступа Hikvision (тестировано на DS-K1T343MFWX V4.48), учёта рабочего времени сотрудников и формирования отчётов. Альтернатива HikCentral / iVMS-4200 с упором на простоту, красивый UI и работу прямо из браузера.

> **Статус:** в production-готовом виде работают все 7 этапов. Эмпирически проверено на реальном устройстве DS-K1T343MFWX (прошивка V4.48.0) — синхронизация сотрудников, регистрация карт, отпечатков, лиц, расчёт табеля, экспорт отчётов.

---

## Содержание

1. [Возможности](#возможности)
2. [Технологический стек](#технологический-стек)
3. [Дизайн-система Atlantic.vc](#дизайн-система-atlanticvc)
4. [Структура репозитория](#структура-репозитория)
5. [Быстрый запуск](#быстрый-запуск)
6. [Прогресс по этапам](#прогресс-по-этапам)
7. [Что протестировано на реальном устройстве](#что-протестировано-на-реальном-устройстве)
8. [Ограничения прошивки V4.48](#ограничения-прошивки-v448)
9. [Workflow администратора](#workflow-администратора)
10. [Workflow регистрации сотрудника](#workflow-регистрации-сотрудника)
11. [API / RBAC / Hikvision-обвязка](#api--rbac--hikvision-обвязка)
12. [Что осталось](#что-осталось)
13. [Полезные команды](#полезные-команды)

---

## Возможности

- ✅ Подключение и мониторинг устройств Hikvision (IP, порт, логин, статус online/offline).
- ✅ Live-превью с камеры терминала в браузере (через ISAPI snapshot, обновление каждые 1.5 с).
- ✅ Авто-синхронизация времени устройства с сервером (раз в час + при `Проверить`), с настраиваемым часовым поясом на каждое устройство.
- ✅ Управление организациями, отделами (иерархия), филиалами.
- ✅ Реестр сотрудников: ФИО, фото, должность, статус; **авто-синхронизация на все онлайн-устройства** при создании/изменении/удалении.
- ✅ Назначение сотрудников на устройства; уровни доступа.
- ✅ Регистрация **карт** (ручной ввод номера + «Считать с устройства» — терминал переходит в режим «Приложите карту»).
- ✅ Регистрация **отпечатков** через ISAPI — терминал показывает «Поднесите палец».
- ✅ Регистрация **лиц** через snapshot+upload в библиотеку распознавания HCFaceLibblackFD.
- ✅ Расписания рабочего времени: офис, магазин, охрана 24/7, ночные смены, индивидуальные.
- ✅ Автоматический учёт прихода/ухода, опозданий, раннего ухода, отсутствий.
- ✅ Дашборд с KPI: сотрудники, устройства online, пришли сегодня, опоздали, недельная диаграмма.
- ✅ Отчёты: дневной, недельный, месячный, по сотруднику/отделу/филиалу, сводный табель.
- ✅ Экспорт **Excel / CSV / PDF**.
- ✅ WebSocket — события прохода в реальном времени.
- ✅ RBAC: 7 ролей × 24 разрешения.
- ✅ Аудит-лог всех write-операций (JSONB before/after).
- ✅ Тёмная/светлая тема, локализация RU/EN/UZ.
- ✅ **Дизайн-система Atlantic.vc** — «полночная обсерватория»: ambient-свечение, glow-карточки, градиентные метрики, премиум микро-взаимодействия (см. раздел [Дизайн-система](#дизайн-система-atlanticvc)).
- ⏳ Интеграции с 1С / биллингом (этап 6 — отложен по запросу заказчика).

---

## Технологический стек

**Backend:** Python 3.12, FastAPI, PostgreSQL 16, Redis 7, SQLAlchemy 2.0 + Alembic, asyncio (фоновые задачи), httpx + subprocess curl (для специфики Hikvision), JWT, bcrypt, openpyxl, reportlab, cryptography (Fernet).

**Frontend:** React 18 + TypeScript + Vite, Tailwind CSS, TanStack Query, Zustand, react-i18next, lucide-react. Дизайн-система **Atlantic.vc** + скилл [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (подключён через `.claude/settings.json`).

**Infra:** Docker Compose, Nginx (reverse-proxy + WebSocket).

---

## Дизайн-система Atlantic.vc

Единый визуальный язык — «полночная обсерватория»: чёрный холст, ледяной текст (`#d8eaff`), акцент electric-cobalt (`#1f58f2`) и сигнальный orange (`#ff4105`), типографика Space Grotesk + JetBrains Mono, глубина за счёт ступенчатых поверхностей, а не теней.

Разработка ведётся с подключённым скиллом **[UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)** (маркетплейс + плагин прописаны в `.claude/settings.json`) — он применяет pre-delivery чеклист: SVG-иконки (lucide), `cursor-pointer` на всех кликабельных, hover-переходы 150–300 мс, видимый focus-ring, поддержка `prefers-reduced-motion`, контраст и адаптивность.

**Система глубины** (`src/index.css`):

| Слой | Класс | Что делает |
|---|---|---|
| Ambient-фон | `.app-aurora` | Радиальное cobalt/orange свечение + masked dot-grid за всем контентом (в `Shell`) |
| Премиум-карточка | `.glow-card` | Кобальтовый ореол + подъём на 3px при наведении |
| Градиент-текст | `.text-gradient` | Ice-white → cobalt для метрик и заголовков |
| Анимированная грань | `.accent-top` | Верхний hairline пробегает кобальтовым лучом на hover |

Все слои имеют override'ы для светлой темы и уважают `prefers-reduced-motion`.

**Переиспользуемые примитивы** (`src/components/ui/`): `Button`, `Input`/`Textarea`/`Field`, `Drawer`, `DataTable`, `PageHeader` (с поддержкой `eyebrow` Mono-лейбла), `Card` (+ `glow`/`hoverable`), `Badge` (тоны success/neutral/accent/warning/danger), `EmptyState`, `Loading`.

**Навигация и интеракции:**

- **Hamburger toggle** — кнопка Menu/X в топбаре. На мобиле сайдбар выезжает как drawer с тёмным backdrop, на десктопе работает inline + сворачивается по требованию. Авто-закрытие при смене страницы на узких экранах.
- **Глобальный поиск** в топбаре — `<form>` с Enter-submit, маршрутизация по ключевым словам: `устройство/device/терминал` → `/devices`, `отчёт/report/табел` → `/reports`, `расписание/график` → `/schedules`, `приход/уход/событие` → `/attendance` и т.д. Дефолт — `/employees?q=...`. Целевая страница инициализирует фильтр из `?q=` и синхронизируется при изменении URL. Подсказка `enter ↵` появляется при наборе.
- **Light theme** — полностью функциональная инвертированная версия: ice canvas `#f4f6fb`, белые карточки, navy `#0b1530` текст, electric cobalt акцент сохранён. Переключатель Sun/Moon в топбаре, выбор сохраняется в `localStorage` под ключом `ant-theme`. Все depth-утилиты (`.glow-card`, `.text-gradient`, `.app-aurora`, `.accent-top`) имеют light-варианты. Status-бейджи (emerald/orange/red/amber/sky) углубляются до 700-семьи для AA контраста на белом.
- **Eyebrow-лейблы на всех страницах** — `/ реестр · персонал`, `/ графики · время`, `/ поток · события`, `/ структура · юр.лица`, `/ присутствие · точки`, `/ доступ · учётки`, `/ журнал · аудит`, `/ конфигурация · система`, `/ сеть · терминалы`, `/ табель · экспорт` — Mono uppercase микро-заголовки над H1 каждой страницы для editorial-единства.

**Dark-mode legacy overlay** — `html.dark` в `src/index.css` ретаргетит встроенные Tailwind-цвета (`bg-white`, `bg-slate-50/100/200`, `border-slate-200/300`, пастельные `bg-emerald-100/amber-100/red-100/orange-100/sky-100`, `text-slate-400..900`) на палитру Atlantic. Все 13 страниц приложения получают тёмный editorial-фон без пер-файловых правок.

**Где видно:** дашборд (glow KPI-карточки с градиентными цифрами, недельная диаграмма со светящимися столбцами), сайдбар (стеклянный фон, светящийся active-индикатор, slide-in drawer на мобиле), топбар (hamburger toggle, рабочий поиск, cobalt-аватар, переключатель темы), логин (particle-cloud + градиентный герой).

---

## Структура репозитория

```
Web_interfaceTOUCHECREEN/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py             # DI: get_current_user, require(perm) — RBAC guards
│   │   │   ├── crud.py             # Generic CRUD helper с авто-аудитом
│   │   │   └── v1/
│   │   │       ├── auth.py         # Login/refresh/me/logout
│   │   │       ├── dashboard.py    # KPI + weekly chart + recent events
│   │   │       ├── organizations.py / departments.py / branches.py
│   │   │       ├── devices.py      # CRUD + test-connection + sync-time + snapshot proxy
│   │   │       ├── employees.py    # CRUD + assign-devices + sync-to-device
│   │   │       │                   # + enroll-fingerprint + capture-face + enroll-face
│   │   │       │                   # + add-card + capture-card + credentials
│   │   │       │                   # + auto-sync на все online устройства
│   │   │       ├── schedules.py / attendance.py / reports.py
│   │   │       ├── users.py / audit.py / settings.py
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic Settings (.env)
│   │   │   ├── security.py         # JWT, bcrypt, password hashing
│   │   │   ├── rbac.py             # 7 ролей × 24 разрешения
│   │   │   └── crypto.py           # Fernet шифрование паролей устройств
│   │   ├── db/
│   │   │   ├── base.py / session.py
│   │   │   ├── seed.py             # admin@hikvision.dev / admin + роли
│   │   │   └── demo_seed.py        # Опционально: 10 сотрудников + 7 дней событий
│   │   ├── models/                 # 17 SQLAlchemy таблиц
│   │   ├── schemas/                # Pydantic DTO
│   │   ├── services/
│   │   │   ├── hikvision/
│   │   │   │   ├── base.py         # Protocol HikvisionClient
│   │   │   │   ├── isapi.py        # Реальный клиент (XML/JSON, Digest, curl-fallback)
│   │   │   │   ├── mock.py         # Mock для разработки без железа
│   │   │   │   └── service.py      # Facade: подбирает клиент по HIKVISION_MODE
│   │   │   ├── attendance.py       # Алгоритм расчёта табеля (ночные смены, обед)
│   │   │   ├── poller.py           # asyncio: опрос событий + sync_time каждый час
│   │   │   ├── ws.py               # ConnectionManager для live-events
│   │   │   ├── audit.py            # Запись в audit_logs с JSONB before/after
│   │   │   ├── report.py / export.py  # Сборка табеля + CSV/Excel/PDF
│   │   ├── tests/                  # pytest: RBAC, security, hikvision mock
│   │   └── main.py                 # FastAPI factory + startup (ALTER TABLE, seed, pollers)
│   ├── pyproject.toml
│   ├── Dockerfile                  # Python 3.12-slim + curl (для face upload)
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/                    # axios клиенты по модулям
│   │   ├── components/
│   │   │   ├── ui/                 # Button, Input, Drawer, DataTable, PageHeader,
│   │   │   │                       # Card (glow), Badge, EmptyState, Loading
│   │   │   ├── layout/             # Sidebar, Topbar, Shell
│   │   │   └── ProtectedRoute.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx       # KPI + bar chart + recent events
│   │   │   ├── organizations/ / departments/ / branches/
│   │   │   ├── devices/            # Карточная сетка + test/sync/time, tz dropdown
│   │   │   ├── employees/
│   │   │   │   ├── EmployeesPage.tsx     # Таблица с фильтрами + drawer
│   │   │   │   └── EmployeeDetailPage.tsx  # 5 вкладок: Профиль, Устройства,
│   │   │   │                              # Регистрация, История, Табель
│   │   │   ├── schedules/ / attendance/ / reports/
│   │   │   ├── users/ / audit/ / settings/
│   │   ├── i18n/                   # ru/en/uz JSON + i18next config
│   │   ├── stores/                 # zustand (auth)
│   │   ├── lib/                    # cn(), utils
│   │   └── router.tsx
│   ├── tailwind.config.ts          # Atlantic.vc токены (ice-white/cobalt/orange), radii, motion
│   ├── vite.config.ts
│   ├── Dockerfile                  # multi-stage: build → nginx
│   └── nginx.conf                  # /api/ proxy + WebSocket upgrade
│
├── deploy/
│   └── docker-compose.yml          # postgres + redis + backend + frontend (порт 8090)
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md                      # Все REST endpoints
│   ├── HIKVISION.md                # Подключение реального устройства
│   └── DEPLOY.md                   # Production-инструкция (HTTPS, бэкапы)
│
└── README.md                       # этот файл
```

---

## Быстрый запуск

```bash
git clone https://github.com/nnfirdavs96-cell/Web_interfaceTOUCHECREEN.git
cd Web_interfaceTOUCHECREEN

# Настроить .env (обязательно сгенерировать свой SECRET_KEY!)
cp backend/.env.example backend/.env
SECRET=$(openssl rand -hex 32)
sed -i "s|^SECRET_KEY=.*|SECRET_KEY=$SECRET|" backend/.env

# Запустить
docker compose -f deploy/docker-compose.yml up -d --build
```

После старта:
- **Веб-интерфейс:** http://localhost:8090
- **API + Swagger:** http://localhost:8090/api/docs
- **Health-check:** http://localhost:8090/api/health
- **Логин по умолчанию:** `admin@hikvision.dev` / `admin`

---

## Прогресс по этапам

### ✅ Этап 1 — Фундамент

**Что сделано:**
- Структура проекта (`app/{core,db,models,schemas,api/v1}`)
- Настройки через `pydantic-settings`
- JWT (access 15 мин + refresh 7 дней), bcrypt
- **RBAC: 7 ролей × 24 разрешения** (super_admin, admin, hr, accountant, manager, viewer, branch_admin)
- Модели `roles`, `users`; auto-seed `admin@hikvision.dev`
- Endpoints: `/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/logout`, `/api/health`
- Frontend: Login страница, ProtectedRoute, Layout (Sidebar 13 разделов + Topbar)
- Auth store (Zustand + persist), axios с JWT-интерцептором
- Dark mode, TanStack Query

**Тестируется:**
- `tests/test_rbac.py` — матрица ролей (super_admin = all, viewer = read-only, hr ≠ devices, accountant = export+send)
- `tests/test_security.py` — bcrypt roundtrip, JWT access/refresh, Fernet шифрование

---

### ✅ Этап 2 — Справочники

**Что сделано:**
- 4 таблицы: `organizations`, `departments` (self-referencing иерархия), `branches`, `audit_logs` (JSONB before/after)
- **Generic CRUD helper** (`api/crud.py`) с автоматическим аудитом каждого write
- 5 роутеров: `/organizations`, `/departments`, `/branches`, `/users`, `/audit/logs`
- RBAC на каждом endpoint через `Depends(require("perm.code"))`
- Frontend: переиспользуемые UI (Button, Input, Drawer, DataTable, PageHeader)
- Страницы: Организации, Отделы (tree-view), Филиалы, Пользователи, Логи действий
- Поиск, пагинация, цветные статус-чипы

**Тестируется в реальной работе:**
- Создание организации → автоматически появляется в выпадающих списках везде
- Создание иерархии отделов с подотделами через drag-and-drop расширение
- Просмотр аудит-лога — каждый CRUD пишется с user/IP/user-agent

---

### ✅ Этап 3 — Устройства + Hikvision + Сотрудники

**Что сделано:**
- 4 таблицы: `devices`, `employees`, `employee_credentials`, `employee_device_access`
- **Fernet-шифрование** паролей устройств (ключ из `SECRET_KEY`)
- **Hikvision-абстракция:**
  - `HikvisionClient` Protocol — единый интерфейс
  - `MockClient` — для разработки без железа
  - `IsapiClient` — реальный ISAPI (HTTP Digest, XML/JSON)
  - `HikvisionService.client_for(device)` — фасад
- Endpoints:
  - `/devices` CRUD + `/test-connection` + `/sync` + `/sync-time` + `/snapshot`
  - `/employees` CRUD + `/access` + `/assign-devices`
  - `/employees/{id}/credentials` + `/sync-to-device` + `/enroll-fingerprint`
    + `/capture-face` + `/enroll-face` + `/add-card` + `/capture-card`
- **Auto-sync employee → все online устройства** при create/update/delete
- Frontend:
  - Устройства: карточная сетка, online/offline бейджи, кнопки Проверить / Синк / Время / Edit / Delete
  - **Live-превью камеры** в карточке сотрудника (snapshot каждые 1.5 с)
  - Сотрудники: фильтруемая таблица, аватарки-инициалы, drawer с каскадными селектами
  - **Карточка сотрудника** (5 вкладок): Профиль / Устройства / Регистрация / История / Табель
  - **Drawer регистрации устройств** с чек-боксами и online-индикатором

**Тестируется на реальном устройстве (DS-K1T343MFWX V4.48):**
- Проверка связи → возвращает реальный серийник `DS-K1T343MFWX20260212V044800ENGS5815252`, прошивку `V4.48.0`
- Создание сотрудника → авто-появляется в Hikvision Person Management через ISAPI `/UserInfo/Record`
- Изменение сотрудника → авто-обновляется через `/UserInfo/Modify`
- Live-snapshot работает через `/ISAPI/Streaming/channels/101/picture`

---

### ✅ Этап 4 — Расписания + События + Live

**Что сделано:**
- 5 таблиц: `schedules`, `schedule_days`, `schedule_assignments`, `attendance_events`, `attendance_reports` (unique per employee+date)
- **Алгоритм расчёта табеля** (`services/attendance.py`):
  - Подбор расписания: индивидуальное > отдел > филиал
  - Окно событий с поддержкой ночных смен (`night_shift`)
  - Вычет обеденного перерыва (`lunch_start` / `lunch_end`)
  - Пороги допустимого опоздания / раннего ухода
  - 6 статусов: `normal`, `late`, `early_leave`, `absent`, `partial`, `day_off`
- **Фоновый poller** (asyncio task, 30 сек):
  - Обходит онлайн-устройства через ISAPI `/AcsEvent`
  - Делает upsert событий, связывает с сотрудниками по `external_id`
  - Шлёт live-события в WebSocket
  - **Раз в час** автоматически синхронизирует время на всех устройствах
- **Фоновый пересчёт** табеля (10 мин — вчера/сегодня)
- **WebSocket** `/api/v1/attendance/ws/events` — broadcast живых событий через `ConnectionManager`
- Endpoints: `/schedules` CRUD + `/assign`, `/attendance/events`, `/attendance/fetch-events`, `/attendance/recalculate`, `/dashboard`
- Nginx: WebSocket upgrade headers для `/api/`
- Frontend:
  - Расписания: card grid + **визуальный конструктор недели** (чек-боксы + time-инпуты)
  - Drawer назначения — выбор employee/department/branch
  - Приход/уход: фильтр по датам, таблица событий, кнопки «Опросить» и «Пересчитать», **live-счётчик WebSocket**
  - Дашборд: 6 KPI-карточек, недельная bar-диаграмма, лента событий

**Тестируется в проде:**
- События с реального устройства приходят в нашу систему с правильным timestamp
- При создании сотрудника `external_id` события автоматически привязываются к ФИО
- WebSocket counter инкрементируется в реальном времени при проходе через терминал

---

### ✅ Этап 5 — Отчёты + Экспорт

**Что сделано:**
- `services/report.py` — `fetch_rows` с JOIN `attendance_reports + employees` и фильтрами (даты, employee, department, branch, organization, status)
- `services/export.py` — три формата:
  - **CSV** (UTF-8 BOM для корректной кодировки в Excel, разделитель `;`)
  - **Excel** (`openpyxl` с автоширинами колонок)
  - **PDF** (`reportlab`, landscape A4, стилизованная таблица с шапкой брендового цвета)
- Endpoints: `/reports/timesheet`, `/reports/summary`, `/reports/export/{csv,excel,pdf}`
- Frontend: **Отчёты** со сводными чипами по статусам, мульти-фильтр (даты, орг, отдел, филиал, статус), таблица, **3 кнопки экспорта** — скачивание через blob

**Тестируется:**
- Скачивание CSV/XLSX/PDF с реальными данными за период
- Фильтрация по любым комбинациям

---

### ⏳ Этап 6 — Интеграции с 1С / биллингом (отложен)

**План:**
- Модель `integrations` (type=1c/billing/webhook, URL, auth_token_encrypted, interval_minutes)
- Модель `integration_logs` (payload/response/status/success)
- HTTP-отправка через httpx с retries + экспоненциальный backoff
- CRUD `/integrations` + `/test` + `/send` + `/logs`
- Периодическая автоотправка
- Внешний REST API для запросов от 1С (с bearer-токеном)
- Frontend: страницы Интеграции и Логи интеграции

**Статус:** отложен по решению заказчика. Готов к реализации за 1 день.

---

### ✅ Этап 7 — Полировка

**Что сделано:**
- **demo_seed.py**: 1 организация, 2 филиала, 3 отдела, 10 сотрудников, 2 устройства, 2 расписания, события за 7 дней (включается через `DEMO_SEED=true`)
- **/settings** endpoint: read-only текущая конфигурация (version, env, hikvision_mode, token_ttl, cors)
- **Тесты pytest**: RBAC, security (bcrypt + JWT + Fernet), Hikvision mock
- **i18n RU/EN/UZ** через i18next, переключатель в Topbar (иконка глобуса), persist в localStorage
- **Страница «Настройки»** — 4 секции (System, Security, Hikvision, Interface)
- **Карточка сотрудника** (5 вкладок)
- **Документация:** docs/HIKVISION.md, docs/DEPLOY.md, docs/API.md

---

### 🎯 Дополнительно после этапа 7 — Hikvision V4.48 интеграция (большая работа)

Эмпирическая реверс-инженерия прошивки V4.48 на реальном DS-K1T343MFWX:

| Что | Endpoint / Метод | Особенность V4.48 |
|---|---|---|
| Создание сотрудника | `POST /UserInfo/Record` | **Одиночный объект** `{"UserInfo":{...}}`, **не массив** |
| Обновление сотрудника | `PUT /UserInfo/Modify` | Авто-fallback с Record если уже существует |
| Удаление | `PUT /UserInfo/Delete` | `EmployeeNoList` |
| Регистрация отпечатка | `POST /CaptureFingerPrint` | **XML body**, не JSON (JSON → badXmlContent) |
| Считывание карты | `POST /CaptureCardInfo` | XML body |
| Привязка карты вручную | `POST /CardInfo/Record` | Одиночный объект |
| Загрузка лица | `PUT /Intelligent/FDLib/FDSetUp` | **multipart через subprocess curl** (httpx ломает формат), поле **`FaceImage`** не `img` |
| Получение событий | `POST /AcsEvent` | major=5, поддерживает pagination |
| Live snapshot | `GET /Streaming/channels/101/picture` | Канал 1 возвращает 404, нужен **101** |
| Установка времени | `PUT /System/time` | **XML без xmlns/version**, формат `CST-5:00:00` = UTC+5 (знак инвертирован) |
| Получение device info | `GET /System/deviceInfo` | Возвращает **XML даже при `?format=json`** — наш парсер обрабатывает оба |

---

## Что протестировано на реальном устройстве

**Устройство:** Hikvision DS-K1T343MFWX, прошивка V4.48.0, IP 192.168.0.31

✅ **Создание сотрудника** в нашей системе → Person Management Hikvision автоматически показывает его (через auto-sync)
✅ **Изменение ФИО** в нашей системе → ФИО на устройстве обновляется
✅ **Привязка RFID-карты** — вводим номер 8-10 цифр → `numOfCard: 1` на устройстве
✅ **Считать карту с устройства** — терминал показывает «Приложите карту», ловит номер, автопривязка
✅ **Запросить отпечаток** — терминал показывает «Поднесите палец», сотрудник прикладывает 3 раза
✅ **Live-превью камеры** — реальное видео в браузере, обновление каждые 1.5 с
✅ **Загрузка фото лица** — snapshot/JPG-файл идёт в библиотеку HCFaceLibblackFD (требует ракурс анфас)
✅ **Синхронизация времени** — устройство принимает наше время и часовой пояс, исчезает плашка «неверное время»
✅ **События прохода** — реальные проходы (face/card/fp) ловятся poller'ом каждые 30 секунд
✅ **Расчёт табеля** — на основе реальных событий формируется правильный отчёт с опозданиями
✅ **Экспорт Excel/PDF** — реальные данные с устройства попадают в файл

---

## Ограничения прошивки V4.48

После эмпирической разведки **9+ endpoint'ов** (см. commit history), подтверждено что V4.48 на DS-K1T343MFWX **не имеет ISAPI API для face enrollment mode на экране терминала**. Все эндпоинты `CaptureFace`, `CaptureFaceData`, `AddUser`, `Configuration/captureMode` возвращают 404 / `notSupport`.

| Хотелось | Реально на V4.48 | Что делаем |
|---|---|---|
| Терминал входит в «Add Face» при клике | ❌ Нет API | Snapshot+upload в библиотеку (тихо, без действий на терминале) |
| Терминал входит в «Place Finger» | ✅ Есть (`CaptureFingerPrint`) | Терминал показывает «Поднесите палец» |
| Терминал входит в «Swipe Card» | ✅ Есть (`CaptureCardInfo`) | Терминал показывает «Приложите карту» |
| Live snapshot по HTTP | ✅ Только через канал 101 | Реализовано в LiveCamera компоненте |

Это специфика V4.48 — нативный iVMS-4200 для enrollment режима лица использует бинарный SDK на порту 8000, недоступный через HTTP. Все остальные операции (регистрация юзера, карта, отпечаток) **полностью покрыты** через ISAPI.

---

## Workflow администратора

1. **Открываешь** http://localhost:8090, входишь `admin@hikvision.dev / admin`
2. Идёшь в **Организации** → создаёшь свою организацию
3. **Филиалы** → создаёшь точки (офис, магазин)
4. **Отделы** → выбираешь организацию → создаёшь иерархию (IT, бухгалтерия и т.д.)
5. **Устройства** → «Добавить устройство»:
   - IP / порт 80 / логин admin / пароль
   - Назначение: «Главный вход»
   - Часовой пояс: **UTC+5 (Ташкент/Худжанд)**
   - Сохранить → нажми «Проверить» → должен показать реальный серийник
   - Жми ⏱ «Время» → устройство получит правильное время
6. **Расписания** → создай «Офис Пн-Пт 09:00-18:00» (визуальный конструктор)
7. **Пользователи системы** → создай аккаунты HR / бухгалтерии / филиал-админов

---

## Workflow регистрации сотрудника

1. **Сотрудники** → «Добавить»
2. Заполни ФИО + **«ID сотрудника (для 1С)»** (например `100`) — это станет `employeeNo` на устройстве
3. Выбери организацию / отдел / филиал → «Создать»
4. **Авто-синхронизация** уже залила сотрудника на все online-устройства
5. Кликни на сотрудника → откроется **карточка** с 5 вкладками
6. **Вкладка «Регистрация»**:
   - Live-превью камеры терминала наверху
   - **Шаг 1 «Отправить на устройство»** — обычно не нужен (авто-синк уже сработал)
   - **Шаг 2 «Запросить отпечаток»** — нажми, подойди к терминалу, «Поднесите палец» × 3 раза
   - **Шаг 3 «Сделать снимок»** — сотрудник стоит перед камерой анфас → жмёшь → лицо в библиотеке
   - **Шаг 4 «Считать с устройства»** — терминал ждёт карту → приложил → автозапись
7. **Зарегистрированные учётные данные** внизу показывают что зарегистрировано

После этого сотрудник может проходить через терминал по карте / отпечатку / лицу — события автоматически попадают в **Приход/уход** и **Отчёты**.

---

## API / RBAC / Hikvision-обвязка

### REST API

База: `/api/v1`. Авторизация — JWT Bearer.

**Аутентификация:** `/auth/login` `/auth/refresh` `/auth/logout` `/auth/me`

**Дашборд:** `/dashboard`

**Справочники:** `/organizations` `/departments` `/branches` (CRUD + пагинация + search)

**Устройства:**
- `/devices` (CRUD)
- `/devices/{id}/test-connection`
- `/devices/{id}/sync` `/devices/{id}/sync-time`
- `/devices/{id}/snapshot?t=<JWT>` (JPEG-snapshot для `<img>`)

**Сотрудники:**
- `/employees` (CRUD + filter: search/org/dept/branch/status)
- `/employees/{id}/access` `/employees/{id}/assign-devices`
- `/employees/{id}/credentials`
- `/employees/{id}/sync-to-device`
- `/employees/{id}/enroll-fingerprint`
- `/employees/{id}/capture-face` (snapshot+upload автоматом)
- `/employees/{id}/enroll-face` (multipart upload файла)
- `/employees/{id}/add-card` `/employees/{id}/capture-card`

**Расписания:** `/schedules` (CRUD) + `/schedules/{id}/assign`

**Посещаемость:** `/attendance/events` `/attendance/fetch-events` `/attendance/recalculate` `/attendance/reports`

**WebSocket:** `/api/v1/attendance/ws/events`

**Отчёты:** `/reports/timesheet` `/reports/summary` `/reports/export/{csv,excel,pdf}`

**Аудит:** `/audit/logs`

**Настройки:** `/settings`

**Полная документация:** `docs/API.md`

### RBAC

| Роль | Доступ |
|---|---|
| `super_admin` | Полный (включая settings.write) |
| `admin` | Всё кроме settings.write |
| `hr` | Сотрудники, отделы, расписания, отчёты (просмотр) |
| `accountant` | Отчёты + экспорт + отправка в 1С/биллинг |
| `manager` | Просмотр своих отделов |
| `viewer` | Только просмотр |
| `branch_admin` | Управление своим филиалом (устройства, сотрудники) |

24 разрешения по схеме `<resource>.<action>` — см. `backend/app/core/rbac.py`.

### Hikvision клиент

Selectable через `HIKVISION_MODE` в `.env`:

- `mock` (по умолчанию) — `MockClient` генерирует случайные события, для разработки без железа
- `isapi` — реальный `IsapiClient` для production

Конфигурация HTTP Digest auth с DS-K1T343 V4.48 (рабочая):
```env
HIKVISION_MODE=isapi
```

В IsapiClient:
- httpx с `DigestAuth`
- Парсер обоих форматов (XML + JSON) — V4.48 возвращает XML даже на `?format=json`
- Friendly Russian error messages (mapping `cardNoAlreadyExist` → «Карта уже занята» и т.д.)
- subprocess curl для face upload (httpx multipart ломается в этой прошивке)

---

## Что осталось

| # | Задача | Приоритет |
|---|---|:---:|
| 1 | **Этап 6** — интеграции с 1С / биллингом | M |
| 2 | Production HTTPS через Let's Encrypt + Nginx | H |
| 3 | Alembic миграции вместо `CREATE_ALL + ALTER IF NOT EXISTS` | M |
| 4 | Поддержка нескольких устройств **разных моделей** (не только DS-K1T343) | L |
| 5 | Bulk-импорт сотрудников из Excel | M |
| 6 | Auto-cleanup attendance_events старше 1 года | L |
| 7 | Уведомления Telegram/Email при опозданиях | L |
| 8 | Мобильное приложение для сотрудников (PWA?) | L |
| 9 | Двухфакторная аутентификация | L |

---

## Полезные команды

```bash
# Логи
docker compose -f deploy/docker-compose.yml logs -f backend
docker compose -f deploy/docker-compose.yml logs -f frontend

# Перезапуск после git pull
git pull
docker compose -f deploy/docker-compose.yml up -d --build

# Принудительная пересборка (если кэш мешает)
docker compose -f deploy/docker-compose.yml build --no-cache frontend backend
docker compose -f deploy/docker-compose.yml up -d

# Очистить и запустить только устройства/сотрудников
docker compose -f deploy/docker-compose.yml exec postgres psql -U hikv -d hikv -c "
TRUNCATE TABLE
  attendance_reports, attendance_events,
  employee_device_access, employee_credentials,
  employees, devices,
  schedule_assignments, schedule_days, schedules
CASCADE;"

# Полная очистка (БД тоже)
docker compose -f deploy/docker-compose.yml down -v

# Проверить состояние БД
docker compose -f deploy/docker-compose.yml exec postgres psql -U hikv -d hikv -c "
SELECT 'employees' tbl, count(*) FROM employees
UNION ALL SELECT 'devices', count(*) FROM devices
UNION ALL SELECT 'attendance_events', count(*) FROM attendance_events
UNION ALL SELECT 'attendance_reports', count(*) FROM attendance_reports;"

# Проверить связь с устройством
curl -s --digest -u admin:PASSWORD \
  "http://DEVICE_IP/ISAPI/System/deviceInfo?format=json"

# Проверить кто на устройстве
curl -s -X POST --digest -u admin:PASSWORD \
  -H "Content-Type: application/json" \
  -d '{"UserInfoSearchCond":{"searchID":"1","maxResults":50,"searchResultPosition":0}}' \
  "http://DEVICE_IP/ISAPI/AccessControl/UserInfo/Search?format=json" \
  | python3 -m json.tool | grep -E 'employeeNo|name|numOf'
```

---

## Запуск тестов

```bash
cd backend
pip install -e ".[dev]"
pytest -v
```

Текущее покрытие:
- `tests/test_rbac.py` — 7 тестов на матрицу ролей
- `tests/test_security.py` — JWT + bcrypt + Fernet
- `tests/test_hikvision_mock.py` — mock-клиент

---

## Документация

- [ARCHITECTURE.md](./ARCHITECTURE.md) — архитектура, схема БД, REST API, RBAC, план реализации
- [docs/API.md](./docs/API.md) — обзор всех endpoints
- [docs/HIKVISION.md](./docs/HIKVISION.md) — настройка интеграции с ISAPI
- [docs/DEPLOY.md](./docs/DEPLOY.md) — production-развёртывание

---

## Лицензия

Проприетарный проект.
