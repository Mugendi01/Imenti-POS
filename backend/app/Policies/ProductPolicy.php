<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role?->name, ['admin', 'manager', 'cashier'], true);
    }

    public function view(User $user, Product $product): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return in_array($user->role?->name, ['admin', 'manager'], true);
    }

    public function update(User $user, Product $product): bool
    {
        return in_array($user->role?->name, ['admin', 'manager'], true);
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->role?->name === 'admin';
    }
}
