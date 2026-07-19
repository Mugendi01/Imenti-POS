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

## Structure

```
app/
  Http/Controllers/Api/   AuthController, ProductController, CategoryController,
                          SaleController, InventoryController, ReportController
  Http/Requests/          form validation (Store/UpdateProductRequest, StoreSaleRequest,
                          StoreInventoryAdjustmentRequest, LoginRequest)
  Http/Resources/         JSON shaping (ProductResource, UserResource, SaleResource,
                          SaleItemResource, InventoryLogResource)
  Models/                 User, Role, Category, Product, InventoryLog, AuditLog, Sale, SaleItem, Payment
  Policies/                ProductPolicy, SalePolicy
  Observers/               AuditLogObserver
database/
  migrations/  seeders/  factories/
routes/api.php             all routes under /api/v1
```

## Next (Phase 4+)

Refunds, Stripe/PayPal real payment integration, PDF/CSV export, barcode lookup wiring for Quagga.js on the frontend.
