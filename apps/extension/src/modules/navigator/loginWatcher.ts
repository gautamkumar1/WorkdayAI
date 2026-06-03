import { detectCurrentStep } from './stepDetector'

export function isOnLoginStep(): boolean {
  return detectCurrentStep() === 'login'
}

export function waitForLoginCompletion(): Promise<void> {
  return new Promise((resolve, reject) => {
    const maxPolls = 300 // 300 × 1000ms = 5 minutes
    let polls = 0

    const interval = setInterval(() => {
      polls++

      if (detectCurrentStep() !== 'login') {
        clearInterval(interval)
        resolve()
        return
      }

      if (polls >= maxPolls) {
        clearInterval(interval)
        reject(new Error('Login timeout'))
      }
    }, 1000)
  })
}
