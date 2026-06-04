type GetTokenMessage = { type: 'GET_TOKEN' }
type SetTokenMessage = { type: 'SET_TOKEN'; token: string }
type ClearTokenMessage = { type: 'CLEAR_TOKEN' }
type ApiRequestMessage = {
  type: 'API_REQUEST'
  url: string
  method: string
  body?: unknown
  token?: string
}

type StepChangedMessage = { type: 'STEP_CHANGED'; step: string }

type ExtensionMessage =
  | GetTokenMessage
  | SetTokenMessage
  | ClearTokenMessage
  | ApiRequestMessage
  | StepChangedMessage

chrome.runtime.onInstalled.addListener(() => {
  // eslint-disable-next-line no-console
  console.log('WorkdayAI extension installed')
})

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err: unknown) => {
      const error = err instanceof Error ? err.message : String(err)
      sendResponse({ error })
    })
  return true
})

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  switch (message.type) {
    case 'GET_TOKEN': {
      const result = await chrome.storage.local.get(['token'])
      return { token: (result['token'] as string | undefined) ?? null }
    }

    case 'SET_TOKEN': {
      await chrome.storage.local.set({ token: message.token })
      return { success: true }
    }

    case 'CLEAR_TOKEN': {
      await chrome.storage.local.remove(['token'])
      return { success: true }
    }

    case 'API_REQUEST': {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (message.token) {
        headers['Authorization'] = `Bearer ${message.token}`
      }

      const init: RequestInit = {
        method: message.method,
        headers,
      }
      if (message.body !== undefined) {
        init.body = JSON.stringify(message.body)
      }

      const res = await fetch(message.url, init)
      const data: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        return { error: `HTTP ${res.status}`, status: res.status, data }
      }
      return { data, status: res.status }
    }

    case 'STEP_CHANGED':
      // Forward to popup if open; best-effort
      return { received: true }
  }
}
