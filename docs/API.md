# REST API — обзор endpoints

База: `/api/v1`. Авторизация — JWT Bearer (получить через `POST /auth/login`).
Полная интерактивная документация — Swagger UI на `/api/docs`.

## Аутентификация

| Метод | Endpoint | Описание |
|---|---|---|
| POST | `/auth/login` | Логин по email+password → access+refresh токены |
| POST | `/auth/refresh` | Обновление access-токена |
| POST | `/auth/logout` | (no-op — JWT stateless) |
| GET  | `/auth/me` | Текущий пользователь + права |

## Дашборд

| GET | `/dashboard` | KPI, недельная статистика, последние события |

## Справочники (одинаковый CRUD + пагинация + search)

| Префикс | Описание |
|---|---|
| `/organizations` | Юр. лица |
| `/departments` | Отделы (иерархия, `parent_id`) |
| `/branches` | Филиалы / точки / магазины |
| `/users` | Пользователи системы |

Для каждого:
- `GET /` — список (Paginated: `items`, `total`, `page`, `page_size`)
- `POST /` — создание
- `GET /{id}` — детали
- `PUT /{id}` — изменение
- `DELETE /{id}` — удаление

## Устройства

| Метод | Endpoint | Описание |
|---|---|---|
| GET | `/devices` | Список |
| POST | `/devices` | Создание (поле `password` шифруется Fernet) |
| GET/PUT/DELETE | `/devices/{id}` | Стандарт |
| POST | `/devices/{id}/test-connection` | Проверка через Hikvision-клиент |
| POST | `/devices/{id}/sync` | Постановка задачи синхронизации |

## Сотрудники

| Метод | Endpoint | Описание |
|---|---|---|
| GET | `/employees?search=&organization_id=&department_id=&branch_id=&status=` | Список с фильтрами |
| POST/GET/PUT/DELETE | `/employees{/id}` | Стандарт |
| GET | `/employees/{id}/access` | Список устройств с правом доступа |
| POST | `/employees/{id}/assign-devices` | `{device_ids[], access_level, valid_from, valid_to}` |

## Расписания

| Метод | Endpoint | Описание |
|---|---|---|
| GET | `/schedules` | Все расписания с днями |
| POST/PUT/DELETE | `/schedules{/id}` | Стандарт, `days[]` в теле |
| POST | `/schedules/{id}/assign` | `{target_type: employee/department/branch, target_ids[]}` |

## События и табель

| Метод | Endpoint | Описание |
|---|---|---|
| GET | `/attendance/events?date_from=&date_to=&employee_id=&device_id=` | Сырые события |
| POST | `/attendance/fetch-events` | Ручной опрос всех устройств |
| POST | `/attendance/recalculate?date_from=&date_to=` | Пересчёт табеля за период |
| GET | `/attendance/reports?employee_id=&date_from=&date_to=&status=` | Готовые табеля |
| WS  | `/attendance/ws/events` | Live-stream событий |

## Отчёты

| Метод | Endpoint | Описание |
|---|---|---|
| GET | `/reports/timesheet?date_from=&date_to=&organization_id=&department_id=&branch_id=&employee_id=&status=` | Плоский табель |
| GET | `/reports/summary` | Агрегация по статусам |
| GET | `/reports/export/csv?…` | Скачать CSV |
| GET | `/reports/export/excel?…` | Скачать XLSX |
| GET | `/reports/export/pdf?…` | Скачать PDF |

## Аудит

| GET | `/audit/logs?user_id=&entity_type=&action=&date_from=&date_to=` | Журнал действий |

## Настройки системы

| GET | `/settings` | Текущая конфигурация (read-only) |

---

## RBAC — какие разрешения нужны

Каждый write/read endpoint защищён через `Depends(require("perm.code"))`. Полный набор:

```
organizations.read / write
departments.read / write
branches.read / write
devices.read / write / sync
employees.read / write
schedules.read / write
attendance.read / recalculate
reports.read / export
integrations.read / write / send
users.read / write
audit.read
settings.write
```

Матрица «роль × разрешения» — в `backend/app/core/rbac.py`.

## Пагинация

Все списковые endpoints поддерживают:
- `page` (от 1)
- `page_size` (от 1, потолок зависит от ресурса)
- ответ: `{items, total, page, page_size}`

## Ошибки

| Код | Сценарий |
|---|---|
| 400 | Невалидные данные |
| 401 | Нет/протух токен |
| 403 | Не хватает разрешения |
| 404 | Ресурс не найден |
| 409 | Конфликт (например, email уже занят) |
| 422 | Ошибка валидации Pydantic |
