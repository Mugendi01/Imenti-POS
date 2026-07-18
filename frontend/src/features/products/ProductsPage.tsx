import { useState } from 'react'
import { useListProductsQuery, useDeleteProductMutation } from './productsApi'
import ProductForm from './ProductForm'
import type { Product } from '@/types'

export default function ProductsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useListProductsQuery({ page, search: search || undefined })
  const [deleteProduct] = useDeleteProductMutation()
  const [editing, setEditing] = useState<Product | undefined>(undefined)
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        <button
          onClick={() => {
            setEditing(undefined)
            setShowForm(true)
          }}
          className="px-4 py-2 text-sm rounded bg-indigo-600 text-white"
        >
          New Product
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
        placeholder="Search by name, SKU or barcode..."
        className="w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm"
      />

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Barcode</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Stock</th>
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
                  No products yet.
                </td>
              </tr>
            )}
            {data?.data.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">{p.sku}</td>
                <td className="px-4 py-2">{p.barcode}</td>
                <td className="px-4 py-2">{p.price.toFixed(2)}</td>
                <td
                  className={`px-4 py-2 ${
                    p.qty_on_hand <= p.reorder_level ? 'text-red-600 font-medium' : ''
                  }`}
                >
                  {p.qty_on_hand}
                </td>
                <td className="px-4 py-2 text-right space-x-3">
                  <button
                    onClick={() => {
                      setEditing(p)
                      setShowForm(true)
                    }}
                    className="text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteProduct(p.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
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

      {showForm && <ProductForm product={editing} onClose={() => setShowForm(false)} />}
    </div>
  )
}
