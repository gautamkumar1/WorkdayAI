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
  | { type: 'UPLOAD_RESUME'; fileName: string; mimeType: string; base64: string }
  | { type: 'DEBUG_SCAN' }
  | { type: 'DEBUG_DROPDOWN' }
  | { type: 'DEBUG_DEGREE' }

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

    case 'UPLOAD_RESUME': {
      const input = document.querySelector<HTMLInputElement>(
        'input[data-automation-id="file-upload-input-ref"]',
      )
      if (!input) return { success: false, error: 'file input not found' }
      const bytes = Uint8Array.from(atob(message.base64), (c) => c.charCodeAt(0))
      const file = new File([bytes], message.fileName, { type: message.mimeType })
      const dt = new DataTransfer()
      dt.items.add(file)
      input.files = dt.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
      return { success: true }
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

    case 'DEBUG_DEGREE': {
      // Find the degree container and dump its full DOM + what happens when opened
      const degreeContainer =
        document.querySelector<HTMLElement>('[data-automation-id="formField-degree"]') ??
        document.querySelector<HTMLElement>('[data-automation-id*="degree"]')

      if (!degreeContainer) {
        return {
          error: 'degree container not found',
          allFormFields: Array.from(
            document.querySelectorAll('[data-automation-id^="formField-"]'),
          ).map((e) => e.getAttribute('data-automation-id')),
        }
      }

      const containerHtml = degreeContainer.outerHTML.slice(0, 3000)

      // Check inner select
      const innerSelect = degreeContainer.querySelector('select')
      const selectInfo = innerSelect
        ? {
            exists: true,
            display: window.getComputedStyle(innerSelect).display,
            visibility: window.getComputedStyle(innerSelect).visibility,
            offsetParent: innerSelect.offsetParent !== null,
            optionCount: innerSelect.options.length,
            options: Array.from(innerSelect.options).map((o) => ({ value: o.value, text: o.text })),
          }
        : { exists: false }

      // Check button
      const btn =
        degreeContainer.querySelector<HTMLElement>('button[aria-haspopup="listbox"]') ??
        degreeContainer.querySelector<HTMLElement>('button[aria-haspopup="true"]') ??
        degreeContainer.querySelector<HTMLElement>('button')
      const btnInfo = btn
        ? {
            exists: true,
            ariaHasPopup: btn.getAttribute('aria-haspopup'),
            ariaExpanded: btn.getAttribute('aria-expanded'),
            automationId: btn.getAttribute('data-automation-id'),
            text: btn.textContent?.trim(),
          }
        : { exists: false }

      // Click the button and wait to see listbox
      if (btn) {
        btn.scrollIntoView({ block: 'center' })
        await new Promise((r) => setTimeout(r, 200))
        btn.focus()
        await new Promise((r) => setTimeout(r, 100))
        btn.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
        )
        await new Promise((r) => setTimeout(r, 800))
      }

      // Now dump everything that appeared
      const listboxes = Array.from(document.querySelectorAll('[role="listbox"]')).map((el) => ({
        aid: el.getAttribute('data-automation-id'),
        visibility: window.getComputedStyle(el as HTMLElement).visibility,
        display: window.getComputedStyle(el as HTMLElement).display,
        optionCount: el.querySelectorAll('[role="option"]').length,
        options: Array.from(el.querySelectorAll('[role="option"]'))
          .slice(0, 10)
          .map((o) => o.textContent?.trim()),
        html: el.outerHTML.slice(0, 500),
      }))

      const visibilityOpened = document
        .querySelector('[visibility="opened"]')
        ?.outerHTML?.slice(0, 500)

      return {
        containerHtml,
        selectInfo,
        btnInfo,
        listboxes,
        visibilityOpened: visibilityOpened ?? 'none',
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
