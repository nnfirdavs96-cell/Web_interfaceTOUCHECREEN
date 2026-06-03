# Архитектура и план — Hikvision Access Control Web Platform

Веб-платформа для управления устройствами контроля доступа Hikvision (DS-K1T343 и аналоги), учёта рабочего времени и формирования отчётов. Альтернатива HikCentral/iVMS с более простым и современным интерфейсом.

---

## 1. Технологический стек

### Backend
- **Python 3.12 + FastAPI** — REST API, OpenAPI/Swagger из коробки, async I/O для общения с устройствами.
- **PostgreSQL 16** — основная БД.
- **SQLAlchemy 2.0 + Alembic** — ORM и миграции.
- **Pydantic v2** — валидация схем и настроек.
- **Redis 7** — кэш, брокер очередей, pub/sub для WebSocket.
- **Celery + Celery Beat** — фоновые задачи (опрос устройств, расчёт табелей, отправка отчётов в 1С).
- **httpx** — клиент Hikvision ISAPI (Digest Auth).
- **WebSocket (FastAPI)** — онлайн-события прохода в UI.
- **python-jose + passlib[bcrypt]** — JWT и хеши паролей.
- **openpyxl / reportlab** — экспорт Excel / PDF.

### Frontend
- **React 18 + TypeScript + Vite**.
- **TanStack Query** — серверное состояние, кэш.
- **Zustand** — клиентское состояние (auth, UI).
- **React Router v6**.
- **Tailwind CSS + shadcn/ui (Radix)** — современные компоненты, тёмная/светлая тема.
- **Recharts** — графики дашборда.
- **react-hook-form + zod** — формы и валидация.
- **i18next** — RU/EN/UZ локализация.

### Инфраструктура
- **Docker + Docker Compose** — единый запуск.
- **Nginx** — reverse proxy + статика фронта.
- **GitHub Actions** — CI (lint, tests, build).

---

## 2. Структура монорепо

```
Web_interfaceTOUCHECREEN/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py                 # DI: db, current_user, RBAC guards
│   │   │   └── v1/
│   │   │       ├── auth.py
│   │   │       ├── organizations.py
│   │   │       ├── departments.py
│   │   │       ├── branches.py
│   │   │       ├── devices.py
│   │   │       ├── employees.py
│   │   │       ├── credentials.py
│   │   │       ├── schedules.py
│   │   │       ├── attendance.py
│   │   │       ├── reports.py
│   │   │       ├── integrations.py
│   │   │       ├── users.py
│   │   │       ├── audit.py
│   │   │       └── ws.py               # WebSocket /ws/events
│   │   ├── core/
│   │   │   ├── config.py               # Pydantic Settings (env)
│   │   │   ├── security.py             # JWT, password hashing
│   │   │   ├── rbac.py                 # Roles & permissions matrix
│   │   │   └── logging.py
│   │   ├── db/
│   │   │   ├── base.py                 # Declarative Base
│   │   │   ├── session.py              # engine, SessionLocal
│   │   │   └── seed.py                 # тестовые данные
│   │   ├── models/                     # SQLAlchemy ORM
│   │   │   ├── user.py
│   │   │   ├── organization.py
│   │   │   ├── department.py
│   │   │   ├── branch.py
│   │   │   ├── device.py
│   │   │   ├── employee.py
│   │   │   ├── credential.py
│   │   │   ├── access.py               # employee_device_access
│   │   │   ├── schedule.py
│   │   │   ├── attendance.py
│   │   │   ├── integration.py
│   │   │   └── audit.py
│   │   ├── schemas/                    # Pydantic DTO
│   │   ├── services/
│   │   │   ├── hikvision/
│   │   │   │   ├── base.py             # абстрактный HikvisionClient
│   │   │   │   ├── isapi.py            # реальный ISAPI клиент
│   │   │   │   ├── mock.py             # для разработки без устройств
│   │   │   │   └── service.py          # HikvisionService (façade)
│   │   │   ├── attendance_service.py   # алгоритм расчёта табеля
│   │   │   ├── report_service.py
│   │   │   ├── export_service.py       # Excel/CSV/PDF
│   │   │   └── integration_service.py  # 1С / биллинг
│   │   ├── tasks/                      # Celery tasks
│   │   │   ├── celery_app.py
│   │   │   ├── poll_devices.py
│   │   │   ├── recalc_attendance.py
│   │   │   └── send_reports.py
│   │   ├── utils/
│   │   └── main.py                     # FastAPI app factory
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   ├── tests/
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/                        # axios клиенты по модулям
│   │   ├── components/
│   │   │   ├── ui/                     # shadcn-компоненты
│   │   │   ├── layout/                 # Sidebar, Topbar, Shell
│   │   │   ├── tables/                 # DataTable
│   │   │   ├── forms/
│   │   │   └── charts/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── organizations/
│   │   │   ├── departments/
│   │   │   ├── branches/
│   │   │   ├── devices/
│   │   │   ├── employees/
│   │   │   ├── schedules/
│   │   │   ├── attendance/
│   │   │   ├── reports/
│   │   │   ├── integrations/
│   │   │   ├── users/
│   │   │   ├── audit/
│   │   │   └── settings/
│   │   ├── hooks/
│   │   ├── stores/                     # zustand
│   │   ├── lib/                        # utils, dayjs, formatters
│   │   ├── locales/                    # ru/en/uz
│   │   ├── router.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   ├── Dockerfile
│   └── package.json
│
├── deploy/
│   ├── nginx/nginx.conf
│   └── docker-compose.yml
├── docs/
│   ├── ARCHITECTURE.md (этот файл)
│   ├── API.md
│   ├── HIKVISION.md
│   └── DEPLOY.md
└── README.md
```

