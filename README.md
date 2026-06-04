# Hikvision Access Control Web Platform

Современная веб-платформа для управления устройствами контроля доступа Hikvision (DS-K1T343 и аналоги), учёта рабочего времени сотрудников и формирования отчётов. Альтернатива HikCentral / iVMS с упором на простоту и красивый UI.

> **Статус:** реализовано 5 из 7 этапов. Система готова к работе с mock-устройствами; для подключения реального оборудования нужно дополнить `IsapiClient` (см. этап 3).

---

## Возможности (итоговая цель)

- Подключение и мониторинг устройств Hikvision (IP, порт, логин, статус online/offline).
- Управление организациями, отделами (иерархия), филиалами/точками.
- Реестр сотрудников: ФИО, фото, должность, статус, поиск и фильтры.
- Назначение сотрудников на устройства (отпечаток, лицо, карта, PIN).
- Расписания рабочего времени: офис, магазин, охрана 24/7, ночные смены, индивидуальные.
- Автоматический учёт прихода/ухода, опозданий, раннего ухода, отсутствий.
- Отчёты: дневной, недельный, месячный, по сотруднику/отделу/филиалу, сводный табель.
- Экспорт в **Excel / CSV / PDF**.
- Интеграция с **1С** и биллингом через REST API.
- RBAC: супер-админ, админ, отдел кадров, бухгалтерия, руководитель, наблюдатель, админ филиала.
- WebSocket — события прохода в реальном времени.
- Тёмная/светлая тема, RU/EN/UZ локализация.

---

## Технологический стек

**Backend:** Python 3.12, FastAPI, PostgreSQL 16, Redis 7, SQLAlchemy 2.0 + Alembic, Celery, httpx, JWT, openpyxl, reportlab, cryptography (Fernet).

**Frontend:** React 18 + TypeScript + Vite, Tailwind CSS, TanStack Query, Zustand, lucide-react.

**Infra:** Docker Compose, Nginx, GitHub Actions.

