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
    dashboard/    real stats + low-stock alerts (reportsApi + inventoryApi)
    products/     CRUD list + form (categories, barcode lookup included)
    pos/          cart (cartSlice), checkout (cash + M-Pesa), Quagga2 barcode
                  scanner (lazy-loaded), receipt + PDF download (jsPDF, lazy-loaded)
    inventory/    stock table, adjust modal, per-product movement history
    sales/        history table with date/status filters
    reports/      Recharts (sales over time, top products) + CSV export
    users/ settings/   stubs — not built yet
  types/          shared TS interfaces (mirrors backend API shapes)
```

## Notes

- Auth token lives in memory (`api/tokenStore.ts`), not `localStorage`, to reduce XSS exposure — this means a hard refresh currently logs the user out. A silent-refresh flow (httpOnly cookie) is planned once the backend adds it.
- All server state goes through RTK Query (`baseApi.ts`); local-only UI state (cart, theme) should use plain Redux slices or component state, not Context.
- **M-Pesa checkout** posts to `/sales` and, if the sale comes back `pending` (real Safaricom, not the local mock), polls `GET /sales/{id}` every 2s until it flips to `completed`/`voided`. In this environment the backend's `MPESA_MOCK=true` means it always completes instantly, so the polling path is implemented but not exercised — see `backend/README.md`.
- **Barcode scanning** (`BarcodeScannerModal`) needs real camera access (`getUserMedia`) to do anything; it has a 6s timeout guard that falls back to an inline error message if the camera never resolves (sandboxed/headless browsers block camera access without ever rejecting the permission promise, which would otherwise hang the modal forever). Manual search by name/SKU/barcode always works as the fallback.
