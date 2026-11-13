# SagipRekord

AI-powered disaster relief and barangay document digitizer built with Lumen AI.

## Workspace

The responsive workspace opens on a dashboard with live vault statistics, quick actions, and a collapsible navigation sidebar. The document wizard, records vault, and community help page remain available from the sidebar. Use the ENG / TAG switch to preview the English and Tagalog dashboard and community-help copy; add future translations to the `I18n.translations` dictionaries in `app.js`.

In Step 1 of the document wizard, upload a file or choose **Take a photo** to capture a document with the device camera and send it through the same OCR workflow. Camera access requires browser permission and a secure context (HTTPS or localhost).

The main screens use larger text, larger controls, shorter instructions, and optional collapsible details to make common tasks easier to find.

The interface uses the shared palette and component styles in `style.css`, with Tailwind utilities retained for the existing document workflow.