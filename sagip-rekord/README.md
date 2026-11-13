# SagipRekord

AI-powered disaster relief and barangay document digitizer built with Lumen AI.

## Run locally

The vanilla app needs PHP 8+ with the JSON, fileinfo, and (for live Lumen requests) cURL extensions.

```sh
cd sagip-rekord
php -S 127.0.0.1:8000 router.php
```

Open `http://127.0.0.1:8000/`; unauthenticated visits are redirected to `login.html`. The web server must be able to write to `records.json`, `users.json`, and their lock files, plus `audit.jsonl`.

The frontend API endpoint is configured by the `api-base` meta tag in `index.php`:

```html
<meta name="api-base" content="./api.php" />
```

Change its value when the API is deployed at another path. All frontend requests use this setting.

## Lumen and demo mode

Without Lumen credentials and endpoint URLs, OCR and chat return clearly identified demo responses. To force demo behavior even when live Lumen credentials are configured, set `SAGIPREKORD_DEMO_MODE=true` in the PHP process environment or `.env`. Set it to `false` (or remove it) to allow live requests when both credentials and the corresponding OCR/chat endpoint are configured.

Configure live server-only values in `.env` using `LUMEN_API_KEY`, `LUMEN_API_SECRET`, `LUMEN_OCR_URL`, and `LUMEN_CHAT_URL`. Never put credentials in frontend code or expose the `.env` file through the web server.

## Workspace and language

The responsive workspace opens on a dashboard with live vault statistics, quick actions, and a collapsible navigation sidebar. The document wizard, records vault, and community hub remain available from the sidebar. Use the ENG / TAG switch to preview the English and Tagalog dashboard copy; add future translations to the `I18n.translations` dictionaries in `app.js`.

The interface uses the shared palette and component styles in `style.css`, with Tailwind utilities retained for the existing document workflow.