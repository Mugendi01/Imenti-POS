<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'sku' => strtoupper($this->faker->bothify('SKU-####??')),
            'barcode' => $this->faker->unique()->ean13(),
            'name' => $this->faker->words(3, true),
            'category_id' => Category::factory(),
            'price' => $this->faker->randomFloat(2, 1, 100),
            'cost' => $this->faker->randomFloat(2, 0.5, 80),
            'tax_rate' => 16,
            'reorder_level' => $this->faker->numberBetween(5, 20),
            'qty_on_hand' => $this->faker->numberBetween(0, 200),
            'active' => true,
        ];
    }
}
