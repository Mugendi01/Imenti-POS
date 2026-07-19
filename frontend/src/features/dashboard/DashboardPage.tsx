import { useDashboardStatsQuery } from '@/features/reports/reportsApi'
import { useListInventoryQuery } from '@/features/inventory/inventoryApi'

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStatsQuery()
  const { data: lowStock } = useListInventoryQuery({ low_stock: true, page: 1 })

  const cards = [
    { label: "Today's Sales", value: stats ? stats.today_sales.toFixed(2) : '—' },
    { label: 'Transactions', value: stats ? stats.today_transactions : '—' },
    { label: 'Low Stock Items', value: stats ? stats.low_stock_count : '—' },
    { label: 'Active Users', value: stats ? stats.active_users : '—' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((s) => (
          <div key={s.label} className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{isLoading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-medium text-gray-900 mb-2">Low Stock Alerts</h2>
        {!lowStock || lowStock.data.length === 0 ? (
          <p className="text-sm text-gray-500">No products are currently low on stock.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {lowStock.data.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-900">{p.name}</span>
                <span className="text-red-600 font-medium">
                  {p.qty_on_hand} left (reorder at {p.reorder_level})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
