import { scanFormFields } from '../modules/mapper/formScanner'
import { executeFillPlan } from '../modules/filler/fillOrchestrator'
import { detectCurrentStep } from '../modules/navigator/stepDetector'
import { waitForPageReady } from '../modules/navigator/pageReadyChecker'
import { watchForNewFields } from '../modules/navigator/mutationWatcher'
import { advanceToNextStep } from '../modules/navigator/stepAdvancer'
import { waitForLoginCompletion } from '../modules/navigator/loginWatcher'
import type { FieldMapping, FillResult } from '@workday-ai/shared'

type ContentMessage =
  | { type: 'SCAN_FIELDS' }
  | { type: 'EXECUTE_FILL'; mappings: FieldMapping[]; delayMs?: number }
  | { type: 'GET_STEP' }
  | { type: 'WAIT_READY' }
  | { type: 'AUTO_ADVANCE' }
  | { type: 'WAIT_FOR_LOGIN' }

let cleanupMutationWatcher: (() => void) | null = null

chrome.runtime.onMessage.addListener(
  (message: ContentMessage, _sender, sendResponse) => {
    handleContentMessage(message)
      .then(sendResponse)
      .catch((err: unknown) => {
        const error = err instanceof Error ? err.message : String(err)
        sendResponse({ error })
      })
    return true
  },
)

async function handleContentMessage(message: ContentMessage): Promise<unknown> {
  switch (message.type) {
    case 'SCAN_FIELDS': {
      await waitForPageReady()
      const fields = scanFormFields()
      return { fields }
    }

    case 'EXECUTE_FILL': {
      const results: FillResult[] = await executeFillPlan(
        message.mappings,
        message.delayMs,
      )
      return { results }
    }

    case 'GET_STEP': {
      const step = detectCurrentStep()
      return { step }
    }

    case 'WAIT_READY': {
      await waitForPageReady()
      return { ready: true }
    }

    case 'AUTO_ADVANCE': {
      const { advanced, newStep } = await advanceToNextStep()
      return { advanced, newStep }
    }

    case 'WAIT_FOR_LOGIN': {
      await waitForLoginCompletion()
      return { done: true }
    }
  }
}

// Watch for new fields appearing after step transitions and notify the popup
function startMutationWatcher() {
  if (cleanupMutationWatcher) cleanupMutationWatcher()
  cleanupMutationWatcher = watchForNewFields(() => {
    const step = detectCurrentStep()
    chrome.runtime.sendMessage({ type: 'STEP_CHANGED', step }).catch(() => {
      // Popup may not be open — ignore
    })
    if (step === 'review') {
      chrome.runtime.sendMessage({ type: 'REVIEW_READY' }).catch(() => {})
    }
  })
}

waitForPageReady()
  .then(() => {
    startMutationWatcher()
    const step = detectCurrentStep()
    chrome.runtime.sendMessage({ type: 'STEP_CHANGED', step }).catch(() => {})
    if (step === 'login') {
      chrome.runtime.sendMessage({ type: 'LOGIN_REQUIRED' }).catch(() => {})
    }
  })
  .catch(() => {})
