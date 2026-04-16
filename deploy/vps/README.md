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
