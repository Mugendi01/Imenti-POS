import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@/types'
import { setToken } from '@/api/tokenStore'

interface AuthState {
  token: string | null
  user: User | null
}

const initialState: AuthState = { token: null, user: null }

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    credentialsSet(state, action: PayloadAction<{ token: string; user: User }>) {
      state.token = action.payload.token
      state.user = action.payload.user
      setToken(action.payload.token)
    },
    loggedOut(state) {
      state.token = null
      state.user = null
      setToken(null)
    },
  },
})

export const { credentialsSet, loggedOut } = authSlice.actions
export default authSlice.reducer