---

## 3. Схема базы данных

### Перечень таблиц
`users`, `roles`, `permissions`, `role_permissions`, `organizations`, `departments`, `branches`, `devices`, `employees`, `employee_credentials`, `employee_device_access`, `schedules`, `schedule_days`, `schedule_assignments`, `attendance_events`, `attendance_reports`, `integrations`, `integration_logs`, `audit_logs`.

### Основные сущности

**users**
- `id` UUID PK, `email` UNIQUE, `password_hash`, `full_name`, `role_id` FK→roles, `branch_id` FK→branches NULL (для админа филиала), `is_active`, `last_login_at`, `created_at`, `updated_at`.
- Индексы: `email`, `role_id`.

**roles** / **permissions** / **role_permissions**
- `roles(id, code, name)` — `super_admin`, `admin`, `hr`, `accountant`, `manager`, `viewer`, `branch_admin`.
- `permissions(id, code, name)` — `employees.create`, `devices.sync`, `reports.export`, …
- `role_permissions(role_id, permission_id)` M2M.

**organizations**
- `id`, `name`, `inn`, `address`, `phone`, `email`, `responsible_person`, `comment`, timestamps.

**departments**
- `id`, `organization_id` FK, `parent_id` FK→departments NULL (иерархия), `name`, `comment`.

**branches** (точки/филиалы/магазины)
- `id`, `organization_id` FK, `name`, `address`, `responsible`, `phone`, `working_hours`, `comment`.

**devices**
- `id`, `branch_id` FK, `name`, `type` (face/fingerprint/card/multi), `ip`, `port`, `username`, `password_encrypted`, `serial_number`, `firmware`, `online`, `last_seen_at`, `purpose` (entry/exit/warehouse/server_room/main), `created_at`.
- Индексы: `ip`, `branch_id`, `online`.

**employees**
- `id`, `external_id` (для 1С), `first_name`, `last_name`, `middle_name`, `phone`, `email`, `organization_id`, `department_id`, `branch_id`, `position`, `photo_url`, `status` (active/inactive), `hired_at`, `comment`.
- Индексы: `external_id`, `department_id`, `branch_id`, `status`, FTS на ФИО.

**employee_credentials**
- `id`, `employee_id` FK, `type` (fingerprint/face/card/pin), `value_ref` (id на устройстве / маскированный PIN), `device_id` FK NULL, `enrolled_at`.

**employee_device_access**
- `id`, `employee_id` FK, `device_id` FK, `schedule_id` FK NULL, `access_level`, `valid_from`, `valid_to`, `synced_at`.
- UNIQUE(`employee_id`, `device_id`).

**schedules**
- `id`, `name`, `type` (office/shop/security/individual), `allowed_late_minutes`, `allowed_early_leave_minutes`, `night_shift` bool, `lunch_start`, `lunch_end`, `comment`.

**schedule_days**
- `id`, `schedule_id` FK, `weekday` (0–6), `is_workday`, `start_time`, `end_time`, `shift_no`.

**schedule_assignments**
- `id`, `schedule_id` FK, `target_type` (employee/department/branch), `target_id`, `valid_from`, `valid_to`.

**attendance_events** (сырые события устройств)
- `id`, `employee_id` FK, `device_id` FK, `event_time` TIMESTAMPTZ, `event_type` (entry/exit/unknown), `success`, `raw_payload` JSONB.
- Индексы: (`employee_id`, `event_time`), (`device_id`, `event_time`).

