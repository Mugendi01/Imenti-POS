# Imenti POS

Scalable Point-of-Sale + Inventory Management System.

- **Frontend:** React 18/19 + TypeScript (Vite), Redux Toolkit / RTK Query, Tailwind CSS
- **Backend:** Laravel 12 (PHP 8.2+), Sanctum auth, MySQL/PostgreSQL
- **Integrations:** Quagga2 (barcode scanning), M-Pesa/Safaricom Daraja (payments — mocked locally, see `backend/README.md`), Recharts (charts), jsPDF (PDF receipts), CSV export

## Structure

```
imenti-pos/
  backend/    Laravel API
  frontend/   React + TS SPA
```

## Phases

1. Core — auth, products ✅
2. POS — cart, transactions ✅
3. Inventory + reports ✅
4. Advanced — barcode scanning, M-Pesa payments, CSV/PDF export ✅
5. Testing + optimization — not started

## Getting started

See `backend/README.md` and `frontend/README.md` for setup instructions.
