// Global chrome API stub for all extension tests
if (typeof chrome === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).chrome = {
    storage: {
      local: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get: (_keys: string[], callback: (result: any) => void) => callback({}),
        set: () => Promise.resolve(),
        remove: () => Promise.resolve(),
      },
      sync: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get: (_keys: string[], callback: (result: any) => void) => callback({}),
        set: () => Promise.resolve(),
        remove: () => Promise.resolve(),
      },
      session: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
