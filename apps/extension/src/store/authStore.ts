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
  rehydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  login: (token, user) => {
    chrome.storage.local.set({ token, authUser: user }).catch(console.error)
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    chrome.storage.local.remove(['token', 'authUser']).catch(console.error)
    set({ token: null, user: null, isAuthenticated: false })
  },

  rehydrate: async () => {
    const result = await chrome.storage.local.get(['token', 'authUser'])
    const token = result['token'] as string | undefined
    const user = result['authUser'] as AuthUser | undefined
    if (token && user) {
      set({ token, user, isAuthenticated: true })
    }
  },
}))
