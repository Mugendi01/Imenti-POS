<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Raw ALTER is required for MySQL/MariaDB enum changes (no Doctrine DBAL enum support).
        DB::statement("ALTER TABLE sales MODIFY status ENUM('pending', 'completed', 'refunded', 'voided') NOT NULL DEFAULT 'completed'");
        DB::statement("ALTER TABLE payments MODIFY provider ENUM('cash', 'mpesa') NOT NULL");

        Schema::table('sales', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('payment_method');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->string('mpesa_receipt')->nullable()->after('provider_ref');
            $table->text('failure_reason')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['mpesa_receipt', 'failure_reason']);
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn('phone');
        });

        DB::statement("ALTER TABLE payments MODIFY provider ENUM('cash', 'card', 'stripe', 'paypal') NOT NULL");
        DB::statement("ALTER TABLE sales MODIFY status ENUM('completed', 'refunded', 'voided') NOT NULL DEFAULT 'completed'");
    }
};
