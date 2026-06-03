import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../authStore'

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false })
})

describe('authStore', () => {
  it('starts unauthenticated', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
  })

  it('login sets token, user, and isAuthenticated', () => {
    useAuthStore.getState().login('tok-abc', { id: 'u1', email: 'a@b.com' })
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.token).toBe('tok-abc')
    expect(state.user?.email).toBe('a@b.com')
  })

  it('login sends SET_TOKEN message to background', () => {
    const spy = vi.spyOn(chrome.runtime, 'sendMessage').mockResolvedValue(undefined)
    useAuthStore.getState().login('tok-xyz', { id: 'u2', email: 'x@y.com' })
    expect(spy).toHaveBeenCalledWith({ type: 'SET_TOKEN', token: 'tok-xyz' })
  })

  it('logout clears state', () => {
    useAuthStore.getState().login('tok-abc', { id: 'u1', email: 'a@b.com' })
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
  })

  it('logout sends CLEAR_TOKEN message to background', () => {
    const spy = vi.spyOn(chrome.runtime, 'sendMessage').mockResolvedValue(undefined)
    useAuthStore.getState().logout()
    expect(spy).toHaveBeenCalledWith({ type: 'CLEAR_TOKEN' })
  })
})
