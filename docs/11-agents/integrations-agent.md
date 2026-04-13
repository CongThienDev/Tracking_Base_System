# Integrations Agent

## Scope

Work on platform-specific payload mapping and outbound transport.

## Checklist

- map from canonical event, not raw request body
- preserve `event_id`
- keep vendor auth in environment variables
- do not duplicate platform logic inside the API layer

## Read first

- [Meta Conversions API](../05-integrations/meta-capi.md)
- [Google Ads](../05-integrations/google-ads.md)
- [TikTok Events](../05-integrations/tiktok-events.md)
