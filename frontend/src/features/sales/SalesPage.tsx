import { useState } from 'react'
import { useListSalesQuery } from './salesApi'

export default function SalesPage() {
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = useListSalesQuery({
    page,
    from: from || undefined,
    to: to || undefined,
    status: status || undefined,
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Sales</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(1)
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(1)
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="refunded">Refunded</option>
            <option value="voided">Voided</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Cashier</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Payment</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && data?.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No sales yet.
                </td>
              </tr>
            )}
            {data?.data.map((sale) => (
              <tr key={sale.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{sale.invoice_no}</td>
                <td className="px-4 py-2">{sale.user?.name}</td>
                <td className="px-4 py-2">{new Date(sale.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 capitalize">{sale.payment_method}</td>
                <td className="px-4 py-2 capitalize">{sale.status}</td>
                <td className="px-4 py-2 text-right">{sale.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            Page {data.meta.current_page} of {data.meta.last_page}
          </span>
          <button
            disabled={page >= data.meta.last_page}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
