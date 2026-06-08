# Claude — память проекта

> Этот файл — твоё «короткое состояние». Читай его в начале сессии вместо обхода кодовой базы. Обновляй после крупных изменений.

## Что это

Web-платформа управления Hikvision DS-K1T343MFWX (прошивка V4.48). Альтернатива HikCentral.
Заказчик в Худжанде (Таджикистан, UTC+5). Деплой на сервере `192.168.0.162:8090`, устройство `192.168.0.31:80`.

## Ветка работы

`claude/dreamy-gauss-5ZXt4` → merge в `main`. Каждый коммит сразу пушится и сливается через `--no-ff`.

## Стек

- **Backend**: FastAPI + SQLAlchemy 2.0 + PostgreSQL 16 + asyncio poller + httpx + subprocess curl (для специфики Hikvision)
- **Frontend**: React 18 + Vite + TypeScript + Tailwind + TanStack Query + Zustand + i18next
- **Infra**: docker-compose (postgres + redis + backend + frontend), nginx на порту 8090
- **Логин по умолчанию**: `admin@hikvision.dev` / `admin`

## Структура (только то, что часто нужно)

```
backend/app/
├── api/v1/
│   ├── devices.py       # CRUD + test-connection + sync-time + snapshot
│   ├── employees.py     # CRUD + auto-sync + credentials endpoints
│   └── attendance.py / reports.py / ...
├── services/hikvision/
│   ├── isapi.py         # ГЛАВНЫЙ файл — все ISAPI вызовы V4.48
│   ├── mock.py          # Mock для разработки
│   └── service.py       # Facade
├── services/poller.py   # asyncio фоновый poller (30s событий + 1h tz-sync)
└── main.py              # FastAPI factory + startup + ALTER TABLE миграции
frontend/src/
├── pages/employees/EmployeeDetailPage.tsx   # 5 вкладок (Профиль/Устройства/Регистрация/История/Табель)
├── pages/devices/DevicesPage.tsx            # Сетка карточек устройств + tz dropdown
└── api/                                     # axios клиенты
```

## Hikvision V4.48 квирки (запомни — это спасает время!)

| Endpoint | Формат | Замечание |
|---|---|---|
| `/UserInfo/Record` POST | **single object** `{"UserInfo":{...}}` | НЕ массив! |
| `/UserInfo/Modify` PUT | single object | Fallback из Record |
| `/CaptureFingerPrint` POST | **XML body** | JSON → badXmlContent |
| `/CaptureCardInfo` POST | XML body | |
| `/CardInfo/Record` POST | single object JSON | |
| `/Intelligent/FDLib/FDSetUp` PUT | **multipart через `subprocess curl`** | httpx ломает формат. Поле **`FaceImage`** не `img`! |
| `/AcsEvent` POST | JSON pagination | major=5 |
| `/Streaming/channels/101/picture` | GET | Канал 1 даёт 404, нужен **101** |
| `/System/time` PUT | **XML без xmlns/version** | `CST-5:00:00` = UTC+5 (знак инвертирован) |
| `/System/deviceInfo` GET | XML даже при `?format=json` | Парсер обрабатывает оба |
| `/UserRightWeekPlanCfg/1` PUT | JSON, 56 слотов (7дн×8) | **Расписание доступа!** Без него «неверное время» |
| `/UserRightPlanTemplate/1` PUT | JSON | enable+weekPlanNo:1 → привязка шаблона |

## КРИТИЧНО: «неверное время» = пустое расписание доступа (не часы!)

Если терминал постоянно пишет «неверное время» / отказывает в проходе даже
с зарегистрированным лицом — это НЕ про clock. Это пустой `UserRightWeekPlanCfg/1`
и выключенный `UserRightPlanTemplate/1` (с завода enable:false). Лечится
`ensure_24x7_schedule()` (вызывается авто при test-connection). Включает
weekPlan 24/7 + привязывает шаблон 1.

## Что V4.48 НЕ умеет

