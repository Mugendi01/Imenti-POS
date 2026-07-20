import { baseApi } from '@/api/baseApi'
import { axiosInstance } from '@/api/axios'

export interface DashboardStats {
  today_sales: number
  today_transactions: number
  low_stock_count: number
  active_users: number
}

export interface SalesReportRow {
  period: string
  revenue: number
  sales_count: number
}

export interface TopProductRow {
  product_id: number
  name: string
  qty_sold: number
  revenue: number
}

export interface RevenueSummary {
  period: string
  total_revenue: number
  total_sales: number
  avg_sale: number
}

interface SalesReportParams {
  group_by?: 'day' | 'week' | 'month'
  from?: string
  to?: string
}

interface TopProductsParams {
  limit?: number
  from?: string
  to?: string
}

interface RevenueParams {
  period?: 'today' | 'week' | 'month'
}

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    dashboardStats: builder.query<DashboardStats, void>({
      query: () => ({ url: '/reports/dashboard', method: 'GET' }),
    }),
    salesReport: builder.query<SalesReportRow[], SalesReportParams | void>({
      query: (params) => ({ url: '/reports/sales', method: 'GET', params: params ?? {} }),
    }),
    topProducts: builder.query<TopProductRow[], TopProductsParams | void>({
      query: (params) => ({ url: '/reports/top-products', method: 'GET', params: params ?? {} }),
    }),
    revenueSummary: builder.query<RevenueSummary, RevenueParams | void>({
      query: (params) => ({ url: '/reports/revenue', method: 'GET', params: params ?? {} }),
    }),
  }),
})

export const {
  useDashboardStatsQuery,
  useSalesReportQuery,
  useTopProductsQuery,
  useRevenueSummaryQuery,
} = reportsApi

/**
 * RTK Query isn't a good fit for triggering a file download, so this is a
 * plain authenticated fetch (reusing the same axios instance/token) that
 * saves the streamed CSV via a throwaway anchor element.
 */
export async function downloadReportCsv(report: 'sales' | 'top-products') {
  const response = await axiosInstance.get('/reports/export', {
    params: { report },
    responseType: 'blob',
  })

  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = `${report}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
