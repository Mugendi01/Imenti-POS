import { createApi } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import type { AxiosError, AxiosRequestConfig } from 'axios'
import { axiosInstance } from './axios'

type AxiosArgs = {
  url: string
  method: AxiosRequestConfig['method']
  data?: unknown
  params?: unknown
}

const axiosBaseQuery = (): BaseQueryFn<AxiosArgs, unknown, unknown> =>
  async ({ url, method, data, params }) => {
    try {
      const result = await axiosInstance({ url, method, data, params })
      return { data: result.data }
    } catch (err) {
      const axiosError = err as AxiosError
      return {
        error: {
          status: axiosError.response?.status,
          data: axiosError.response?.data ?? axiosError.message,
        },
      }
    }
  }

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Products', 'Categories', 'Inventory', 'Sales', 'Users', 'Me'],
  endpoints: () => ({}),
})
