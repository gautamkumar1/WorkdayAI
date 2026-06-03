export function watchForNewFields(callback: () => void): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const observer = new MutationObserver(() => {
    if (debounceTimer !== null) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(callback, 300)
  })

  observer.observe(document.body, { childList: true, subtree: true })

  return () => {
    if (debounceTimer !== null) clearTimeout(debounceTimer)
    observer.disconnect()
  }
}
