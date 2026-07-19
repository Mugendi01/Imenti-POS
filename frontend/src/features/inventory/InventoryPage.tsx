import { useState } from 'react'
import type { Product } from '@/types'
import { useListInventoryQuery, useListInventoryLogsQuery } from './inventoryApi'
import AdjustStockModal from './AdjustStockModal'

function LogsModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { data, isLoading } = useListInventoryLogsQuery({ product_id: product.id })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">{product.name} — Stock History</h2>

        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
          {isLoading && <p className="text-sm text-gray-400 py-4">Loading...</p>}
          {!isLoading && data?.data.length === 0 && (
            <p className="text-sm text-gray-400 py-4">No stock movements yet.</p>
          )}
          {data?.data.map((log) => (
            <div key={log.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="capitalize text-gray-900">{log.type}</p>
                <p className="text-gray-400">
                  {log.user_name} · {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
              <span className={log.change_qty < 0 ? 'text-red-600' : 'text-green-600'}>
                {log.change_qty > 0 ? '+' : ''}
                {log.change_qty}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded border border-gray-300">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const [page, setPage] = useState(1)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const { data, isLoading } = useListInventoryQuery({ page, low_stock: lowStockOnly || undefined })
  const [adjusting, setAdjusting] = useState<Product | null>(null)
  const [viewingLogs, setViewingLogs] = useState<Product | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory</h1>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked)
              setPage(1)
            }}
          />
          Low stock only
        </label>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">On Hand</th>
              <th className="px-4 py-2">Reorder Level</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
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
                  {lowStockOnly ? 'No products are low on stock.' : 'No products yet.'}
                </td>
              </tr>
            )}
            {data?.data.map((p) => {
              const low = p.qty_on_hand <= p.reorder_level
              return (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">{p.sku}</td>
                  <td className={`px-4 py-2 ${low ? 'text-red-600 font-medium' : ''}`}>{p.qty_on_hand}</td>
                  <td className="px-4 py-2">{p.reorder_level}</td>
                  <td className="px-4 py-2">
                    {low ? (
                      <span className="text-red-600 font-medium">Low stock</span>
                    ) : (
                      <span className="text-green-600">OK</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right space-x-3">
                    <button onClick={() => setViewingLogs(p)} className="text-gray-600 hover:underline">
                      History
                    </button>
                    <button onClick={() => setAdjusting(p)} className="text-indigo-600 hover:underline">
                      Adjust
                    </button>
                  </td>
                </tr>
              )
            })}
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

      {adjusting && <AdjustStockModal product={adjusting} onClose={() => setAdjusting(null)} />}
      {viewingLogs && <LogsModal product={viewingLogs} onClose={() => setViewingLogs(null)} />}
    </div>
  )
}
