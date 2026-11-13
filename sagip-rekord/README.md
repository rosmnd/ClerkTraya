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

The responsive workspace opens on a dashboard with live vault statistics, quick actions, and a collapsible navigation sidebar. The document wizard, records vault, and community hub remain available from the sidebar. Use the ENG / TAG switch to preview the English and Tagalog UI; add future translations to `I18n.translations` in `app.js`.

The sidebar collapse choice and language are stored in browser local storage. Below 1025px the sidebar becomes a responsive overlay drawer; on desktop it can be collapsed to an icon rail.

The interface uses the exact palette and component styles in `style.css`, with Tailwind utilities retained for the existing document workflow.

## Sign-in screens (demo only)

Open `login.html` or `signup.html` to use the responsive authentication screens. The PHP backend creates a server-side session and seeds three demo accounts in `users.json` on first run:

| Role | Email | Password |
|---|---|---|
| Resident | `resident@example.org` | `ResidentDemo123!` |
| Barangay / Health Worker | `worker@example.org` | `WorkerDemo123!` |
| Administrator | `admin@example.org` | `AdminDemo123!` |

Public registration always creates a Resident account. Only an Administrator can provision worker or administrator accounts. “Remember me” saves only the entered email locally, never the password. Demo credentials and local JSON stores are for development only; replace the demo account store, session configuration, transport security, and account lifecycle with a production identity provider before handling real resident data.

## Role access

- **Resident:** personal dashboard, document wizard and AI guidance, and records owned by that account. The API filters records by the server session owner ID; the client cannot set a different owner.
- **Barangay / Health Worker:** community dashboard, document verification, Evacuee Ledger, and community hub. Worker records can optionally be linked to an active Resident account by its email.
- **Administrator:** all modules, account creation/editing/deactivation, audit activity, and safe read-only service/storage status.

The PHP API enforces session and role checks even if a user bypasses the hidden navigation. Accounts, record ownership, and admin actions are stored server-side; direct access to those stores is denied by `.htaccess` on Apache.

## Extension boundaries

- `app.js` owns shared state and the Navigation, I18n, Wizard, OCR/verification, AI/checklist, and Vault modules. `app-init.js` is the single place that connects DOM events to those modules.
- Authentication runs through `auth.php`, and protected API actions enforce the server-side session and role. Replace the demo account store and mock credentials with a production identity provider before handling real resident data.
- Camera capture can later provide an image to the existing document upload/OCR flow. Offline persistence should be added behind the API/storage boundary rather than treating browser local storage as the record vault.
- `.htaccess` denies direct access to configuration and record-store files when served by Apache. The included `router.php` applies equivalent direct-file denials when using PHP's built-in server; run that server with the router as shown above.

## Manual feature checks

1. **Navigation and responsive sidebar:** open each sidebar module and confirm its active state. At desktop width, collapse and expand the sidebar, reload, and confirm the preference persists. At tablet/mobile widths, open the drawer, close it with Escape and the backdrop, and confirm the page has no horizontal overflow.
2. **Language:** switch ENG/TAG while viewing the dashboard, wizard, vault, and community hub. Reload and confirm the selection persists.
3. **Wizard guards:** with no loaded document, try Step 2 and Step 3; both must remain blocked. Load a demo paper, review/edit its extracted text and metadata, and confirm Step 2 before requesting the AI guidance.
4. **OCR:** upload a JPEG, PNG, WebP, or PDF under 10 MB. In demo mode, verify the sample OCR result is marked as a demo response. Invalid file types and oversized files should show an error without advancing the wizard.
5. **AI guidance:** request advice after verifying the document. Confirm the response is editable and creates checklist items; add, check, and remove a custom item.
6. **Vault CRUD:** save a verified record, confirm the dashboard stats and vault badge update, open it with Inspect / Edit, save changes, then delete it and confirm the count returns to its prior value.
7. **Vault utilities:** search and filter records, export a CSV, and open/close and print the action slip.
8. **Authentication and role navigation:** sign in with each demo account and confirm it opens the Resident, Worker, or Admin experience. Confirm each sidebar only shows that role's modules, public registration creates a Resident, and logout returns to the sign-in page. While signed in as a Worker or Resident, try opening an Admin-only module and confirm access is denied.
9. **Server-side authorization:** while signed in as Worker or Resident, request the Admin user and audit APIs and confirm they return `403`. As Admin, create, edit, and deactivate a temporary account; confirm the deactivated account cannot sign in and that the Admin account cannot demote or deactivate itself. As Resident, confirm the vault only contains that resident's records and cannot update or delete another resident's record. With the built-in server router, direct requests to `users.json`, `records.json`, and `audit.jsonl` must return `404`.