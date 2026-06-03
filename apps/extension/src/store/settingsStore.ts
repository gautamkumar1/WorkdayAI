import { create } from 'zustand'

interface SettingsState {
  apiBaseUrl: string
  fillDelay: number
  autoAdvance: boolean
  debugMode: boolean
  updateSettings: (partial: Partial<Omit<SettingsState, 'updateSettings'>>) => void
}

const DEFAULTS: Omit<SettingsState, 'updateSettings'> = {
  apiBaseUrl: 'http://localhost:3000',
  fillDelay: 200,
  autoAdvance: true,
  debugMode: false,
}

function omitUpdateSettings(state: SettingsState): Omit<SettingsState, 'updateSettings'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { updateSettings: _fn, ...rest } = state
  return rest
}

export const useSettingsStore = create<SettingsState>((set) => {
  // Load persisted settings from chrome.storage.sync on startup
  chrome.storage.sync.get(['settings'], (result) => {
    const saved = result['settings'] as Partial<Omit<SettingsState, 'updateSettings'>> | undefined
    if (saved) {
      set(saved)
    }
  })

  return {
    ...DEFAULTS,

    updateSettings: (partial) => {
      set((state) => {
        const next = { ...state, ...partial }
        chrome.storage.sync.set({ settings: omitUpdateSettings(next) }).catch(console.error)
        return partial
      })
    },
  }
})

// Persist all state changes to chrome.storage.sync
useSettingsStore.subscribe((state) => {
  chrome.storage.sync.set({ settings: omitUpdateSettings(state) }).catch(console.error)
})
