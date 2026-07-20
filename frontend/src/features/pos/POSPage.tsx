import { lazy, Suspense, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useListProductsQuery } from '@/features/products/productsApi'
import { useCheckoutMutation, useGetSaleQuery, type CheckoutResponse } from '@/features/sales/salesApi'
import {
  addItem,
  clearCart,
  removeItem,
  selectCartDiscount,
  selectCartItems,
  selectCartSubtotal,
  selectCartTax,
  selectCartTotal,
  setDiscount,
  setQty,
} from './cartSlice'
import Receipt from './Receipt'

// Quagga2 is a large dependency (image processing) only needed once someone
// actually opens the scanner, so it's split into its own chunk.
const BarcodeScannerModal = lazy(() => import('./BarcodeScannerModal'))

const PHONE_PATTERN = /^(?:254|0)7\d{8}$/

export default function POSPage() {
  const [search, setSearch] = useState('')
  const { data: results } = useListProductsQuery({ search: search || undefined, per_page: 8 })

  const dispatch = useAppDispatch()
  const items = useAppSelector(selectCartItems)
  const discount = useAppSelector(selectCartDiscount)
  const subtotal = useAppSelector(selectCartSubtotal)
  const tax = useAppSelector(selectCartTax)
  const total = useAppSelector(selectCartTotal)

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash')
  const [amountTendered, setAmountTendered] = useState('')
  const [phone, setPhone] = useState('')
  const [checkout, { isLoading, error }] = useCheckoutMutation()
  const [completedSale, setCompletedSale] = useState<CheckoutResponse | null>(null)
  const [pendingSaleId, setPendingSaleId] = useState<number | null>(null)
  const [mpesaError, setMpesaError] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)

  const { data: polledSale } = useGetSaleQuery(pendingSaleId ?? 0, {
    skip: pendingSaleId === null,
    pollingInterval: pendingSaleId !== null ? 2000 : 0,
  })

  useEffect(() => {
    if (!polledSale) return

    if (polledSale.status === 'completed') {
      setCompletedSale(polledSale)
      setPendingSaleId(null)
      dispatch(clearCart())
    } else if (polledSale.status === 'voided') {
      setPendingSaleId(null)
      setMpesaError('The M-Pesa payment failed or was cancelled on the phone. You can try again.')
    }
  }, [polledSale, dispatch])

  const tendered = parseFloat(amountTendered) || 0
  const phoneValid = PHONE_PATTERN.test(phone)
  const canCheckout =
    items.length > 0 &&
    pendingSaleId === null &&
    (paymentMethod === 'cash' ? tendered >= total : phoneValid)

  const handleCheckout = async () => {
    setMpesaError(null)
    const result = await checkout({
      items: items.map((i) => ({ product_id: i.product_id, qty: i.qty, discount: i.discount })),
      discount,
      payment_method: paymentMethod,
      amount_tendered: paymentMethod === 'cash' ? tendered : undefined,
      phone: paymentMethod === 'mpesa' ? phone : undefined,
    }).unwrap()

    if (result.status === 'completed') {
      setCompletedSale(result)
      dispatch(clearCart())
      setAmountTendered('')
    } else {
      // Real (non-mock) M-Pesa: sale is 'pending' until Safaricom's callback
      // arrives. Poll until it flips to completed/voided.
      setPendingSaleId(result.id)
    }
  }

  const apiErrorMessage =
    error && typeof error === 'object' && 'data' in error
      ? ((error.data as { message?: string })?.message ?? 'Checkout failed.')
      : undefined

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Point of Sale</h1>
          <button
            onClick={() => setShowScanner(true)}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
          >
            Scan Barcode
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, SKU or barcode..."
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />

        <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
          {results?.data.length === 0 && (
            <p className="px-4 py-6 text-center text-gray-400 text-sm">No products found.</p>
          )}
          {results?.data.map((p) => (
            <button
              key={p.id}
              onClick={() => dispatch(addItem(p))}
              disabled={p.qty_on_hand === 0}
              className="w-full flex items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div>
                <p className="font-medium text-gray-900">{p.name}</p>
                <p className="text-gray-400">{p.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-900">{p.price.toFixed(2)}</p>
                <p className="text-gray-400">{p.qty_on_hand} in stock</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-3 h-fit">
        <h2 className="font-medium text-gray-900">Cart</h2>

        {items.length === 0 && <p className="text-sm text-gray-400">Cart is empty.</p>}

        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.product_id} className="flex items-center justify-between text-sm">
              <div className="flex-1">
                <p className="text-gray-900">{item.name}</p>
                <p className="text-gray-400">{item.price.toFixed(2)} each</p>
              </div>
              <input
                type="number"
                min={1}
                max={item.qty_on_hand}
                value={item.qty}
                onChange={(e) =>
                  dispatch(setQty({ productId: item.product_id, qty: parseInt(e.target.value, 10) || 1 }))
                }
                className="w-14 rounded border border-gray-300 px-2 py-1 text-center"
              />
              <button
                onClick={() => dispatch(removeItem(item.product_id))}
                className="ml-2 text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span>Discount</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={discount || ''}
              onChange={(e) => dispatch(setDiscount(parseFloat(e.target.value) || 0))}
              className="w-20 rounded border border-gray-300 px-2 py-1 text-right"
            />
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Tax</span>
            <span>{tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span>{total.toFixed(2)}</span>
          </div>
        </div>

        {pendingSaleId !== null ? (
          <div className="rounded border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800 space-y-1">
            <p className="font-medium">Waiting for M-Pesa confirmation...</p>
            <p className="text-indigo-600">Ask the customer to enter their M-Pesa PIN on {phone}.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'mpesa')}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="mpesa">M-Pesa</option>
              </select>
              {paymentMethod === 'cash' ? (
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder="Amount tendered"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              ) : (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="M-Pesa phone e.g. 0712345678"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              )}
            </div>

            {apiErrorMessage && <p className="text-sm text-red-600">{apiErrorMessage}</p>}
            {mpesaError && <p className="text-sm text-red-600">{mpesaError}</p>}

            <button
              onClick={handleCheckout}
              disabled={!canCheckout || isLoading}
              className="w-full bg-indigo-600 text-white rounded py-2 text-sm disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Complete Sale'}
            </button>
          </>
        )}
      </div>

      {completedSale && <Receipt sale={completedSale} onClose={() => setCompletedSale(null)} />}
      {showScanner && (
        <Suspense fallback={null}>
          <BarcodeScannerModal
            onClose={() => setShowScanner(false)}
            onDetected={() => setShowScanner(false)}
          />
        </Suspense>
      )}
    </div>
  )
}
