<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\MpesaCallbackController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SaleController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

    // Public webhook — Safaricom's servers call this, not our SPA, so it can't
    // carry a Sanctum bearer token. Unreachable in practice until a real Daraja
    // app + public callback URL is configured (MPESA_MOCK=false).
    Route::post('/mpesa/callback', [MpesaCallbackController::class, 'handle'])->middleware('throttle:api');

    Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::get('/categories', [CategoryController::class, 'index']);

        // Must be registered before the products apiResource, otherwise
        // GET /products/{product} would swallow /products/barcode/{code}.
        Route::get('/products/barcode/{barcode}', [ProductController::class, 'showByBarcode']);
        Route::apiResource('products', ProductController::class);
        Route::apiResource('sales', SaleController::class)->only(['index', 'store', 'show']);

        Route::get('/inventory', [InventoryController::class, 'index']);
        Route::get('/inventory/logs', [InventoryController::class, 'logs']);
        Route::get('/reports/dashboard', [ReportController::class, 'dashboard']);

        Route::middleware('role:admin,manager')->group(function () {
            Route::post('/inventory/adjust', [InventoryController::class, 'adjust']);
            Route::get('/reports/sales', [ReportController::class, 'sales']);
            Route::get('/reports/top-products', [ReportController::class, 'topProducts']);
            Route::get('/reports/revenue', [ReportController::class, 'revenue']);
            Route::get('/reports/export', [ReportController::class, 'export']);
        });
    });
});
