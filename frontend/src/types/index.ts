export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'manager' | 'cashier'
}

export interface Category {
  id: number
  name: string
  parent_id: number | null
}

export interface Product {
  id: number
  sku: string
  barcode: string
  name: string
  category_id: number
  category?: Category
  price: number
  cost: number
  tax_rate: number
  reorder_level: number
  qty_on_hand: number
  active: boolean
}

export interface Paginated<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}