- ❌ Нет API для face enrollment mode на экране (CaptureFace, CaptureFaceData, AddUser/* — всё 404/notSupport)
- Это требует binary SDK на порту 8000, недоступный через HTTP
- Поэтому лицо мы регистрируем тихим snapshot+upload в библиотеку `HCFaceLibblackFD`
- Отпечаток и карту умеет (`CaptureFingerPrint` / `CaptureCardInfo` работают)

## Статус этапов (7 шт.)

| # | Этап | Статус |
|---|---|---|
| 1 | Auth + RBAC (7 ролей × 24 разр.) + Layout | ✅ |
| 2 | Справочники + аудит | ✅ |
| 3 | Устройства + Hikvision (Mock/ISAPI) + сотрудники | ✅ |
| 4 | Расписания + события + WebSocket + расчёт табеля | ✅ |
| 5 | Отчёты + экспорт CSV/Excel/PDF | ✅ |
| **6** | **Интеграции 1С/биллинг** | **⏳ ОТЛОЖЕН** |
| 7 | i18n (RU/EN/UZ) + settings + demo seed + тесты + docs | ✅ |

## Реально протестировано на железе

- ✅ Подключение к устройству, серийник реальный
- ✅ Создание сотрудника → авто-появляется в Hikvision Person Management
- ✅ Регистрация отпечатка через `/CaptureFingerPrint` (терминал показывает «Поднесите палец»)
- ✅ Регистрация карты через ручной ввод И через `/CaptureCardInfo`
- ✅ Live snapshot канал 101 работает
- ✅ Загрузка лица через `/FDLib/FDSetUp` (subprocess curl) с полем `FaceImage`
- ✅ Sync времени работает (XML PUT, простой формат без xmlns)
- ✅ События проходят, poller их ловит, табель рассчитывается

## Что осталось доделать (приоритет M+)

1. **Этап 6** — интеграции с 1С / биллингом
2. Production HTTPS (Let's Encrypt + Nginx)
3. Alembic миграции вместо `ALTER TABLE IF NOT EXISTS`
4. Bulk-импорт сотрудников из Excel

## Workflow деплоя

```bash
# На сервере acloud@192.168.0.162
cd ~/Web_interfaceTOUCHECREEN
git pull
docker compose -f deploy/docker-compose.yml up -d --build [backend|frontend]
# Иногда: docker compose ... build --no-cache <service>
```

## Workflow коммитов

Я всегда:
1. Делаю изменения
2. `git add -A && git commit -m "..." && git push -u origin claude/dreamy-gauss-5ZXt4`
3. `git checkout main && git merge --no-ff claude/dreamy-gauss-5ZXt4 -m "Merge: ..." && git push -u origin main`
4. `git checkout claude/dreamy-gauss-5ZXt4`

## Частые ошибки и решения

- **`methodnotallowed` на face upload** → метод PUT не POST, поле `FaceImage` не `img`, multipart через curl
- **`badXmlContent`** → endpoint хочет XML, не JSON
- **`badJsonContent`** → endpoint хочет JSON, не XML
- **`notSupport`** → endpoint на V4.48 не существует, попробуй другой
- **`cardNoAlreadyExist`** → карта занята, попробуй другой номер
- **Время неверное на терминале** → tz-формат `CST-5:00:00` = UTC+5 (знак инвертирован)
- **`numOfFace: 0` после успешной загрузки** → лицо не прошло face-detection на устройстве, нужен прямой ракурс

## Что я НЕ должен делать без необходимости

- Перечитывать ARCHITECTURE.md, docs/*.md, README.md если не просили — там просто описание для людей
- Открывать все *.py / *.tsx файлы по очереди — структура выше
- Запускать тесты / сборку без запроса
- Создавать новые файлы документации — обновляю существующие

## Когда нужны новые знания

Используй Grep по симптому ошибки + конкретный файл, например:
- Ошибка по face → `grep -n "upload_face\|FDSetUp" backend/app/services/hikvision/isapi.py`
- Ошибка по карте → `grep -n "add_card\|CardInfo" backend/app/services/hikvision/isapi.py`
- Endpoint не работает → `grep -rn "endpoint_name" backend/app/api/`

## Текущая версия (на момент записи)

Коммит main: `ee5defc` — comprehensive README. Полная история в `git log --oneline`.