Подробности — в [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Структура репозитория

```
backend/    — FastAPI приложение, модели, миграции, фоновые задачи
frontend/   — React + TS приложение (Vite)
deploy/     — docker-compose, nginx
docs/       — документация (API, Hikvision, Deploy)
```

---

## Запуск

```bash
git clone <repo>
cd Web_interfaceTOUCHECREEN
cp backend/.env.example backend/.env
docker compose -f deploy/docker-compose.yml up -d --build
```

После старта:
- Веб-интерфейс: http://localhost:8090
- API + Swagger: http://localhost:8090/api/docs
- Health-check: http://localhost:8090/api/health
- Логин по умолчанию: `admin@hikvision.dev` / `admin`

### Локальная разработка фронта

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173 → проксирует /api на backend:8000
```

---

## Прогресс по этапам

### ✅ Этап 1 — Фундамент

Каркас приложения, авторизация, RBAC, базовый UI.

**Backend:**
- Структура проекта (`app/{core,db,models,schemas,api/v1}`).
- Настройки через `pydantic-settings` (`.env`).
- JWT (access 15 мин + refresh 7 дн), bcrypt-хеши паролей.
- **RBAC-матрица: 7 ролей × 24 разрешения**, dependency `require("perm.code")`.
- Модели `roles`, `users`; автосоздание таблиц + seed `admin@hikvision.dev`.
- Endpoints: `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`, `GET /api/health`.
- Dockerfile + `.env.example`.

**Frontend:**
- Auth store (Zustand + persist), axios с JWT-интерсептором, авто-логаут на 401.
- **Login** — страница с брендингом, dark mode toggle.
- **Layout Shell**: Sidebar (13 разделов), Topbar (поиск, тема, профиль, logout).
- ProtectedRoute, React Router v6.
- TanStack Query + Tailwind с брендовыми цветами.

**Infra:** docker-compose (postgres + redis + backend + frontend на nginx), порт 8090.

---

### ✅ Этап 2 — Справочники

Базовые сущности и аудит.

**Backend:**
- 4 таблицы: `organizations`, `departments` (self-referencing иерархия), `branches`, `audit_logs` (JSONB before/after).
- **Generic CRUD helper** — единая логика list/get/create/update/delete с автоматическим аудитом.
- 5 роутеров: `/organizations`, `/departments`, `/branches`, `/users` (full CRUD), `/audit/logs`.
- RBAC на каждом endpoint.
- Каждая write-операция → запись в `audit_logs` с user/IP/user-agent.

**Frontend:**
- Переиспользуемые UI: `Button`, `Input`, `Textarea`, `Field`, `Drawer`, `DataTable`, `PageHeader`.
- Страницы: Организации, Отделы (tree-view с иерархией), Филиалы, Пользователи, Логи действий.
- Поиск, пагинация, цветные статус-чипы, оптимистичная инвалидация кэша.

---

### ✅ Этап 3 — Устройства + Hikvision + Сотрудники

**Backend:**
- 4 таблицы: `devices`, `employees`, `employee_credentials`, `employee_device_access`.
- **Fernet-шифрование** паролей устройств (ключ выводится из `SECRET_KEY`).
- **Hikvision-абстракция:**
  - `HikvisionClient` Protocol — единый интерфейс (test_connection, fetch_events, upsert/delete_user).
  - `MockClient` — работает без железа, фейк-serial, генерирует случайные события.
  - `IsapiClient` — заглушка для реального ISAPI (HTTP Digest), эндпоинты `/ISAPI/System/deviceInfo`, `/ISAPI/AccessControl/AcsEvent`. **Требует доработки при подключении устройства.**
  - `HikvisionService.client_for(device)` — фасад, выбирает реализацию по `HIKVISION_MODE` env.
- Endpoints: `/devices` CRUD + `/test-connection` + `/sync`, `/employees` CRUD + `/access` + `/assign-devices`.

**Frontend:**
- **Устройства**: карточная сетка с online/offline бейджами, IP/serial/firmware, кнопки Проверить/Синк/Edit/Delete.
- **Сотрудники**: фильтруемая таблица (поиск, организация, статус), аватарки-инициалы, drawer редактирования с каскадными селектами.
- **Назначение устройств** — drawer с чек-боксами и online-индикатором каждого устройства.

---

### ✅ Этап 4 — Расписания + События + Live

**Backend:**
- 5 таблиц: `schedules`, `schedule_days`, `schedule_assignments`, `attendance_events`, `attendance_reports` (unique per employee+date).
- **Алгоритм расчёта табеля** (`services/attendance.py`):
  - подбор расписания: индивидуальное > отдел > филиал;
  - окно событий с поддержкой **ночных смен**;
  - вычет обеденного перерыва;
  - пороги допустимого опоздания / раннего ухода;
  - 6 статусов: `normal`, `late`, `early_leave`, `absent`, `partial`, `day_off`.
- **Фоновый poller** (asyncio task, 30 сек): обходит устройства через `HikvisionService`, делает upsert событий, связывает с сотрудниками по `external_id`, шлёт в WebSocket.
- **Фоновый пересчёт** (10 мин) — табель за вчера/сегодня.
- **WebSocket** `/api/v1/attendance/ws/events`: `ConnectionManager` для broadcast живых событий.
- Endpoints: `/schedules` CRUD + `/assign`, `/attendance/events`, `/attendance/fetch-events` (ручной триггер), `/attendance/recalculate`, `/attendance/reports`, `/dashboard`.
- Nginx: WebSocket upgrade headers для `/api/`.

**Frontend:**
- **Расписания**: card grid + drawer с **визуальным конструктором** недели (чек-боксы дней + time-инпуты).
- **Drawer назначения** — выбор employee/department/branch с чек-боксами.
- **Приход/уход**: фильтр по датам, таблица событий, кнопки «Опросить устройства» и «Пересчитать табель», **live-счётчик WebSocket**.
- **Дашборд**: 6 KPI-карточек с реальными цифрами, недельная bar-диаграмма посещаемости, лента последних событий.

---

### ✅ Этап 5 — Отчёты + Экспорт

**Backend:**
- `services/report.py` — `fetch_rows` с JOIN `attendance_reports` + `employees` и фильтрами (даты, employee, department, branch, organization, status).
- `services/export.py` — три формата:
  - **CSV** (UTF-8 BOM для корректной Excel-кодировки, разделитель `;`).
  - **Excel** (`openpyxl` с автоширинами колонок).
  - **PDF** (`reportlab`, landscape A4, стилизованная таблица с шапкой брендового цвета).
- Endpoints: `/reports/timesheet`, `/reports/summary` (агрегация по статусам), `/reports/export/{csv,excel,pdf}`.

**Frontend:**
- **Отчёты**: сводные чипы по статусам (Норма / Опоздания / Отсутствия / Всего), мульти-фильтр (даты, орг, отдел, филиал, статус), таблица табеля, **3 кнопки экспорта** — скачивание через blob с правильным именем файла.

---

### ⏳ Этап 6 — Интеграции с 1С и биллингом

**План — backend:**
- Модель `integrations` (id, type=1c/billing/webhook, name, url, auth_token_encrypted, method, interval_minutes, is_active, last_run_at).
- Модель `integration_logs` (payload, response, status_code, success, error, created_at).
- `services/integration.py`:
  - сборка JSON-табеля по сотруднику/периоду (формат из ТЗ);
  - HTTP-отправка через httpx с ретраями и экспоненциальным backoff;
  - запись в `integration_logs`.
- Endpoints:
  - CRUD `/integrations`,
  - `POST /integrations/{id}/test` — проверка соединения,
  - `POST /integrations/{id}/send` — ручная отправка отчёта,
  - `GET /integrations/{id}/logs` — журнал доставок.
- Автоматическая периодическая отправка (фоновая задача по `interval_minutes`).
- Внешний REST API (для приёма запросов от 1С/биллинга):
  - `GET /api/external/employees` (с токеном),
  - `GET /api/external/timesheet?period=...`,
  - `GET /api/external/events`.

**План — frontend:**
- Страница **Интеграции**: карточки 1С/биллинг с кнопками Test/Send/Edit, форма настройки (URL, токен, интервал, метод).
- Страница **Логи интеграции**: таблица с фильтрами (по интеграции, статусу, дате), детальный просмотр payload/response.

---

### ⏳ Этап 7 — Полировка и финализация

**План — backend:**
- Страница **Настройки**: редактирование SECRET_KEY (ротация Fernet), HIKVISION_MODE, CORS_ORIGINS из БД.
- **Seed-данные для демо**: 1 организация, 2 филиала, 3 отдела, 10 сотрудников с фото-плейсхолдерами, 2 устройства (mock), 2 расписания, события за 7 дней назад.
- **Тесты** (`pytest`):
  - юнит на алгоритм расчёта табеля (норма / опоздание / ночная смена / обед);
  - юнит на RBAC матрицу;
  - юнит на mock-Hikvision клиент;
  - интеграционные тесты основных REST-эндпоинтов.
- Документация:
  - `docs/API.md` — описание всех endpoints.
  - `docs/HIKVISION.md` — как заполнить `IsapiClient` под реальное устройство, какие ISAPI вызовы использовать.
  - `docs/DEPLOY.md` — production-развёртывание (HTTPS, обратный прокси, бэкапы postgres).

**План — frontend:**
- **Локализация i18next**: RU / EN / UZ, переключатель в Topbar.
- **Страница «Настройки»**: общие параметры, безопасность, Hikvision, 1С/биллинг.
- **Карточка сотрудника** на отдельной странице с табами: профиль / устройства / расписания / история / отчёт.
- Полировка dashboard: добавить топ опоздавших, статистику по филиалам.
- Drag & drop загрузка фото сотрудника.
- Полная проверка адаптивности (мобильная и планшетная вёрстка).

---

## RBAC — кратко

| Роль | Доступ |
|---|---|
| `super_admin` | Полный доступ + настройки системы |
| `admin` | Всё кроме settings.write |
| `hr` | Сотрудники, отделы, расписания, отчёты (просмотр) |
| `accountant` | Отчёты + экспорт + отправка в 1С/биллинг |
| `manager` | Просмотр своих отделов и отчётов |
| `viewer` | Только просмотр |
| `branch_admin` | Управление своим филиалом (устройства, сотрудники) |

Полная матрица — в `backend/app/core/rbac.py`.

---

## Hikvision

По умолчанию `HIKVISION_MODE=mock` — система работает без реального оборудования, mock-клиент генерирует случайные события.

Для подключения реального устройства:
1. В `backend/.env` поставить `HIKVISION_MODE=isapi`.
2. Дописать методы в `backend/app/services/hikvision/isapi.py` (`fetch_events`, `upsert_user`, `delete_user`) — там стоят TODO с указанием ISAPI-эндпоинтов.
3. Перезапустить backend.

---

## Документация

- [ARCHITECTURE.md](./ARCHITECTURE.md) — архитектура, схема БД, REST API, RBAC, план реализации.
- `docs/HIKVISION.md` — настройка интеграции с ISAPI (этап 7).
- `docs/DEPLOY.md` — production-развёртывание (этап 7).

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

# Остановить всё
docker compose -f deploy/docker-compose.yml down

# Полная очистка (БД тоже)
docker compose -f deploy/docker-compose.yml down -v
```

---

## Лицензия

Проприетарный проект. Все права принадлежат заказчику.
