import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Product } from '@/types'
import { useAdjustStockMutation } from './inventoryApi'

const schema = z.object({
  type: z.enum(['restock', 'adjust', 'return']),
  qty: z.coerce.number().int().refine((v) => v !== 0, 'Quantity cannot be zero'),
  reason: z.string().max(255).optional(),
})
type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

export default function AdjustStockModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'restock', qty: 0, reason: '' },
  })
  const [adjustStock, { error }] = useAdjustStockMutation()

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    await adjustStock({ product_id: product.id, ...values }).unwrap()
    onClose()
  }

  const apiErrorMessage =
    error && typeof error === 'object' && 'data' in error
      ? ((error.data as { message?: string })?.message ?? 'Adjustment failed.')
      : undefined

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm space-y-3"
      >
        <h2 className="text-lg font-semibold text-gray-900">Adjust Stock</h2>
        <p className="text-sm text-gray-500">
          {product.name} — currently {product.qty_on_hand} on hand
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            {...register('type')}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="restock">Restock (delivery in)</option>
            <option value="adjust">Adjust (count / shrinkage)</option>
            <option value="return">Return (customer return)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Quantity change (use a negative number to decrease)
          </label>
          <input
            {...register('qty')}
            type="number"
            step="1"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
          {errors.qty && <p className="text-sm text-red-600">{errors.qty.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Reason (optional)</label>
          <input
            {...register('reason')}
            type="text"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        {apiErrorMessage && <p className="text-sm text-red-600">{apiErrorMessage}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border border-gray-300"
          >
            Cancel
          </button>
          <button
            disabled={isSubmitting}
            type="submit"
            className="px-4 py-2 text-sm rounded bg-indigo-600 text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
