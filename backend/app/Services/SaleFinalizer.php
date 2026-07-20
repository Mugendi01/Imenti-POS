<?php

namespace App\Services;

use App\Models\InventoryLog;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Applies the stock decrement + inventory log side effects of a completed sale.
 *
 * Shared by two callers: the cash checkout path (SaleController::store, which calls
 * this synchronously in the same request) and the M-Pesa path, where it only runs
 * once payment is confirmed — either by the real Safaricom callback
 * (MpesaCallbackController) or, in mock mode, immediately after the "STK push".
 *
 * Idempotent: a sale that isn't 'pending' anymore is left untouched, so a duplicate
 * callback delivery (Safaricom retries on timeout) can't double-decrement stock.
 */
class SaleFinalizer
{
    public function complete(Sale $sale): void
    {
        DB::transaction(function () use ($sale) {
            $sale = Sale::where('id', $sale->id)->lockForUpdate()->first();

            if ($sale->status !== 'pending') {
                return;
            }

            $items = $sale->items()->get();
            $products = Product::whereIn('id', $items->pluck('product_id'))->lockForUpdate()->get()->keyBy('id');

            foreach ($items as $item) {
                $product = $products[$item->product_id];
                $newQty = $product->qty_on_hand - $item->qty;

                if ($newQty < 0) {
                    // Stock sold out to another transaction while this M-Pesa payment
                    // was in flight. Rare edge case for async mobile-money checkout;
                    // we still honor the already-confirmed payment and log it rather
                    // than fail a payment the customer has already completed.
                    Log::warning('Sale finalized into negative stock', [
                        'sale_id' => $sale->id,
                        'product_id' => $product->id,
                        'resulting_qty' => $newQty,
                    ]);
                }

                $product->qty_on_hand = $newQty;
                $product->version += 1;
                $product->save();

                InventoryLog::create([
                    'product_id' => $product->id,
                    'change_qty' => -$item->qty,
                    'type' => 'sale',
                    'reference_id' => $sale->id,
                    'user_id' => $sale->user_id,
                    'created_at' => now(),
                ]);
            }

            $sale->update(['status' => 'completed']);
            $sale->payments()->update(['status' => 'completed']);
        });
    }

    public function fail(Sale $sale, ?string $reason = null): void
    {
        DB::transaction(function () use ($sale, $reason) {
            $sale = Sale::where('id', $sale->id)->lockForUpdate()->first();

            if ($sale->status !== 'pending') {
                return;
            }

            $sale->update(['status' => 'voided']);
            $sale->payments()->update(['status' => 'failed', 'failure_reason' => $reason]);
        });
    }
}
