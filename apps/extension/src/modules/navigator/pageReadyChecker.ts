export function waitForPageReady(timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()

    function isReady(): boolean {
      if (document.readyState !== 'complete') return false

      const loadingById = document.querySelector('[data-automation-id*="loading"]')
      if (loadingById) return false

      const ariaBusy = document.querySelector('[aria-busy="true"]')
      if (ariaBusy) return false

      // Only block on progress bars that are actively loading (aria-valuenow changing or indeterminate)
      // The Workday step progress bar is always present but has fixed aria-valuenow — don't block on it.
      const progressBars = document.querySelectorAll('[role="progressbar"]')
      for (const pb of progressBars) {
        // A loading spinner has no aria-valuenow, or aria-valuemax equals aria-valuenow while animating
        const valueNow = pb.getAttribute('aria-valuenow')
        const valueMax = pb.getAttribute('aria-valuemax')
        // If it has no valuenow it's an indeterminate spinner (truly loading)
        if (valueNow === null && valueMax === null) return false
      }

      return true
    }

    if (isReady()) {
      resolve()
      return
    }

    const interval = setInterval(() => {
      if (isReady()) {
        clearInterval(interval)
        resolve()
        return
      }

      if (Date.now() - start >= timeoutMs) {
        clearInterval(interval)
        reject(new Error(`waitForPageReady timed out after ${timeoutMs}ms`))
      }
    }, 100)
  })
}
