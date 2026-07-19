import { baseApi } from '@/api/baseApi'
import type { InventoryLog, Paginated, Product } from '@/types'

interface ListInventoryParams {
  low_stock?: boolean
  page?: number
}

interface ListLogsParams {
  product_id?: number
  page?: number
}

export interface AdjustStockRequest {
  product_id: number
  type: 'restock' | 'adjust' | 'return'
  qty: number
  reason?: string
}

interface AdjustStockResponse {
  product: Product
  log: InventoryLog
}

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listInventory: builder.query<Paginated<Product>, ListInventoryParams | void>({
      query: (params) => ({ url: '/inventory', method: 'GET', params: params ?? {} }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((p) => ({ type: 'Inventory' as const, id: p.id })),
              { type: 'Inventory' as const, id: 'LIST' },
            ]
          : [{ type: 'Inventory' as const, id: 'LIST' }],
    }),
    listInventoryLogs: builder.query<Paginated<InventoryLog>, ListLogsParams | void>({
      query: (params) => ({ url: '/inventory/logs', method: 'GET', params: params ?? {} }),
      providesTags: [{ type: 'Inventory', id: 'LOGS' }],
    }),
    adjustStock: builder.mutation<AdjustStockResponse, AdjustStockRequest>({
      query: (body) => ({ url: '/inventory/adjust', method: 'POST', data: body }),
      invalidatesTags: [
        { type: 'Products', id: 'LIST' },
        { type: 'Inventory', id: 'LIST' },
        { type: 'Inventory', id: 'LOGS' },
      ],
    }),
  }),
})

export const { useListInventoryQuery, useListInventoryLogsQuery, useAdjustStockMutation } = inventoryApi