**attendance_reports** (рассчитанный табель)
- `id`, `employee_id`, `date`, `required_check_in`, `actual_check_in`, `required_check_out`, `actual_check_out`, `late_minutes`, `early_leave_minutes`, `worked_minutes`, `status` (normal/late/absent/partial/early_leave), `device_in_id`, `device_out_id`.
- UNIQUE(`employee_id`, `date`).

**integrations**
- `id`, `type` (1c/billing/webhook), `name`, `url`, `auth_token_encrypted`, `method`, `interval_minutes`, `is_active`, `last_run_at`.

**integration_logs**
- `id`, `integration_id` FK, `payload` JSONB, `response` JSONB, `status_code`, `success`, `error`, `created_at`.

**audit_logs**
- `id`, `user_id` FK, `action`, `entity_type`, `entity_id`, `before` JSONB, `after` JSONB, `ip`, `user_agent`, `created_at`.

### Ключевые связи
- `organization 1—N department 1—N employee`.
- `organization 1—N branch 1—N device`.
- `employee N—M device` через `employee_device_access`.
- `schedule N—M employee/department/branch` через `schedule_assignments`.
- `employee 1—N attendance_event 1—1 attendance_report (per date)`.

---

## 4. RBAC — матрица прав

| Модуль / Роль        | super_admin | admin | hr  | accountant | manager | viewer | branch_admin |
|----------------------|:-----------:|:-----:|:---:|:----------:|:-------:|:------:|:------------:|
| Организации (CRUD)   | ✔           | ✔     | R   | R          | R       | R      | R (своя)     |
| Отделы (CRUD)        | ✔           | ✔     | ✔   | R          | R       | R      | R (свои)     |
| Филиалы (CRUD)       | ✔           | ✔     | R   | R          | R       | R      | R (свой)     |
| Устройства           | ✔           | ✔     | —   | —          | R       | R      | CRUD (свой)  |
| Сотрудники           | ✔           | ✔     | CRUD| R          | R       | R      | CRUD (свой)  |
| Расписания           | ✔           | ✔     | ✔   | R          | R       | R      | R            |
| Отчёты просмотр      | ✔           | ✔     | ✔   | ✔          | ✔ (свои)| ✔      | ✔ (свой)     |
| Отчёты экспорт       | ✔           | ✔     | ✔   | ✔          | —       | —      | ✔            |
| Интеграции 1С/биллинг| ✔           | ✔     | —   | ✔ send     | —       | —      | —            |
| Пользователи системы | ✔           | ✔     | —   | —          | —       | —      | —            |
| Настройки системы    | ✔           | —     | —   | —          | —       | —      | —            |

Реализация: декоратор `Depends(require("employees.create"))`. Branch-scope: middleware подмешивает `branch_id` в запросы для `branch_admin`/`manager`.

---

## 5. REST API (v1)

База: `/api/v1`. Аутентификация — JWT Bearer.

### Auth
- `POST /auth/login` → `{access_token, refresh_token, user}`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET  /auth/me`

### CRUD-ресурсы (одинаковая форма)
`/organizations`, `/departments`, `/branches`, `/schedules`, `/users` —
`GET` (list+filter+pagination), `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`.

### Devices
- стандартный CRUD
- `POST /devices/{id}/test-connection`
- `POST /devices/{id}/sync`
- `POST /devices/{id}/fetch-events?from&to`
- `GET  /devices/{id}/journal`

### Employees
- стандартный CRUD + bulk-импорт CSV
- `POST /employees/{id}/assign-devices` `{device_ids[], schedule_id, valid_from, valid_to}`
- `POST /employees/{id}/credentials` `{type, device_id}`
- `GET  /employees/{id}/attendance?from&to`

### Schedules
- CRUD + `POST /schedules/{id}/assign` `{target_type, target_ids[]}`

### Attendance
- `GET  /attendance/events?employee_id&device_id&from&to`
- `POST /attendance/fetch-events` (триггер задачи для всех устройств)
- `POST /attendance/recalculate?from&to`

### Reports
- `GET /reports/daily?date&...`
- `GET /reports/weekly`, `/reports/monthly`
- `GET /reports/late`, `/reports/absent`, `/reports/early-leave`
- `GET /reports/employee/{id}?from&to`
- `GET /reports/department/{id}`, `/reports/branch/{id}`
- `GET /reports/timesheet` (сводный табель)
- `GET /reports/export/{excel|csv|pdf}?type&...`

### Integrations
- CRUD `/integrations`
- `POST /integrations/{id}/send` `{report_type, period}`
- `POST /integrations/{id}/test`
- `GET  /integrations/{id}/logs`

### Audit
- `GET /audit/logs?user_id&entity_type&from&to`

### WebSocket
- `WS /ws/events` — стрим новых `attendance_events` и статусов устройств (online/offline).

---

## 6. Алгоритм расчёта рабочего времени

```
для каждого (employee, date):
    schedule = эффективное расписание сотрудника на дату
              (приоритет: индивидуальное > отдел > филиал)
    events  = SELECT FROM attendance_events
              WHERE employee_id = E
                AND event_time IN [date_start_window, date_end_window]
                AND success = true
              ORDER BY event_time

    если расписание ночное (end < start):
        окно: [start_of_shift_day, end_of_shift_day + 1)
    иначе:
        окно: [date 00:00, date 24:00)

    если events пусто → status = absent
    иначе:
        actual_in  = events[0].event_time
        actual_out = events[-1].event_time
        late       = max(0, actual_in  - required_in  - allowed_late)
        early      = max(0, required_out - actual_out - allowed_early)
        worked     = actual_out - actual_in - lunch_duration
        status     = late если late>0
                  иначе early_leave если early>0
                  иначе partial если worked < min_hours
                  иначе normal

    UPSERT в attendance_reports (employee_id, date)
