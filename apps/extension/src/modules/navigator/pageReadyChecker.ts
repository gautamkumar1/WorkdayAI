export function waitForPageReady(timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()

    function isReady(): boolean {
      if (document.readyState !== 'complete') return false

      const loadingById = document.querySelector('[data-automation-id*="loading"]')
      if (loadingById) return false

      const ariaBusy = document.querySelector('[aria-busy="true"]')
      if (ariaBusy) return false

      const progressBar = document.querySelector('[role="progressbar"]')
      if (progressBar) return false

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
