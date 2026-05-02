# Pax App Bluetooth Server

Self-hosted version of the PAX web app (`web-app.pax.com/device`), a Web
Bluetooth client for controlling PAX vaporizers. PAX is shutting their hosted
version down in May 2026, so this is a local-only fallback assembled from a
HAR capture of the live site.

## Run

```sh
cd local-app && node server.js
```

Then open <http://localhost:8443/device> in Chrome (or another Chromium-based
browser with Web Bluetooth support).

Web Bluetooth works over `localhost` without HTTPS. To access this from
another device on your network you'll need to run it behind TLS — set
`USE_HTTPS=1`, `SSL_CERT`, and `SSL_KEY`.

## What's in here

- `local-app/static/` — the React bundle and assets, extracted as-is from the HAR.
  The bundle is patched in one place: the API base URL is rewritten from
  `https://consumer-service.cf-production.pax.com/api/v1` to `/api/v1`.
- `local-app/server.js` — small Node server: serves the static files and mocks
  the `/api/v1` endpoints the app calls.
- `local-app/overrides.css` / `overrides.js` — UI cleanup: hides the top nav
  and end-of-life banner, auto-declines the usage-data consent modal so the
  app actually mounts.

## Caveats

- Account/sync features are mocked with empty stubs — saved devices, firmware
  updates, account history, etc.
- Only tested with the PAX Era Pro. Other PAX devices are expected to work,
  but untested. If something needs fixing, open a PR.
- Frozen at the bundle version captured in April 2026.
