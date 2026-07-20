<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Product::class);

        $products = Product::query()
            ->with('category')
            ->when($request->string('search')->toString(), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%");
                });
            })
            ->when($request->integer('category'), fn ($query, $categoryId) => $query->where('category_id', $categoryId))
            ->orderBy('name')
            ->paginate(min((int) $request->integer('per_page', 20), 100));

        return ProductResource::collection($products);
    }

    public function show(Product $product)
    {
        $this->authorize('view', $product);

        return new ProductResource($product->load('category'));
    }

    public function showByBarcode(Request $request, string $barcode)
    {
        $this->authorize('viewAny', Product::class);

        $product = Product::where('barcode', $barcode)->where('active', true)->with('category')->first();

        if (! $product) {
            return response()->json(['message' => 'No active product matches that barcode.'], 404);
        }

        return new ProductResource($product);
    }

    public function store(StoreProductRequest $request)
    {
        $product = Product::create($request->validated())->fresh();

        return (new ProductResource($product->load('category')))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateProductRequest $request, Product $product)
    {
        $product->update($request->validated());

        return new ProductResource($product->load('category'));
    }

    public function destroy(Product $product)
    {
        $this->authorize('delete', $product);

        $product->delete();

        return response()->noContent();
    }
}
