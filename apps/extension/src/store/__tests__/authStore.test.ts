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

  it('login persists token to chrome.storage.local', () => {
    const spy = vi.spyOn(chrome.storage.local, 'set').mockResolvedValue(undefined)
    useAuthStore.getState().login('tok-xyz', { id: 'u2', email: 'x@y.com' })
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ token: 'tok-xyz' }))
  })

  it('logout clears state', () => {
    useAuthStore.getState().login('tok-abc', { id: 'u1', email: 'a@b.com' })
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
  })

  it('logout removes token from chrome.storage.local', () => {
    const spy = vi.spyOn(chrome.storage.local, 'remove').mockResolvedValue(undefined)
    useAuthStore.getState().logout()
    expect(spy).toHaveBeenCalledWith(['token', 'authUser'])
  })
})
