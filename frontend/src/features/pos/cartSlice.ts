import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CartItem, Product } from '@/types'
import type { RootState } from '@/app/store'

interface CartState {
  items: CartItem[]
  discount: number
}

const initialState: CartState = { items: [], discount: 0 }

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<Product>) {
      const p = action.payload
      const existing = state.items.find((i) => i.product_id === p.id)

      if (existing) {
        if (existing.qty < p.qty_on_hand) existing.qty += 1
      } else if (p.qty_on_hand > 0) {
        state.items.push({
          product_id: p.id,
          name: p.name,
          price: p.price,
          tax_rate: p.tax_rate,
          qty: 1,
          discount: 0,
          qty_on_hand: p.qty_on_hand,
        })
      }
    },
    setQty(state, action: PayloadAction<{ productId: number; qty: number }>) {
      const item = state.items.find((i) => i.product_id === action.payload.productId)
      if (item) item.qty = Math.max(1, Math.min(action.payload.qty, item.qty_on_hand))
    },
    removeItem(state, action: PayloadAction<number>) {
      state.items = state.items.filter((i) => i.product_id !== action.payload)
    },
    setDiscount(state, action: PayloadAction<number>) {
      state.discount = Math.max(0, action.payload)
    },
    clearCart(state) {
      state.items = []
      state.discount = 0
    },
  },
})

export const { addItem, setQty, removeItem, setDiscount, clearCart } = cartSlice.actions
export default cartSlice.reducer

export const selectCartItems = (state: RootState) => state.cart.items
export const selectCartDiscount = (state: RootState) => state.cart.discount

export const selectCartSubtotal = (state: RootState) =>
  state.cart.items.reduce((sum, i) => sum + i.price * i.qty - i.discount, 0)

export const selectCartTax = (state: RootState) =>
  state.cart.items.reduce((sum, i) => sum + (i.price * i.qty - i.discount) * (i.tax_rate / 100), 0)

export const selectCartTotal = (state: RootState) =>
  selectCartSubtotal(state) - state.cart.discount + selectCartTax(state)
