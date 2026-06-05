# Интеграция с устройствами Hikvision

Платформа работает в двух режимах:

| Режим (`HIKVISION_MODE`) | Что использует | Когда |
|---|---|---|
| `mock` (по умолчанию) | `MockClient` — генерирует случайные события | Разработка, демо без устройств |
| `isapi` | `IsapiClient` — реальный HTTP Digest клиент | Production с физическими устройствами |

Переключение режима — в `backend/.env`:

```env
HIKVISION_MODE=isapi
```

После изменения нужно перезапустить backend:

```bash
docker compose -f deploy/docker-compose.yml restart backend
```

---

## Подключение реального устройства

1. **Создайте устройство в UI** (раздел «Устройства» → «Добавить»):
   - Название: например, «Главный вход»
   - IP-адрес и порт ISAPI (по умолчанию 80)
   - Логин и пароль — учётная запись с правами на чтение событий и управление пользователями
   - Назначение и привязка к филиалу

2. **Проверьте подключение**: кнопка «Проверить» в карточке устройства должна вернуть `online: true`, серийный номер и версию прошивки.

3. **События начнут приходить автоматически** — фоновый poller опрашивает все устройства каждые 30 секунд.

---

## Что нужно дописать в `IsapiClient`

Файл: `backend/app/services/hikvision/isapi.py`. Класс уже подключается к устройству через HTTP Digest и реализован метод `test_connection()` (читает `/ISAPI/System/deviceInfo?format=json`). Дальше нужно дополнить:

### `fetch_events(since, until)` — получение событий прохода

Используйте endpoint `/ISAPI/AccessControl/AcsEvent?format=json` (POST). Запрос:

```json
{
  "AcsEventCond": {
    "searchID": "<uuid>",
    "searchResultPosition": 0,
    "maxResults": 30,
    "major": 5,
    "minor": 75,
    "startTime": "2026-06-05T00:00:00+00:00",
    "endTime":   "2026-06-05T23:59:59+00:00"
  }
}
```

Из ответа извлеките массив `AcsEvent.InfoList`, для каждого события:

```python
RawEvent(
    external_user_id=item["employeeNoString"],
    event_time=datetime.fromisoformat(item["time"]),
    event_type="entry" if item["majorEventType"] == 5 else "exit",
    success=item["eventResultType"] == 1,
    payload=item,
)
```

Метод должен быть пагинированным — пройти страницы `searchResultPosition += maxResults`, пока в ответе не будет `responseStatusStrg = "NO MATCH"`.

### `upsert_user(external_id, full_name)` — синхронизация сотрудника

Endpoint `/ISAPI/AccessControl/UserInfo/SetUp?format=json` (PUT) с телом:

```json
{
  "UserInfo": [{
    "employeeNo": "0001",
    "name": "Иванов Алексей",
    "userType": "normal",
    "Valid": { "enable": true, "beginTime": "...", "endTime": "..." },
    "doorRight": "1"
  }]
}
```

### `delete_user(external_id)` — удаление с устройства

Endpoint `/ISAPI/AccessControl/UserInfo/Delete?format=json` (PUT):

```json
{ "UserInfoDelCond": { "EmployeeNoList": [{ "employeeNo": "0001" }] } }
```

---

## Типичные коды ошибок ISAPI

| HTTP | Сценарий |
|---|---|
| 401 | Неверный логин/пароль |
| 403 | Учётная запись без прав на access-control |
| 404 | Неверный путь ISAPI — проверьте версию прошивки |
| 500 + `subStatusCode: deviceError` | Устройство занято — повторить через 1–2 сек |

---

## Ручные операции

В UI доступны:

- **Проверить** — `POST /api/v1/devices/{id}/test-connection`.
- **Синк** — `POST /api/v1/devices/{id}/sync` (ставит задачу в очередь, в режиме mock — заглушка).
- **Опросить устройства** в разделе «Приход/уход» — `POST /api/v1/attendance/fetch-events` (немедленный опрос всех устройств).

---

## Сетевые требования

- Backend-контейнер должен иметь сетевой доступ к подсетям, где находятся устройства.
- Если устройства в отдельной VLAN, добавьте маршрут или дополнительный сетевой интерфейс контейнеру.
- Порт ISAPI (обычно 80) должен быть открыт.
- Для устройств с HTTPS: измените `IsapiClient.__init__` — `self.base = f"https://{conn.ip}:{conn.port}"` и в `httpx.AsyncClient` передайте `verify=False` (или укажите CA).
