import type { CheckoutResponse } from '@/features/sales/salesApi'

export default function Receipt({ sale, onClose }: { sale: CheckoutResponse; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm space-y-3">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Sale Complete</h2>
          <p className="text-sm text-gray-500">{sale.invoice_no}</p>
        </div>

        <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
          {sale.items?.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.product_name} x{item.qty}
              </span>
              <span>{item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{sale.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{sale.discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{sale.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span>{sale.total.toFixed(2)}</span>
          </div>
          {sale.payment_method === 'cash' && (
            <div className="flex justify-between text-gray-500">
              <span>Change</span>
              <span>{sale.change.toFixed(2)}</span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-indigo-600 text-white rounded py-2 text-sm"
        >
          New Sale
        </button>
      </div>
    </div>
  )
}
