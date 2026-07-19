import { baseApi } from '@/api/baseApi'
import type { Paginated, Product } from '@/types'

export interface ProductInput {
  sku: string
  barcode: string
  name: string
  category_id: number
  price: number
  cost: number
  tax_rate: number
  reorder_level: number
}

export interface ListParams {
  search?: string
  category?: number
  page?: number
  per_page?: number
}

export const productsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listProducts: builder.query<Paginated<Product>, ListParams | void>({
      query: (params) => ({ url: '/products', method: 'GET', params: params ?? {} }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((p) => ({ type: 'Products' as const, id: p.id })),
              { type: 'Products' as const, id: 'LIST' },
            ]
          : [{ type: 'Products' as const, id: 'LIST' }],
    }),
    createProduct: builder.mutation<Product, ProductInput>({
      query: (body) => ({ url: '/products', method: 'POST', data: body }),
      transformResponse: (response: { data: Product }) => response.data,
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
    }),
    updateProduct: builder.mutation<Product, { id: number; body: Partial<ProductInput> }>({
      query: ({ id, body }) => ({ url: `/products/${id}`, method: 'PUT', data: body }),
      transformResponse: (response: { data: Product }) => response.data,
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Products', id: arg.id },
        { type: 'Products', id: 'LIST' },
      ],
    }),
    deleteProduct: builder.mutation<void, number>({
      query: (id) => ({ url: `/products/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
    }),
  }),
})

export const {
  useListProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productsApi
