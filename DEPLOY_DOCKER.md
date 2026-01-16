# Deploy with Docker

## Prerequisites
- Docker 20+
- Docker Compose v2+
- Telegram bot token in `.env` as `BOT_TOKEN=...`

## Build and run

```bash
# 1) Build images
docker compose build

# 2) Start services
# Exposes Mini App on http://localhost:3000
# Bot runs in background and connects to Telegram with BOT_TOKEN
docker compose up -d

# 3) View logs
docker compose logs -f web
docker compose logs -f bot
```

## Environment
Create `.env` in project root:

```
BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
```

## Data persistence
The app uses a JSON file `data.json` at the project root. Compose binds it into both services:

```
volumes:
  - ./data.json:/app/data.json
```

Make sure `data.json` exists (can be an empty JSON `{}`):

```bash
echo '{}' > data.json
```

## Update & redeploy
```bash
docker compose pull
docker compose build --no-cache
docker compose up -d
```

## Notes
- The `web` service serves the Telegram Mini App (static UI + API) on port 3000.
- The `bot` service runs the Telegraf bot. Only `BOT_TOKEN` is required.
- If hosting behind a reverse proxy (nginx, Caddy), map external domain to `web:3000`.
- For HTTPS, terminate TLS at your proxy and forward to the service.
