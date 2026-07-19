<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSaleRequest;
use App\Http\Resources\SaleResource;
use App\Models\InventoryLog;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Sale::class);

        $sales = Sale::query()
            ->with('user')
            ->when($request->user()->role?->name === 'cashier', fn ($q) => $q->where('user_id', $request->user()->id))
            ->when($request->date('from'), fn ($q, $from) => $q->whereDate('created_at', '>=', $from))
            ->when($request->date('to'), fn ($q, $to) => $q->whereDate('created_at', '<=', $to))
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 20), 100));

        return SaleResource::collection($sales);
    }

    public function show(Sale $sale)
    {
        $this->authorize('view', $sale);

        return new SaleResource($sale->load(['items.product', 'user', 'payments']));
    }

    public function store(StoreSaleRequest $request)
    {
        $data = $request->validated();

        $sale = DB::transaction(function () use ($data, $request) {
            $productIds = collect($data['items'])->pluck('product_id');
            $products = Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id');

            $subtotal = 0;
            $tax = 0;
            $lines = [];

            foreach ($data['items'] as $line) {
                $product = $products[$line['product_id']];

                if (! $product->active) {
                    throw new HttpException(422, "{$product->name} is not available for sale.");
                }

                if ($product->qty_on_hand < $line['qty']) {
                    throw new HttpException(409, "Insufficient stock for {$product->name}. Available: {$product->qty_on_hand}.");
                }

                $lineDiscount = $line['discount'] ?? 0;
                $lineSubtotal = round($product->price * $line['qty'] - $lineDiscount, 2);
                $lineTax = round($lineSubtotal * $product->tax_rate / 100, 2);

                $subtotal += $lineSubtotal;
                $tax += $lineTax;

                $lines[] = [
                    'product' => $product,
                    'qty' => $line['qty'],
                    'unit_price' => $product->price,
                    'discount' => $lineDiscount,
                    'subtotal' => $lineSubtotal,
                ];
            }

            $discount = $data['discount'] ?? 0;
            $total = round($subtotal - $discount + $tax, 2);

            if ($data['payment_method'] === 'cash' && ($data['amount_tendered'] ?? 0) < $total) {
                throw new HttpException(422, 'Amount tendered is less than the total due.');
            }

            $sale = Sale::create([
                'invoice_no' => 'PENDING',
                'user_id' => $request->user()->id,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'tax' => $tax,
                'total' => $total,
                'payment_method' => $data['payment_method'],
                'status' => 'completed',
            ]);

            $sale->update(['invoice_no' => 'INV-'.str_pad((string) $sale->id, 6, '0', STR_PAD_LEFT)]);

            foreach ($lines as $line) {
                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $line['product']->id,
                    'qty' => $line['qty'],
                    'unit_price' => $line['unit_price'],
                    'discount' => $line['discount'],
                    'subtotal' => $line['subtotal'],
                ]);

                $line['product']->decrement('qty_on_hand', $line['qty']);
                $line['product']->increment('version');

                InventoryLog::create([
                    'product_id' => $line['product']->id,
                    'change_qty' => -$line['qty'],
                    'type' => 'sale',
                    'reference_id' => $sale->id,
                    'user_id' => $request->user()->id,
                    'created_at' => now(),
                ]);
            }

            Payment::create([
                'sale_id' => $sale->id,
                'provider' => $data['payment_method'],
                'amount' => $total,
                'status' => 'completed',
            ]);

            return $sale;
        });

        $change = $data['payment_method'] === 'cash'
            ? round(($data['amount_tendered'] ?? 0) - $sale->total, 2)
            : 0;

        return (new SaleResource($sale->load(['items.product', 'user'])))
            ->additional(['change' => $change])
            ->response()
            ->setStatusCode(201);
    }
}
