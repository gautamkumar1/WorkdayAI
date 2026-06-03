const STYLE_ID = 'wai-highlight-styles'

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    [data-wai-highlight="success"] { outline: 2px solid #22c55e !important; outline-offset: 1px; }
    [data-wai-highlight="error"]   { outline: 2px solid #ef4444 !important; outline-offset: 1px; }
    [data-wai-highlight="pending"] { outline: 2px solid #3b82f6 !important; outline-offset: 1px; }
  `
  document.head.appendChild(style)
}

export function highlightField(element: Element, type: 'success' | 'error' | 'pending'): void {
  injectStyles()
  element.setAttribute('data-wai-highlight', type)
}

export function clearHighlight(element: Element): void {
  element.removeAttribute('data-wai-highlight')
}

export function clearAllHighlights(): void {
  const highlighted = document.querySelectorAll('[data-wai-highlight]')
  for (const el of highlighted) {
    el.removeAttribute('data-wai-highlight')
  }
}
