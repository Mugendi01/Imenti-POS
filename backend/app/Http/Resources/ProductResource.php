<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'name' => $this->name,
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'name' => $this->category->name,
            ]),
            'price' => (float) $this->price,
            'cost' => (float) $this->cost,
            'tax_rate' => (float) $this->tax_rate,
            'reorder_level' => $this->reorder_level,
            'qty_on_hand' => $this->qty_on_hand,
            'active' => $this->active,
        ];
    }
}
