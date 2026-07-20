<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ReportController extends Controller
{
    public function dashboard(Request $request)
    {
        $today = today();

        return response()->json([
            'today_sales' => (float) Sale::whereDate('created_at', $today)->where('status', 'completed')->sum('total'),
            'today_transactions' => Sale::whereDate('created_at', $today)->where('status', 'completed')->count(),
            'low_stock_count' => Product::whereColumn('qty_on_hand', '<=', 'reorder_level')->where('active', true)->count(),
            'active_users' => User::where('active', true)->count(),
        ]);
    }

    public function sales(Request $request)
    {
        $from = $request->date('from') ?? Carbon::now()->subDays(30)->startOfDay();
        $to = $request->date('to') ?? Carbon::now()->endOfDay();
        $groupBy = $request->string('group_by')->toString() ?: 'day';

        return response()->json($this->salesRows($from, $to, $groupBy));
    }

    public function topProducts(Request $request)
    {
        $limit = min((int) $request->integer('limit', 10), 50);
        $from = $request->date('from') ?? Carbon::now()->subDays(30)->startOfDay();
        $to = $request->date('to') ?? Carbon::now()->endOfDay();

        return response()->json($this->topProductsRows($from, $to, $limit));
    }

    public function revenue(Request $request)
    {
        $period = $request->string('period')->toString() ?: 'month';

        $start = match ($period) {
            'today' => today(),
            'week' => Carbon::now()->startOfWeek(),
            'month' => Carbon::now()->startOfMonth(),
            default => Carbon::now()->startOfMonth(),
        };

        $query = Sale::where('status', 'completed')->where('created_at', '>=', $start);

        return response()->json([
            'period' => $period,
            'total_revenue' => (float) $query->sum('total'),
            'total_sales' => $query->count(),
            'avg_sale' => (float) ($query->avg('total') ?? 0),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $report = $request->string('report')->toString();
        $from = $request->date('from') ?? Carbon::now()->subDays(30)->startOfDay();
        $to = $request->date('to') ?? Carbon::now()->endOfDay();

        [$filename, $headers, $rows] = match ($report) {
            'sales' => [
                'sales-report.csv',
                ['Period', 'Revenue', 'Sales Count'],
                array_map(fn ($r) => [$r['period'], $r['revenue'], $r['sales_count']], $this->salesRows($from, $to, $request->string('group_by')->toString() ?: 'day')),
            ],
            'top-products' => [
                'top-products.csv',
                ['Product', 'Qty Sold', 'Revenue'],
                array_map(fn ($r) => [$r['name'], $r['qty_sold'], $r['revenue']], $this->topProductsRows($from, $to, 50)),
            ],
            default => throw new HttpException(422, 'Unknown report type. Use "sales" or "top-products".'),
        };

        return response()->streamDownload(function () use ($headers, $rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $headers);
            foreach ($rows as $row) {
                fputcsv($out, $row);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function salesRows(Carbon $from, Carbon $to, string $groupBy): array
    {
        // DATE_FORMAT is MySQL/MariaDB syntax; swap for TO_CHAR(...) if moving to Postgres.
        $format = match ($groupBy) {
            'week' => '%x-W%v',
            'month' => '%Y-%m',
            default => '%Y-%m-%d',
        };

        return Sale::query()
            ->where('status', 'completed')
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw("DATE_FORMAT(created_at, '{$format}') as period, SUM(total) as revenue, COUNT(*) as sales_count")
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->map(fn ($row) => [
                'period' => $row->period,
                'revenue' => (float) $row->revenue,
                'sales_count' => (int) $row->sales_count,
            ])
            ->all();
    }

    private function topProductsRows(Carbon $from, Carbon $to, int $limit): array
    {
        return SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->where('sales.status', 'completed')
            ->whereBetween('sales.created_at', [$from, $to])
            ->selectRaw('products.id as product_id, products.name, SUM(sale_items.qty) as qty_sold, SUM(sale_items.subtotal) as revenue')
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('qty_sold')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'product_id' => $row->product_id,
                'name' => $row->name,
                'qty_sold' => (int) $row->qty_sold,
                'revenue' => (float) $row->revenue,
            ])
            ->all();
    }
}
