import { baseApi } from '@/api/baseApi'
import type { Paginated, Sale } from '@/types'

export interface CheckoutItem {
  product_id: number
  qty: number
  discount?: number
}

export interface CheckoutRequest {
  items: CheckoutItem[]
  discount?: number
  payment_method: 'cash' | 'mpesa'
  amount_tendered?: number
  phone?: string
}

export interface CheckoutResponse extends Sale {
  // Only present for cash sales; M-Pesa has no "tendered" concept.
  change?: number
}

interface ListSalesParams {
  from?: string
  to?: string
  status?: string
  page?: number
}

export const salesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    checkout: builder.mutation<CheckoutResponse, CheckoutRequest>({
      query: (body) => ({ url: '/sales', method: 'POST', data: body }),
      transformResponse: (response: { data: Sale; change?: number }) => ({
        ...response.data,
        change: response.change,
      }),
      invalidatesTags: [
        { type: 'Products', id: 'LIST' },
        { type: 'Sales', id: 'LIST' },
      ],
    }),
    listSales: builder.query<Paginated<Sale>, ListSalesParams | void>({
      query: (params) => ({ url: '/sales', method: 'GET', params: params ?? {} }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((s) => ({ type: 'Sales' as const, id: s.id })),
              { type: 'Sales' as const, id: 'LIST' },
            ]
          : [{ type: 'Sales' as const, id: 'LIST' }],
    }),
    getSale: builder.query<Sale, number>({
      query: (id) => ({ url: `/sales/${id}`, method: 'GET' }),
      transformResponse: (response: { data: Sale }) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Sales', id }],
    }),
  }),
})

export const { useCheckoutMutation, useListSalesQuery, useGetSaleQuery } = salesApi
