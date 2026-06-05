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
  | { type: 'DEBUG_SCAN' }
  | { type: 'DEBUG_DROPDOWN' }

let cleanupMutationWatcher: (() => void) | null = null

chrome.runtime.onMessage.addListener((message: ContentMessage, _sender, sendResponse) => {
  handleContentMessage(message)
    .then(sendResponse)
    .catch((err: unknown) => {
      const error = err instanceof Error ? err.message : String(err)
      sendResponse({ error })
    })
  return true
})

async function handleContentMessage(message: ContentMessage): Promise<unknown> {
  switch (message.type) {
    case 'SCAN_FIELDS': {
      await waitForPageReady()
      const fields = scanFormFields()
      return { fields }
    }

    case 'EXECUTE_FILL': {
      const results: FillResult[] = await executeFillPlan(message.mappings, message.delayMs)
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

    case 'DEBUG_DROPDOWN': {
      // Find the source/referral field container and click it open, then dump DOM
      const sourceContainer =
        document.querySelector<HTMLElement>('[data-automation-id="formField-source"]') ??
        document.querySelector<HTMLElement>('[data-automation-id="formField-referral"]')

      if (!sourceContainer) {
        return {
          error: 'source container not found',
          allFormFields: Array.from(
            document.querySelectorAll('[data-automation-id^="formField-"]'),
          ).map((e) => e.getAttribute('data-automation-id')),
        }
      }

      // Click the trigger
      const trigger =
        sourceContainer.querySelector<HTMLElement>('button, [role="button"], input') ??
        sourceContainer
      trigger.click()
      await new Promise((r) => setTimeout(r, 600))

      // Dump everything visible in the popup
      const popup = document
        .querySelector(
          '[data-automation-id="responsiveMonikerPrompt"], [role="listbox"], [data-automation-id="promptOption"]',
        )
        ?.closest('[data-automation-id]')
      const allVisible = Array.from(
        document.querySelectorAll(
          '[role="option"], [data-automation-id="promptOption"], [data-automation-id="menuItem"]',
        ),
      ).map((e) => ({
        tag: e.tagName,
        aid: e.getAttribute('data-automation-id'),
        role: e.getAttribute('role'),
        text: e.textContent?.trim().slice(0, 80),
        html: e.outerHTML.slice(0, 300),
      }))

      const popupHtml = popup?.innerHTML?.slice(0, 3000) ?? 'no popup found'

      // Dump all data-automation-ids currently visible
      const allIds = Array.from(document.querySelectorAll('[data-automation-id]'))
        .filter((e) => {
          const r = e.getBoundingClientRect()
          return r.width > 0 && r.height > 0
        })
        .map((e) => ({
          aid: e.getAttribute('data-automation-id'),
          tag: e.tagName,
          text: e.textContent?.trim().slice(0, 40),
        }))

      return {
        options: allVisible,
        popupHtml: popupHtml.slice(0, 2000),
        allIds: allIds.slice(0, 50),
      }
    }

    case 'DEBUG_SCAN': {
      // Dump all data-automation-id values on the page so we can see the real IDs
      const allEls = Array.from(document.querySelectorAll('[data-automation-id]'))
      const ids = allEls.map((el) => ({
        id: el.getAttribute('data-automation-id'),
        tag: el.tagName,
        text: el.textContent?.trim().slice(0, 60),
      }))
      const scanned = scanFormFields()
      return { ids, scanned }
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
