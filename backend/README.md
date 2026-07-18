# Imenti POS — Backend

Laravel 11 API. Auth via Sanctum personal-access tokens (Bearer, not cookie/session SPA auth).

**This was hand-written without a working PHP/Composer on the dev machine — it has not been run yet.** Once PHP 8.2+ and Composer are installed:

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

## What's implemented (Phase 1: Core)

- **Auth:** `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout` — Sanctum tokens, rate-limited login (5/min/IP).
- **Products:** full CRUD (`/api/v1/products`), search/pagination, category filter, policy-gated (admin/manager can write, admin-only delete).
- **Categories:** read-only list (`/api/v1/categories`).
- **RBAC:** `roles` table (admin/manager/cashier) + `ProductPolicy`; `role:` middleware alias available for route-level gating.
- **Audit log:** `AuditLogObserver` records create/update/delete on `Product` and `User` to `audit_logs`.
- **Schema laid down for later phases:** `inventory_logs`, `audit_logs` tables exist now; `sales`/`sale_items`/`payments`/`refunds` migrations land in Phase 2.

## Structure

```
app/
  Http/Controllers/Api/   AuthController, ProductController, CategoryController
  Http/Requests/          form validation (StoreProductRequest, UpdateProductRequest, LoginRequest)
  Http/Resources/         JSON shaping (ProductResource, UserResource)
  Models/                 User, Role, Category, Product, InventoryLog, AuditLog
  Policies/                ProductPolicy
  Observers/               AuditLogObserver
database/
  migrations/  seeders/  factories/
routes/api.php             all routes under /api/v1
```

## Next (Phase 2+)

Transactions/checkout (atomic stock decrement + `sales`/`sale_items`), Stripe/PayPal payment intents, inventory adjustment endpoints + low-stock alerts, reports (sales/revenue/top-products + export), barcode lookup wiring for Quagga.js on the frontend.
