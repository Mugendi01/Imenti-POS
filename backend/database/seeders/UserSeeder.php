<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@imenti-pos.test'],
            [
                'name' => 'Admin',
                'password' => 'password',
                'role_id' => Role::where('name', 'admin')->value('id'),
            ]
        );
    }
}
