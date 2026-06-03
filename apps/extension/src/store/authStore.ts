import { create } from 'zustand'

interface AuthUser {
  id: string
  email: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  login: (token, user) => {
    chrome.runtime.sendMessage({ type: 'SET_TOKEN', token }).catch(console.error)
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_TOKEN' }).catch(console.error)
    set({ token: null, user: null, isAuthenticated: false })
  },
}))
