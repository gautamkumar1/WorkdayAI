chrome.runtime.onInstalled.addListener(() => {
  console.log('WorkdayAI installed')
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Background received message:', message)
  sendResponse({ received: true })
  return true
})