```

Запуск:
- автоматически по Celery Beat (`*/15 минут` — расчёт за сегодня, `03:00` — пересчёт за вчера),
- ручной `POST /attendance/recalculate`.

---

## 7. Интеграция с Hikvision

Абстракция через интерфейс, чтобы можно было заменять реализации:

```python
class HikvisionClient(Protocol):
    async def test_connection(self) -> bool: ...
    async def get_device_info(self) -> DeviceInfo: ...
    async def fetch_events(self, since: datetime, until: datetime) -> list[RawEvent]: ...
    async def create_user(self, employee: EmployeeDTO) -> str: ...
    async def update_user(self, employee: EmployeeDTO) -> None: ...
    async def delete_user(self, ext_id: str) -> None: ...
    async def enroll_fingerprint(self, ext_id: str) -> EnrollSession: ...
    async def assign_access(self, ext_id: str, schedule_id: str) -> None: ...
```

Реализации:
- `IsapiClient` — реальный ISAPI (HTTP Digest, эндпоинты `/ISAPI/AccessControl/UserInfo/Record?format=json`, `/ISAPI/AccessControl/AcsEvent?format=json` и т.п.).
- `MockClient` — для dev без устройств; генерирует случайные события.

`HikvisionService` — фасад, который по `device_id` берёт настройки из БД, расшифровывает пароль и возвращает соответствующий клиент. Все вызовы async. Ошибки логируются в `integration_logs` с тегом `hikvision`.

Опрос событий: Celery-таска `poll_devices` каждые 30 сек обходит онлайн-устройства, вызывает `fetch_events(since=last_seen)`, делает upsert в `attendance_events` и публикует в Redis pub/sub для WebSocket.

---

## 8. Безопасность

- JWT (access 15 мин, refresh 7 дн), refresh ротация.
- Пароли — bcrypt.
- Пароли устройств и токены интеграций — шифрование Fernet (ключ из `SECRET_KEY`).
- CORS — белый список.
- Rate limit на `/auth/*` через slowapi.
- Audit log всех write-операций (через FastAPI dependency).
- HTTPS — терминируется Nginx.

---

## 9. Frontend — структура и UX

### Layout
- **Sidebar (свернутый/развернутый)** — иконки + подписи, бейджи (онлайн устройства, опоздавшие сегодня).
- **Topbar** — поиск, переключатель темы, язык, профиль.
- **Content** — карточки, таблицы, графики.

### Цветовая палитра
- Primary: `#2563eb` (синий) / акцент `#dc2626` (красный для статусов).
- Статусы: online `#10b981`, offline `#ef4444`, warning `#f59e0b`, late `#f97316`.
- Dark mode через `class="dark"` Tailwind.

### Ключевые страницы

| Страница             | Компоненты                                                    |
|----------------------|---------------------------------------------------------------|
| Login                | форма, лого, переключатель языка                              |
| Dashboard            | 6 KPI-карточек, график неделя (BarChart), таблица последних событий, быстрые действия |
| Организации          | таблица + drawer создания/редактирования                      |
| Отделы               | tree-view иерархии + панель деталей                           |
| Филиалы              | таблица + карта (опционально)                                 |
| Устройства           | grid карточек со статусом, кнопки «тест/синк/события»         |
| Сотрудники           | таблица с фильтрами, аватары, drawer карточки                 |
| Карточка сотрудника  | tabs: профиль, устройства, расписания, история, отчёт         |
| Назначение на устройство | мастер: сотрудник → устройства → расписание → подтвердить |
| Расписания           | список + визуальный конструктор недели                        |
| Приход/уход          | таблица по дате с фильтрами и цветовыми статусами             |
| Отчёты               | конструктор фильтров → таблица → экспорт (3 кнопки)           |
| Интеграции           | карточки 1С/биллинг, тест, логи                               |
| Пользователи / Роли  | CRUD + матрица прав (чекбоксы)                                |
| Логи действий        | таблица с фильтрами + diff before/after                       |
| Настройки            | разделы: общие, Hikvision, 1С/биллинг, безопасность           |

### Состояние и данные
- `TanStack Query` для всех API-вызовов, ключи вида `["employees", filters]`.
- Оптимистические апдейты для CRUD.
- WebSocket-хук `useLiveEvents()` инвалидирует кэш дашборда.

---

## 10. Docker Compose

Сервисы: `postgres`, `redis`, `backend`, `worker` (Celery), `beat` (Celery Beat), `frontend` (билд → nginx), `nginx` (reverse proxy 80/443).

Тома: `pg_data`, `redis_data`, `uploads` (фото сотрудников).

Сети: `internal` (БД, Redis, бэкенд), `public` (Nginx).

`.env` — единый файл с настройками: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `JWT_*`, `HIKVISION_MODE=mock|isapi`, `CORS_ORIGINS`.

---

## 11. План реализации (этапы)

### Этап 1 — Фундамент (1–2 дня)
1. Скаффолд `backend/` (FastAPI app, config, db, alembic).
2. Скаффолд `frontend/` (Vite + React + Tailwind + shadcn).
3. `docker-compose.yml` с Postgres+Redis+backend+frontend.
4. Auth: модели `users/roles/permissions`, JWT, `/auth/*`, страница Login.
5. Layout фронта (Sidebar, Topbar, защита роутов).

### Этап 2 — Справочники (1–2 дня)
1. CRUD: organizations, departments (иерархия), branches.
2. CRUD: users + матрица прав.
3. RBAC dependency, аудит-лог middleware.

### Этап 3 — Устройства и сотрудники (2–3 дня)
1. CRUD devices + шифрование паролей.
2. `HikvisionClient` (mock + isapi stub), `test-connection`, `get-info`.
3. CRUD employees + bulk-импорт + назначение на устройства.
4. Страница карточки сотрудника.

### Этап 4 — Расписания и события (2 дня)
1. Schedules + schedule_days + assignments.
2. Конструктор расписания на фронте.
3. Celery + `poll_devices`, сохранение `attendance_events`.
4. WebSocket стрим событий, лента на дашборде.

### Этап 5 — Отчёты (2 дня)
1. `attendance_service` — алгоритм расчёта.
2. Celery Beat: пересчёт.
3. Endpoints отчётов + страницы.
4. Экспорт Excel/CSV/PDF.

### Этап 6 — Интеграции (1 день)
1. Модель `integrations` + страница настроек.
2. `integration_service` — отправка JSON-табелей, ретраи.
3. Страница логов.

### Этап 7 — Полировка (1–2 дня)
1. Dashboard KPI, графики.
2. Тёмная тема, локализация RU/EN/UZ.
3. Seed-данные: 1 организация, 2 филиала, 3 отдела, 10 сотрудников, 2 устройства (mock), 2 расписания, события за 7 дней.
4. README + DEPLOY.md + HIKVISION.md.
5. Тесты ключевых сервисов (attendance, rbac, hikvision mock).

---

## 12. Что нужно решить с пользователем перед стартом кода

1. **Hikvision-устройство** есть физически для тестов или начинаем с `MockClient`?
2. **Локализация:** только RU или сразу RU/EN/UZ?
3. **Многопользовательский tenant** (несколько компаний на одной установке) или single-tenant?
4. **1С**: какая конфигурация (УНФ/ЗУП/Бухгалтерия) и формат интеграции (HTTP-сервис / web-сервис SOAP / выгрузка файла)?
5. **Хостинг**: on-prem (локальный сервер у заказчика) или облако?
6. **Хранилище фото**: локальный диск или S3-совместимое?
