# Imenti POS — Backend

Laravel 12 API (upgraded from the originally-specified 11, which is past its security-support window). Auth via Sanctum personal-access tokens (Bearer, not cookie/session SPA auth).

**Verified working end-to-end**: composer install, migrate --seed, artisan serve, and a real login/CRUD round trip from the React frontend all confirmed locally (PHP 8.2.12 via XAMPP, MariaDB 10.4).

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
# create the imenti_pos database in MySQL/Postgres first, then:
php artisan migrate --seed
php artisan serve
```

Default seeded login: `admin@imenti-pos.test` / `password` (change immediately outside local dev).

## What's implemented

**Phase 1 — Core**
- **Auth:** `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout` — Sanctum tokens, rate-limited login (5/min/IP).
- **Products:** full CRUD (`/api/v1/products`), search/pagination, category filter, policy-gated (admin/manager can write, admin-only delete).
- **Categories:** read-only list (`/api/v1/categories`).
- **RBAC:** `roles` table (admin/manager/cashier) + policies; `role:` middleware alias available for route-level gating.
- **Audit log:** `AuditLogObserver` records create/update/delete on `Product`, `User`, and `Sale` to `audit_logs`.

**Phase 2 — POS / transactions**
- **Checkout:** `POST /api/v1/sales` — atomic (`DB::transaction` + `lockForUpdate` on the affected products) stock decrement, per-line + order-level discount, tax computed from each product's `tax_rate`, cash change calculation, rejects oversell with 409 and inactive/insufficient-tender with 422.
- **Sales history:** `GET /api/v1/sales` (date range + status filters, cashier-scoped for the `cashier` role, full visibility for `admin`/`manager`), `GET /api/v1/sales/{id}`.
- Every completed sale writes `sale_items`, a `payments` row, and an `inventory_logs` row per line (type `sale`) — `products.qty_on_hand` and `products.version` (optimistic-lock counter) update in the same transaction.

**Phase 3 — Inventory / reports**
- **Inventory:** `GET /api/v1/inventory` (low-stock filter), `GET /api/v1/inventory/logs` (full movement history per product), `POST /api/v1/inventory/adjust` (restock/adjust/return, admin/manager only, rejects negative resulting stock) — all inside `DB::transaction` + `lockForUpdate`.
- **Reports:** `GET /api/v1/reports/dashboard` (today's sales/transactions, low-stock count, active users — open to all authenticated roles), `GET /api/v1/reports/sales` (time series, `group_by=day|week|month`), `GET /api/v1/reports/top-products`, `GET /api/v1/reports/revenue` (today/week/month summary) — the latter three gated to `admin`/`manager` via the `role:` middleware.

**Phase 4 — Advanced**
- **Barcode lookup:** `GET /api/v1/products/barcode/{code}` — quick single-product resolution for scan-to-add in the POS.
- **CSV export:** `GET /api/v1/reports/export?report=sales|top-products` — streamed CSV, admin/manager only.
- **M-Pesa (Safaricom Daraja) checkout**, `payment_method: "mpesa"` on `POST /api/v1/sales`:
  - Cash stays synchronous (unchanged from Phase 2). M-Pesa is asynchronous: the sale is created as `status: pending` with stock **not yet decremented**, an STK push is sent, and only once payment is confirmed does `SaleFinalizer` (shared by both the mock path and the real callback) decrement stock, write `inventory_logs`, and flip the sale to `completed`. A failed/cancelled payment flips it to `voided` and never touches stock — a customer who cancels the STK prompt can't have accidentally reserved inventory.
  - `POST /api/v1/mpesa/callback` — the public webhook Safaricom calls (no `auth:sanctum`, since Safaricom's servers can't carry our bearer tokens).
  - **⚠️ No real Daraja credentials are configured in this environment.** `MPESA_MOCK=true` (the default — see `.env.example`) short-circuits `MpesaService::stkPush()` and finalizes the sale immediately, so the checkout flow can be demoed and tested end-to-end without a live Safaricom sandbox account or a public callback URL. The real STK-push/callback code path is fully implemented per the Daraja API contract and is what runs once you set `MPESA_MOCK=false` and fill in real `MPESA_CONSUMER_KEY`/`MPESA_CONSUMER_SECRET`/`MPESA_SHORTCODE`/`MPESA_PASSKEY`/`MPESA_CALLBACK_URL` (the callback URL must be a public HTTPS endpoint, e.g. via ngrok in local dev) — but that path has **not** been tested against Safaricom's actual servers.

## Structure

```
app/
  Http/Controllers/Api/   AuthController, ProductController, CategoryController,
                          SaleController, InventoryController, ReportController,
                          MpesaCallbackController
  Http/Requests/          form validation (Store/UpdateProductRequest, StoreSaleRequest,
                          StoreInventoryAdjustmentRequest, LoginRequest)
  Http/Resources/         JSON shaping (ProductResource, UserResource, SaleResource,
                          SaleItemResource, InventoryLogResource)
  Models/                 User, Role, Category, Product, InventoryLog, AuditLog, Sale, SaleItem, Payment
  Policies/                ProductPolicy, SalePolicy
  Observers/               AuditLogObserver
  Services/                MpesaService (Daraja OAuth + STK push), SaleFinalizer (shared
                           stock-decrement/completion logic for cash and M-Pesa)
database/
  migrations/  seeders/  factories/
routes/api.php             all routes under /api/v1
```

## Next (Phase 5)

Testing + optimization: automated test suite (Pest/PHPUnit), load-testing the checkout path, cache tuning. Real refunds are still unimplemented (sales can be voided via the M-Pesa failure path, but there's no admin-initiated refund flow yet).
