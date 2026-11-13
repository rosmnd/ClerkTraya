# SagipRekord

AI-powered disaster relief and barangay document digitizer built with Lumen AI.

## Run locally

The app needs PHP 8+ with PDO MySQL, JSON, and fileinfo extensions. The cURL extension is needed for live Lumen requests. XAMPP includes MariaDB and the PHP MySQL driver.

## Database setup

1. Copy `.env.example` to `.env` in this folder and set the database connection values. Do not commit `.env`.
2. Create the tables by importing `schema.sql` in phpMyAdmin or with the MySQL command-line client. The default database name is `sagiprekord`.
3. If you have data in `users.json`, `records.json`, or `audit.jsonl`, run `php migrate_json_to_mysql.php` once from this folder. The JSON files are left in place as backups.
4. Start the PHP server as shown below.

The database stores accounts, saved records, checklists, and audit events. Uploaded source files are sent to OCR but are not retained; the saved record contains the extracted and verified text. For a public deployment, use a dedicated database account with access only to this database instead of the local XAMPP root account.

```sh
cd sagip-rekord
php -S 127.0.0.1:8000 router.php
```

Open `http://127.0.0.1:8000/`; unauthenticated visits are redirected to `login.html`.

The frontend API endpoint is configured by the `api-base` meta tag in `index.php`:

```html
<meta name="api-base" content="./api.php" />
```

Change its value when the API is deployed at another path. All frontend requests use this setting.

## Lumen and demo mode

Uploaded documents are sent to live Lumen OCR only when `LUMEN_OCR_URL`, `LUMEN_API_KEY`, and `LUMEN_API_SECRET` are configured and demo mode is off. If OCR is unavailable, the upload returns a clear error; it never substitutes sample text. Use the sample-document controls in the wizard for offline demonstrations.

Without Lumen chat configuration, the assistant uses clearly identified demo guidance. To force demo behavior, set `SAGIPREKORD_DEMO_MODE=true` in the PHP process environment or `.env`. Set it to `false` (or remove it) to allow live requests when credentials and the corresponding endpoint are configured.

Configure live server-only values in `.env` using `LUMEN_API_KEY`, `LUMEN_API_SECRET`, `LUMEN_OCR_URL`, and `LUMEN_CHAT_URL`. Use the OCR endpoint supplied by Lumen; do not guess the URL. Never put credentials in `.env.example` or frontend code, and do not expose `.env` through the web server.

## Workspace and language

The responsive workspace opens on a dashboard with live vault statistics, quick actions, and a collapsible navigation sidebar. The document wizard, records vault, and community hub remain available from the sidebar. Use the ENG / TAG switch to preview the English and Tagalog dashboard copy; add future translations to the `I18n.translations` dictionaries in `app.js`.

The interface uses the shared palette and component styles in `style.css`, with Tailwind utilities retained for the existing document workflow.