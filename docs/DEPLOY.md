# Развёртывание в production

## 1. Системные требования

- Linux-сервер (Debian 12 / Ubuntu 22.04+)
- Docker 24+ и Docker Compose v2
- 2 CPU, 4 GB RAM, 20 GB диска — минимум для ~500 сотрудников и 10 устройств
- Открытые порты:
  - **80** и **443** наружу (фронтенд + API)
  - Доступ к подсетям устройств Hikvision из backend-контейнера

## 2. Установка Docker

```bash
apt update && apt install -y git ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
```

## 3. Клонирование и настройка

```bash
git clone https://github.com/nnfirdavs96-cell/Web_interfaceTOUCHECREEN.git
cd Web_interfaceTOUCHECREEN
cp backend/.env.example backend/.env

# КРИТИЧНО: сгенерировать собственный SECRET_KEY (32+ байта)
SECRET=$(openssl rand -hex 32)
sed -i "s|^SECRET_KEY=.*|SECRET_KEY=$SECRET|" backend/.env
```

Откройте `backend/.env` и проверьте параметры:

```env
ENV=production
DEBUG=false
DATABASE_URL=postgresql+psycopg://hikv:<СИЛЬНЫЙ_ПАРОЛЬ>@postgres:5432/hikv
HIKVISION_MODE=isapi             # или mock для тестов
DEMO_SEED=false                  # отключить демо в проде
CORS_ORIGINS=https://your-domain.example
SEED_ADMIN_EMAIL=admin@your.org
SEED_ADMIN_PASSWORD=<СИЛЬНЫЙ_ПАРОЛЬ_АДМИНА>
```

Не забудьте также сменить пароль postgres в `deploy/docker-compose.yml`.

## 4. Запуск

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

Проверка:

```bash
docker compose -f deploy/docker-compose.yml ps
curl http://localhost:8090/api/health
```

## 5. HTTPS

Платформа отдаётся nginx на порту 8090 (HTTP). Для HTTPS подключите системный reverse-proxy (Caddy / nginx / Traefik).

### Пример: системный nginx + Let's Encrypt

```nginx
server {
    listen 443 ssl http2;
    server_name access.your-domain.example;

    ssl_certificate     /etc/letsencrypt/live/access.your-domain.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/access.your-domain.example/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For  $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
    }
}

server {
    listen 80;
    server_name access.your-domain.example;
    return 301 https://$host$request_uri;
}
```

Обновите `CORS_ORIGINS=https://access.your-domain.example` в `backend/.env`.

## 6. Бэкапы PostgreSQL

```bash
# Создание бэкапа
docker compose -f deploy/docker-compose.yml exec -T postgres \
    pg_dump -U hikv -d hikv | gzip > backup_$(date +%F).sql.gz

# Восстановление
gunzip -c backup_2026-06-05.sql.gz | docker compose -f deploy/docker-compose.yml exec -T postgres psql -U hikv -d hikv
```

Поставьте cron для ежедневных бэкапов:

```cron
0 3 * * * cd /opt/hikv && docker compose -f deploy/docker-compose.yml exec -T postgres pg_dump -U hikv -d hikv | gzip > /var/backups/hikv_$(date +\%F).sql.gz
```

## 7. Обновление

```bash
cd Web_interfaceTOUCHECREEN
git pull
docker compose -f deploy/docker-compose.yml up -d --build
```

При изменении зависимостей backend/frontend пересоберите без кэша:

```bash
docker compose -f deploy/docker-compose.yml build --no-cache backend frontend
docker compose -f deploy/docker-compose.yml up -d
```

## 8. Мониторинг и логи

```bash
# Логи backend / frontend
docker compose -f deploy/docker-compose.yml logs -f backend
docker compose -f deploy/docker-compose.yml logs -f frontend

# Размер БД
docker compose -f deploy/docker-compose.yml exec postgres \
    psql -U hikv -d hikv -c "SELECT pg_size_pretty(pg_database_size('hikv'));"

# Количество событий за последние сутки
docker compose -f deploy/docker-compose.yml exec postgres \
    psql -U hikv -d hikv -c "SELECT count(*) FROM attendance_events WHERE event_time > now() - interval '1 day';"
```

## 9. Безопасность

- **Никогда** не оставляйте `SECRET_KEY` из `.env.example` в production.
- Смените `SEED_ADMIN_PASSWORD` на длинный пароль; сразу после первого входа создайте отдельных пользователей через UI и **отключите** супер-админа.
- Регулярно обновляйте Docker-образы (`postgres`, `redis`, базовый `python`/`node`).
- Закройте порт `8090` снаружи — оставьте доступ только через HTTPS-фронт.
- Включите fail2ban для SSH.

## 10. Откат

```bash
# Сохраните текущий бэкап
docker compose -f deploy/docker-compose.yml exec -T postgres pg_dump -U hikv -d hikv | gzip > before_rollback.sql.gz

# Вернитесь к предыдущему тегу
git checkout <previous-tag>
docker compose -f deploy/docker-compose.yml up -d --build
```
