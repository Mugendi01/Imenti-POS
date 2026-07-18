import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import type { Product } from '@/types'
import { useCreateProductMutation, useUpdateProductMutation } from './productsApi'
import { useListCategoriesQuery } from './categoriesApi'

const schema = z.object({
  sku: z.string().min(1, 'Required'),
  barcode: z.string().min(1, 'Required'),
  name: z.string().min(1, 'Required'),
  category_id: z.coerce.number().int().positive('Select a category'),
  price: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative(),
  tax_rate: z.coerce.number().min(0).max(100),
  reorder_level: z.coerce.number().int().nonnegative(),
})
// z.coerce fields have `unknown` input types (raw form strings) that resolve to
// `number` output types after validation — RHF needs both generics to type this.
type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

export default function ProductForm({
  product,
  onClose,
}: {
  product?: Product
  onClose: () => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: product ?? {
      sku: '',
      barcode: '',
      name: '',
      category_id: 0,
      price: 0,
      cost: 0,
      tax_rate: 0,
      reorder_level: 0,
    },
  })
  const { data: categories } = useListCategoriesQuery()
  const [createProduct] = useCreateProductMutation()
  const [updateProduct] = useUpdateProductMutation()

  useEffect(() => {
    if (product) reset(product)
  }, [product, reset])

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (product) {
      await updateProduct({ id: product.id, body: values }).unwrap()
    } else {
      await createProduct(values).unwrap()
    }
    onClose()
  }

  const field = (name: keyof FormInput, label: string, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        {...register(name)}
        type={type}
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
      />
      {errors[name] && <p className="text-sm text-red-600">{errors[name]?.message}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md space-y-3"
      >
        <h2 className="text-lg font-semibold text-gray-900">
          {product ? 'Edit Product' : 'New Product'}
        </h2>

        {field('name', 'Name')}

        <div className="grid grid-cols-2 gap-3">
          {field('sku', 'SKU')}
          {field('barcode', 'Barcode')}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {field('price', 'Price', 'number')}
          {field('cost', 'Cost', 'number')}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {field('tax_rate', 'Tax %', 'number')}
          {field('reorder_level', 'Reorder Level', 'number')}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            {...register('category_id')}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="">Select category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <p className="text-sm text-red-600">{errors.category_id.message}</p>
          )}
        </div>

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
