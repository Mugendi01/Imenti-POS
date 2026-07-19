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

export interface SaleItem {
  id: number
  product_id: number
  product_name: string
  qty: number
  unit_price: number
  discount: number
  subtotal: number
}

export interface Sale {
  id: number
  invoice_no: string
  user?: { id: number; name: string }
  subtotal: number
  discount: number
  tax: number
  total: number
  payment_method: string
  status: 'completed' | 'refunded' | 'voided'
  items?: SaleItem[]
  created_at: string
}

export interface CartItem {
  product_id: number
  name: string
  price: number
  tax_rate: number
  qty: number
  discount: number
  qty_on_hand: number
}

export interface InventoryLog {
  id: number
  product_id: number
  product_name: string
  change_qty: number
  type: 'sale' | 'restock' | 'adjust' | 'return'
  reference_id: number | null
  user_name: string
  created_at: string
}
