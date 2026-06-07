import { create } from 'zustand'
import { AuthUser } from '../types'

type AuthState = {
  isAuthenticated: boolean
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
}

const DEFAULT_USER: AuthUser = {
  id: 1,
  name: '관리자 사용자',
  email: 'admin@example.com',
  role: 'ADMIN',
  status: 'APPROVED',
}

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: true,
  user: DEFAULT_USER,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: Boolean(user),
    }),
}))
