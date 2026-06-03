// Global chrome API stub for all extension tests
if (typeof chrome === 'undefined') {
  ;(globalThis as any).chrome = {
    storage: {
      sync: {
        get: (_keys: string[], callback: (result: any) => void) => callback({}),
        set: () => Promise.resolve(),
      },
      session: {
        get: (_keys: string[], callback: (result: any) => void) => callback({}),
        set: () => Promise.resolve(),
        remove: () => Promise.resolve(),
      },
    },
    runtime: {
      sendMessage: () => Promise.resolve(),
      onMessage: { addListener: () => {}, removeListener: () => {} },
    },
  }
}
