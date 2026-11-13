# SagipRekord

AI-powered disaster relief and barangay document digitizer built with Lumen AI.

## Run locally

The vanilla app needs PHP 8+ with the JSON, fileinfo, and (for live Lumen requests) cURL extensions.

```sh
cd sagip-rekord
php -S 127.0.0.1:8000
```

Open `http://127.0.0.1:8000/`. The web server must be able to write to `records.json` and create `records.json.lock`.

The frontend API endpoint is configured by the `api-base` meta tag in `index.html`:

```html
<meta name="api-base" content="./api.php" />
```

Change its value when the API is deployed at another path. All frontend requests use this setting.

## Lumen and demo mode

Without Lumen credentials and endpoint URLs, OCR and chat return clearly identified demo responses. To force demo behavior even when live Lumen credentials are configured, set `SAGIPREKORD_DEMO_MODE=true` in the PHP process environment or `.env`. Set it to `false` (or remove it) to allow live requests when both credentials and the corresponding OCR/chat endpoint are configured.

Configure live server-only values in `.env` using `LUMEN_API_KEY`, `LUMEN_API_SECRET`, `LUMEN_OCR_URL`, and `LUMEN_CHAT_URL`. Never put credentials in frontend code or expose the `.env` file through the web server.

## Workspace and language

The responsive workspace opens on a dashboard with live vault statistics, quick actions, and a collapsible navigation sidebar. The document wizard, records vault, and community hub remain available from the sidebar. Use the ENG / TAG switch to preview the English and Tagalog UI; add future translations to `I18n.translations` in `app.js`.

The sidebar collapse choice and language are stored in browser local storage. Below 1025px the sidebar becomes a responsive overlay drawer; on desktop it can be collapsed to an icon rail.

The interface uses the exact palette and component styles in `style.css`, with Tailwind utilities retained for the existing document workflow.

## Extension boundaries

- `app.js` owns shared state and the Navigation, I18n, Wizard, OCR/verification, AI/checklist, and Vault modules. `app-init.js` is the single place that connects DOM events to those modules.
- `SessionModule.getContext()` exposes a local UI context for future session integration only. `authenticated` is currently `false`; the sample role is not authentication or authorization and must not be used to protect records. Enforce future roles on the server/API.
- Camera capture can later provide an image to the existing document upload/OCR flow. Offline persistence should be added behind the API/storage boundary rather than treating browser local storage as the record vault.
- `.htaccess` denies direct access to configuration and record-store files when served by Apache. PHP's built-in development server does not process `.htaccess`; use Apache (or equivalent production server rules) for those protections.

## Manual feature checks

1. **Navigation and responsive sidebar:** open each sidebar module and confirm its active state. At desktop width, collapse and expand the sidebar, reload, and confirm the preference persists. At tablet/mobile widths, open the drawer, close it with Escape and the backdrop, and confirm the page has no horizontal overflow.
2. **Language:** switch ENG/TAG while viewing the dashboard, wizard, vault, and community hub. Reload and confirm the selection persists.
3. **Wizard guards:** with no loaded document, try Step 2 and Step 3; both must remain blocked. Load a demo paper, review/edit its extracted text and metadata, and confirm Step 2 before requesting the AI guidance.
4. **OCR:** upload a JPEG, PNG, WebP, or PDF under 10 MB. In demo mode, verify the sample OCR result is marked as a demo response. Invalid file types and oversized files should show an error without advancing the wizard.
5. **AI guidance:** request advice after verifying the document. Confirm the response is editable and creates checklist items; add, check, and remove a custom item.
6. **Vault CRUD:** save a verified record, confirm the dashboard stats and vault badge update, open it with Inspect / Edit, save changes, then delete it and confirm the count returns to its prior value.
7. **Vault utilities:** search and filter records, export a CSV, and open/close and print the action slip.