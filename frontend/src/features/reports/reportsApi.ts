import { baseApi } from '@/api/baseApi'

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
