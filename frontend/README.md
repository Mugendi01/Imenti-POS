# Imenti POS — Frontend

React 18/19 + TypeScript (Vite), Redux Toolkit / RTK Query, Tailwind CSS v4, React Router, React Hook Form + Zod.

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_URL to your Laravel API
npm run dev
```

## Structure

```
src/
  api/            axios instance + RTK Query base (createApi + axios adapter)
  app/            store, typed hooks
  components/     shared UI + layout (Sidebar/Topbar/AppLayout)
  features/
    auth/         login page, auth slice (token kept in memory only)
    dashboard/    stats/alerts shell
    products/     CRUD list + form (categories included)
    pos/ inventory/ sales/ reports/ users/ settings/   stubs, filled in by phase
  types/          shared TS interfaces (mirrors backend API shapes)
```

## Notes

- Auth token lives in memory (`api/tokenStore.ts`), not `localStorage`, to reduce XSS exposure — this means a hard refresh currently logs the user out. A silent-refresh flow (httpOnly cookie) is planned once the backend adds it.
- All server state goes through RTK Query (`baseApi.ts`); local-only UI state (cart, theme) should use plain Redux slices or component state, not Context.
