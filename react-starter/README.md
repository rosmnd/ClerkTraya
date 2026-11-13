# SagipRekord React starter

Responsive React + TypeScript + Vite starter using Tailwind CSS and the SagipRekord palette.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build`.

## Structure

- `src/components/layout` contains the responsive header, animated burger, sidebar, and layout wrapper.
- `src/components/ui` contains shared button, card, and language-switcher primitives.
- `src/components/sections` contains the dashboard hero, stats, features, and CTA.
- `src/contexts/LanguageContext.tsx` provides typed English/Tagalog translations.
- `src/locales` holds the translation dictionaries.
- `src/styles/globals.css` defines the palette variables, responsive layout, and Tailwind layers.
- `tailwind.config.ts` maps the full design palette into `palette.*` color utilities.

The sidebar starts expanded on desktop and automatically collapses below the `desktop` (`1024px`) breakpoint. At phone sizes, the burger opens it as an overlay drawer.
