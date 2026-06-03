import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSettingsStore } from '../settingsStore'

beforeEach(() => {
  useSettingsStore.setState({
    apiBaseUrl: 'http://localhost:3000',
    fillDelay: 200,
    autoAdvance: true,
    debugMode: false,
  })
  vi.clearAllMocks()
})

describe('settingsStore', () => {
  it('has correct defaults', () => {
    const state = useSettingsStore.getState()
    expect(state.apiBaseUrl).toBe('http://localhost:3000')
    expect(state.fillDelay).toBe(200)
    expect(state.autoAdvance).toBe(true)
    expect(state.debugMode).toBe(false)
  })

  it('updateSettings patches individual fields', () => {
    useSettingsStore.getState().updateSettings({ debugMode: true, fillDelay: 500 })
    const state = useSettingsStore.getState()
    expect(state.debugMode).toBe(true)
    expect(state.fillDelay).toBe(500)
    expect(state.autoAdvance).toBe(true) // unchanged
  })

  it('updateSettings calls chrome.storage.sync.set', () => {
    const setSpy = vi.spyOn(chrome.storage.sync, 'set').mockResolvedValue(undefined)
    useSettingsStore.getState().updateSettings({ apiBaseUrl: 'https://api.example.com' })
    expect(setSpy).toHaveBeenCalled()
  })
})
