# Nginx Proxy Manager: One-Domain Config (`walk.cwish.me`)

Use this in Proxy Host -> Edit -> gear icon -> `Custom Nginx Configuration`.

Important:

- Replace `77.42.71.202` if VPS IP changes.
- Replace `<TRACKING_API_SECRET>` with your real value.
- Do not commit real secrets.

```nginx
underscores_in_headers on;
ignore_invalid_headers off;

location /api/ {
  proxy_pass http://77.42.71.202:13001/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header ADMIN_API_TOKEN $http_admin_api_token;
}

location = /api/track {
  proxy_pass http://77.42.71.202:13001/track;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Tracking-Secret <TRACKING_API_SECRET>;
}

location = /track {
  proxy_pass http://77.42.71.202:13001/track;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Why these blocks exist

- `underscores_in_headers on;` and `ignore_invalid_headers off;` allow forwarding `ADMIN_API_TOKEN`.
- `/api/` forwards dashboard admin API calls to tracking-api.
- `/api/track` forwards frontend `/api/track` calls and injects `x-tracking-secret`.
- `/track` forwards direct SDK/browser calls and preserves CORS preflight behavior.

## Validation commands

```bash
curl -i -X OPTIONS https://walk.cwish.me/track \
  -H 'Origin: https://staging.prankbook.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type,x-tracking-secret'

curl -i "https://walk.cwish.me/api/admin/events?limit=1&offset=0" \
  -H "ADMIN_API_TOKEN: <ADMIN_API_TOKEN>"
```
