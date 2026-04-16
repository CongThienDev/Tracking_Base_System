# VPS Deploy (Upload-Only)

Use this guide when you do **not** clone the full repository on VPS.

## Files to upload to VPS

Create folder `/opt/tracking-base` on VPS and upload:

1. `deploy/infra/docker-compose.yml` -> `/opt/tracking-base/infra.compose.yml`
2. `deploy/infra/.env.example` -> `/opt/tracking-base/.env.infra.example`
3. `deploy/app/docker-compose.yml` -> `/opt/tracking-base/app.compose.yml`
4. `deploy/app/.env.example` -> `/opt/tracking-base/.env.app.example`
5. `deploy/vps/nginx.tracking-base.conf.example` -> `/opt/tracking-base/nginx.tracking-base.conf.example`

## Prepare env files

```bash
cd /opt/tracking-base
cp .env.infra.example .env.infra
cp .env.app.example .env.app
```

Edit `.env.app` with production values:

- `TRACKING_CONSOLE_IMAGE=ghcr.io/congthiendev/tracking_base_system/tracking-console:latest`
- `TRACKING_API_IMAGE=ghcr.io/congthiendev/tracking_base_system/tracking-api:latest`
- `ROUTER_WORKER_IMAGE=ghcr.io/congthiendev/tracking_base_system/router-worker:latest`
- `TRACKING_CONSOLE_PORT=18081`
- `TRACKING_API_PORT=13001`
- `DATABASE_URL=...`
- `REDIS_URL=redis://redis:6379/0`
- `ADMIN_API_TOKEN=...`
- `TRACKING_API_SECRET=...`

Recommended production values:

- `NODE_ENV=production`
- `TRACKING_API_AUTH_MODE=shared-secret`
- `REDIS_URL=redis://tracking-redis:6379/0` (container-to-container, do not use `localhost`)
- `TRACKING_CORS_ALLOW_ORIGINS=https://staging.prankbook.com,https://prankbook.com,https://walk.cwish.me`

## Run containers

```bash
docker login ghcr.io

docker compose -f infra.compose.yml --env-file .env.infra up -d
docker compose -f app.compose.yml --env-file .env.app pull
docker compose -f app.compose.yml --env-file .env.app up -d --no-build
```

## Verify

```bash
docker compose -f app.compose.yml --env-file .env.app ps
curl -I http://127.0.0.1:18081
curl -fsS http://127.0.0.1:13001/health
curl -fsS http://127.0.0.1:13001/ready
```

## Port map (current standard)

- `tracking-console` container: `80` -> host `${TRACKING_CONSOLE_PORT}` (default `18081`)
- `tracking-api` container: `3000` -> host `${TRACKING_API_PORT}` (default `13001`)
- `redis` container: `6379` -> host `${REDIS_PORT}` (default `6379`)

## Single-domain setup (Nginx Proxy Manager)

When using one public domain (example: `walk.cwish.me`) for both console and API:

1. Proxy Host Details:
   - Domain: `walk.cwish.me`
   - Forward Hostname/IP: `77.42.71.202`
   - Forward Port: `18081`
2. SSL tab:
   - Enable certificate for `walk.cwish.me`
   - Force SSL enabled
3. Custom Nginx config (gear icon):
   - copy from `deploy/vps/npm-one-domain-walk-cwish-me.md`

Why this is needed:

- `/api/*` admin routes need `ADMIN_API_TOKEN` header. Nginx normally rejects underscore headers unless configured.
- `/track` needs preflight `OPTIONS` and must route to API (`13001`) instead of console (`18081`).

Quick validation:

```bash
curl -i https://walk.cwish.me/health
curl -i https://walk.cwish.me/ready
curl -i "https://walk.cwish.me/api/admin/events?limit=1&offset=0" -H "ADMIN_API_TOKEN: <ADMIN_API_TOKEN>"
```

## Host Nginx

1. Copy `nginx.tracking-base.conf.example` to `/etc/nginx/sites-available/tracking-base.conf`
2. Replace `console.example.com` and `track.example.com`
3. Enable site and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/tracking-base.conf /etc/nginx/sites-enabled/tracking-base.conf
sudo nginx -t
sudo systemctl reload nginx
```

4. Issue SSL cert:

```bash
sudo certbot --nginx -d console.example.com -d track.example.com
```
