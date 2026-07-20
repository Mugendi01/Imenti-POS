import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { downloadReportCsv, useRevenueSummaryQuery, useSalesReportQuery, useTopProductsQuery } from './reportsApi'

export default function ReportsPage() {
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month')

  const { data: sales } = useSalesReportQuery({ group_by: groupBy })
  const { data: topProducts } = useTopProductsQuery({ limit: 5 })
  const { data: revenue } = useRevenueSummaryQuery({ period })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">Revenue</p>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof period)}
              className="text-xs rounded border border-gray-300"
            >
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </select>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{(revenue?.total_revenue ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Sales</p>
          <p className="text-2xl font-semibold text-gray-900">{revenue?.total_sales ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Average sale</p>
          <p className="text-2xl font-semibold text-gray-900">{(revenue?.avg_sale ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium text-gray-900">Sales over time</h2>
          <div className="flex items-center gap-2">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
              className="text-sm rounded border border-gray-300 px-2 py-1"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
            <button
              onClick={() => downloadReportCsv('sales')}
              className="text-sm px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={sales ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium text-gray-900">Top products (last 30 days)</h2>
          <button
            onClick={() => downloadReportCsv('top-products')}
            className="text-sm px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={topProducts ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="qty_sold" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
