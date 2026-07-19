<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInventoryAdjustmentRequest;
use App\Http\Resources\InventoryLogResource;
use App\Http\Resources\ProductResource;
use App\Models\InventoryLog;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::query()
            ->with('category')
            ->when($request->boolean('low_stock'), fn ($q) => $q->whereColumn('qty_on_hand', '<=', 'reorder_level'))
            ->orderBy('name')
            ->paginate(min((int) $request->integer('per_page', 20), 100));

        return ProductResource::collection($products);
    }

    public function logs(Request $request)
    {
        $logs = InventoryLog::query()
            ->with(['product', 'user'])
            ->when($request->integer('product_id'), fn ($q, $id) => $q->where('product_id', $id))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 20), 100));

        return InventoryLogResource::collection($logs);
    }

    public function adjust(StoreInventoryAdjustmentRequest $request)
    {
        $data = $request->validated();

        $result = DB::transaction(function () use ($data, $request) {
            $product = Product::lockForUpdate()->findOrFail($data['product_id']);
            $newQty = $product->qty_on_hand + $data['qty'];

            if ($newQty < 0) {
                throw new HttpException(422, "Adjustment would result in negative stock for {$product->name}.");
            }

            $product->qty_on_hand = $newQty;
            $product->version += 1;
            $product->save();

            $log = InventoryLog::create([
                'product_id' => $product->id,
                'change_qty' => $data['qty'],
                'type' => $data['type'],
                'reference_id' => null,
                'user_id' => $request->user()->id,
                'created_at' => now(),
            ]);

            return ['product' => $product->fresh('category'), 'log' => $log->load('user')];
        });

        return response()->json([
            'product' => new ProductResource($result['product']),
            'log' => new InventoryLogResource($result['log']),
        ]);
    }
}
