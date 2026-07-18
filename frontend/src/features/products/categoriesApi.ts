import { baseApi } from '@/api/baseApi'
import type { Category } from '@/types'

export const categoriesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listCategories: builder.query<Category[], void>({
      query: () => ({ url: '/categories', method: 'GET' }),
      providesTags: ['Categories'],
    }),
  }),
})

export const { useListCategoriesQuery } = categoriesApi
