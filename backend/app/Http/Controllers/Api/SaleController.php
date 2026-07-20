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
use App\Services\MpesaService;
use App\Services\SaleFinalizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SaleController extends Controller
{
    public function __construct(
        private readonly MpesaService $mpesa,
        private readonly SaleFinalizer $finalizer,
    ) {}

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

        if ($data['payment_method'] === 'mpesa') {
            return $this->storeMpesaSale($data, $request);
        }

        return $this->storeCashSale($data, $request);
    }

    /**
     * Cash: everything (validation, stock decrement, payment) happens synchronously
     * in one transaction, since the cashier already has the money in hand.
     */
    private function storeCashSale(array $data, Request $request)
    {
        $sale = DB::transaction(function () use ($data, $request) {
            [$lines, $subtotal, $tax] = $this->buildLines($data['items']);

            $discount = $data['discount'] ?? 0;
            $total = round($subtotal - $discount + $tax, 2);

            if (($data['amount_tendered'] ?? 0) < $total) {
                throw new HttpException(422, 'Amount tendered is less than the total due.');
            }

            $sale = $this->createSaleWithItems($data, $request, $lines, $subtotal, $discount, $tax, $total, 'completed');

            foreach ($lines as $line) {
                $line['product']->qty_on_hand -= $line['qty'];
                $line['product']->version += 1;
                $line['product']->save();

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
                'provider' => 'cash',
                'amount' => $total,
                'status' => 'completed',
            ]);

            return $sale;
        });

        $change = round(($data['amount_tendered'] ?? 0) - $sale->total, 2);

        return (new SaleResource($sale->load(['items.product', 'user'])))
            ->additional(['change' => $change])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * M-Pesa: stock is validated but NOT decremented yet — the sale sits as
     * 'pending' until Safaricom confirms the customer entered their PIN (via the
     * callback) or, in mock mode, we simulate that confirmation immediately since
     * no real Daraja credentials are configured in this environment.
     */
    private function storeMpesaSale(array $data, Request $request)
    {
        $sale = DB::transaction(function () use ($data, $request) {
            [$lines, $subtotal, $tax] = $this->buildLines($data['items']);

            $discount = $data['discount'] ?? 0;
            $total = round($subtotal - $discount + $tax, 2);

            $sale = $this->createSaleWithItems($data, $request, $lines, $subtotal, $discount, $tax, $total, 'pending');

            Payment::create([
                'sale_id' => $sale->id,
                'provider' => 'mpesa',
                'amount' => $total,
                'status' => 'pending',
            ]);

            return $sale;
        });

        try {
            $stk = $this->mpesa->stkPush(
                $data['phone'],
                (float) $sale->total,
                $sale->invoice_no,
                "Imenti POS sale {$sale->invoice_no}",
            );

            $sale->payments()->latest()->first()->update(['provider_ref' => $stk['checkout_request_id']]);

            if ($this->mpesa->isMocked()) {
                $this->finalizer->complete($sale);
            }
        } catch (RuntimeException $e) {
            Log::error('M-Pesa checkout failed', ['sale_id' => $sale->id, 'error' => $e->getMessage()]);
            $this->finalizer->fail($sale, $e->getMessage());
        }

        return (new SaleResource($sale->fresh(['items.product', 'user']))
        )
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Validates stock/availability and computes line + order totals. Locks the
     * affected product rows for the remainder of the caller's transaction.
     *
     * @return array{0: array, 1: float, 2: float} [lines, subtotal, tax]
     */
    private function buildLines(array $items): array
    {
        $productIds = collect($items)->pluck('product_id');
        $products = Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id');

        $subtotal = 0;
        $tax = 0;
        $lines = [];

        foreach ($items as $line) {
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

        return [$lines, $subtotal, $tax];
    }

    private function createSaleWithItems(
        array $data,
        Request $request,
        array $lines,
        float $subtotal,
        float $discount,
        float $tax,
        float $total,
        string $status,
    ): Sale {
        $sale = Sale::create([
            'invoice_no' => 'PENDING',
            'user_id' => $request->user()->id,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'tax' => $tax,
            'total' => $total,
            'payment_method' => $data['payment_method'],
            'phone' => $data['phone'] ?? null,
            'status' => $status,
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
        }

        return $sale;
    }
}
