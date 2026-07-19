<?php

namespace App\Policies;

use App\Models\Sale;
use App\Models\User;

class SalePolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role?->name, ['admin', 'manager', 'cashier'], true);
    }

    public function view(User $user, Sale $sale): bool
    {
        if (in_array($user->role?->name, ['admin', 'manager'], true)) {
            return true;
        }

        return $sale->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return in_array($user->role?->name, ['admin', 'manager', 'cashier'], true);
    }
}
