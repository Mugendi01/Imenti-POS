const stats = [
  { label: "Today's Sales", value: '—' },
  { label: 'Transactions', value: '—' },
  { label: 'Low Stock Items', value: '—' },
  { label: 'Active Users', value: '—' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-medium text-gray-900 mb-2">Alerts</h2>
        <p className="text-sm text-gray-500">
          No alerts yet — wired up once the reports API (Phase 3) is live.
        </p>
      </div>
    </div>
  )
}
