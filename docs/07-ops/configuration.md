# Configuration

## Core environment variables

### Runtime

- `NODE_ENV`
- `PORT`
- `LOG_LEVEL`

### Database

- `DATABASE_URL`
- optional pooled and migration-specific variants

### Queue

- `QUEUE_URL` or Redis connection variables
- `QUEUE_CONCURRENCY`
- `QUEUE_MAX_RETRIES`

### Security

- `TRACKING_API_SECRET` or request signing secret
- `ALLOWED_ORIGINS` if browser-origin policy is enforced

### Meta

- `META_PIXEL_ID`
- `META_ACCESS_TOKEN`
- `META_TEST_EVENT_CODE`

### Google Ads

- `GOOGLE_ADS_CUSTOMER_ID`
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- auth secrets appropriate to integration choice

### TikTok

- `TIKTOK_PIXEL_CODE`
- `TIKTOK_ACCESS_TOKEN`

### Optional

- `UMAMI_ENDPOINT`
- `UMAMI_API_KEY`

## Rule

No secrets in client code or static docs examples beyond placeholder values.

## Related docs

- [Deployment](deployment.md)
- [Auth and signing](../08-security/auth-and-signing.md)
