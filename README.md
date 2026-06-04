# Hikvision Access Control Web Platform

Современная веб-платформа для управления устройствами контроля доступа Hikvision (DS-K1T343 и аналоги), учёта рабочего времени сотрудников и формирования отчётов. Альтернатива HikCentral / iVMS с упором на простоту и красивый UI.

> **Статус:** проектирование. Код будет добавляться по этапам согласно [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Возможности

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

**Backend:** Python 3.12, FastAPI, PostgreSQL 16, Redis 7, SQLAlchemy 2.0 + Alembic, Celery, httpx, JWT.

**Frontend:** React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, Recharts.

**Infra:** Docker Compose, Nginx, GitHub Actions.

Подробности — в [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Структура репозитория

```
backend/    — FastAPI приложение, модели, миграции, Celery задачи
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
- Веб-интерфейс: http://localhost
- API + Swagger: http://localhost/api/docs
- Health-check: http://localhost/api/health
- Логин по умолчанию: `admin@local` / `admin` (создаётся автоматически при первом запуске).

### Локальная разработка фронта

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173 → проксирует /api на backend:8000
```

---

## Документация

- [ARCHITECTURE.md](./ARCHITECTURE.md) — архитектура, схема БД, REST API, RBAC, план реализации.
- `docs/HIKVISION.md` — настройка интеграции с ISAPI (будет добавлено).
- `docs/DEPLOY.md` — production-развёртывание (будет добавлено).

---

## План реализации

7 этапов, ~10–14 дней:

1. Фундамент: scaffold + auth + layout.
2. Справочники: организации, отделы, филиалы, пользователи системы.
3. Устройства и сотрудники + Hikvision-абстракция.
4. Расписания и события (Celery + WebSocket).
5. Отчёты и экспорт.
6. Интеграции с 1С / биллингом.
7. Полировка: дашборд, темы, локализация, seed, тесты.

Подробности — в разделе «План реализации» в [ARCHITECTURE.md](./ARCHITECTURE.md#11-план-реализации-этапы).

---

## Лицензия

Проприетарный проект. Все права принадлежат заказчику.
