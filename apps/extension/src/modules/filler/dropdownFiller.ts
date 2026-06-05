function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Normalize degree-style values for fuzzy matching:
// "B.Tech in Computer Technology" → "btech", "bachelor of science" → "bachelors", etc.
function normalizeDegree(s: string): string {
  return s
    .toLowerCase()
    .replace(/\bin\b.*/g, '') // strip "in <subject>"
    .replace(/[^a-z0-9]/g, '') // strip punctuation/spaces
    .replace(/^bachelor.*/, 'bachelors')
    .replace(/^master.*/, 'masters')
    .replace(/^btech.*|^be$|^beng.*/, 'btech')
    .replace(/^mtech.*|^me$|^meng.*/, 'mtech')
    .replace(/^phd.*|^doctorate.*/, 'phd')
    .trim()
}

function findOptionInListbox(listbox: HTMLElement, value: string): HTMLElement | null {
  const lower = value.toLowerCase().trim()
  // Exclude disabled placeholder options like "Select One"
  const options = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]')).filter(
    (o) =>
      o.getAttribute('aria-disabled') !== 'true' &&
      o.textContent?.trim().toLowerCase() !== 'select one',
  )
  // 1. Exact match
  for (const o of options) {
    if (o.textContent?.trim().toLowerCase() === lower) return o
  }
  // 2. Starts-with match
  for (const o of options) {
    if (o.textContent?.trim().toLowerCase().startsWith(lower)) return o
  }
  // 3. Contains match
  for (const o of options) {
    if (o.textContent?.trim().toLowerCase().includes(lower)) return o
  }
  // 4. Normalized degree match (handles "B.Tech in Computer Technology" → "BTECH")
  const normValue = normalizeDegree(value)
  for (const o of options) {
    if (normalizeDegree(o.textContent ?? '') === normValue) return o
  }
  return null
}

// Fill button+listbox dropdown (phoneType, countryRegion, degree, etc.)
// Workday uses two patterns — we handle both:
//   A. Options in a listbox that is already in the DOM and populated (toy fixture)
//   B. Listbox appears as a new element OR gets populated after click (real Workday)
function findOpenListbox(): HTMLElement | null {
  // Workday renders the listbox portal outside the container.
  // When open, the wrapper div has visibility="opened" (confirmed from real DOM inspection).
  const byVisibility = document.querySelector<HTMLElement>('[visibility="opened"] [role="listbox"]')
  if (byVisibility) return byVisibility
  // Fallback: any visible listbox with real options
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('[role="listbox"]'))) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && el.querySelectorAll('[role="option"]').length >= 1) return el
  }
  return null
}

async function isButtonListboxOpen(btn: HTMLElement): Promise<boolean> {
  // Check aria-expanded, then fall back to looking for a visible listbox controlled by this button
  if (btn.getAttribute('aria-expanded') === 'true') return true
  const controlsId = btn.getAttribute('aria-controls')
  if (controlsId) {
    const controlled = document.getElementById(controlsId)
    if (controlled) {
      const r = controlled.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    }
  }
  return false
}

async function fillButtonListbox(btn: HTMLElement, value: string): Promise<boolean> {
  btn.scrollIntoView({ block: 'center' })
  await wait(200)
  btn.focus()
  await wait(100)

  // If a different listbox is open, close it first
  const otherOpen = findOpenListbox()
  if (otherOpen && !(await isButtonListboxOpen(btn))) {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
    await wait(300)
  }

  // Only click to open if not already open — btn.click() toggles, so clicking an open dropdown closes it
  const wasOpen = await isButtonListboxOpen(btn)
  if (!wasOpen) {
    btn.click()
    await wait(500)
  }

  // Wait up to 2s for the listbox to appear
  let listbox = findOpenListbox()
  if (!listbox) {
    const deadline = Date.now() + 2000
    while (Date.now() < deadline) {
      listbox = findOpenListbox()
      if (listbox) break
      await wait(100)
    }
  }

  if (!listbox) return false

  // Prefer the listbox specifically controlled by this button over any other open listbox
  const controlsId = btn.getAttribute('aria-controls')
  if (controlsId) {
    const controlled = document.getElementById(controlsId) as HTMLElement | null
    if (controlled) listbox = controlled
  }

  const option = findOptionInListbox(listbox, value)
  if (!option) {
    btn.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
    return false
  }
  option.click()
  await wait(300)
  return true
}

function getVisibleMenuItems(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-automation-id="menuItem"][role="option"]'),
  ).filter((el) => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  })
}

async function waitForMenuItems(timeoutMs = 3000): Promise<HTMLElement[]> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const items = getVisibleMenuItems()
    if (items.length > 0) return items
    await wait(100)
  }
  return []
}

function matchMenuItem(items: HTMLElement[], lower: string): HTMLElement | null {
  for (const o of items) {
    if (o.textContent?.trim().toLowerCase() === lower) return o
  }
  for (const o of items) {
    if (o.textContent?.trim().toLowerCase().startsWith(lower)) return o
  }
  for (const o of items) {
    if (o.textContent?.trim().toLowerCase().includes(lower)) return o
  }
  return null
}

// Fill a Workday multiselect that opens with multiselectInputContainer.
// Handles two cases:
//   1. Flat list (countryPhoneCode): options are direct menuItems, click matching one
//   2. Chevron categories (source field): categories drill into sub-lists
async function fillMultiselectChevron(container: HTMLElement, value: string): Promise<boolean> {
  const inputArea = container.querySelector<HTMLElement>(
    '[data-automation-id="multiselectInputContainer"]',
  )
  if (!inputArea) return false

  // If already has the correct value selected, skip (don't overwrite)
  const selectedItem = container.querySelector('[data-automation-id="selectedItem"]')
  if (selectedItem) {
    const currentVal = selectedItem.textContent?.trim().toLowerCase() ?? ''
    if (currentVal === value.toLowerCase() || currentVal.includes(value.toLowerCase())) {
      return true // already correct
    }
  }

  inputArea.click()
  await wait(500)

  const lower = value.toLowerCase()
  let topItems = await waitForMenuItems(2000)
  if (topItems.length === 0) return false

  // 1. Direct match at top level (handles flat lists like countryPhoneCode)
  const direct = matchMenuItem(topItems, lower)
  if (direct) {
    const p = direct.querySelector<HTMLElement>('[data-automation-id="promptOption"]') ?? direct
    p.click()
    await wait(300)
    return true
  }

  // 2. Chevron drill-down (handles source field with categories)
  for (const cat of topItems) {
    const catPrompt = cat.querySelector<HTMLElement>('[data-automation-id="promptOption"]') ?? cat
    const beforeIds = getVisibleMenuItems()
      .map((el) => el.id)
      .join(',')
    catPrompt.click()
    await wait(600)

    const subItems = getVisibleMenuItems()
    const afterIds = subItems.map((el) => el.id).join(',')

    if (afterIds !== beforeIds && subItems.length > 0) {
      const subMatch = matchMenuItem(subItems, lower)
      const toClick = subMatch ?? subItems[0]!
      const p = toClick.querySelector<HTMLElement>('[data-automation-id="promptOption"]') ?? toClick
      p.click()
      await wait(300)
      return true
    }

    // Navigate back
    const backBtn =
      document.querySelector<HTMLElement>('[data-automation-id="bottomNavigationBackButton"]') ??
      document.querySelector<HTMLElement>('[data-automation-id="navigationBack"]')
    if (backBtn) {
      backBtn.click()
      await wait(400)
      topItems = await waitForMenuItems(1000)
    } else {
      inputArea.click()
      await wait(400)
      topItems = await waitForMenuItems(1000)
    }
  }

  return false
}

function fillNativeSelect(select: HTMLSelectElement, value: string): boolean {
  const lower = value.toLowerCase()
  let matchIndex = -1
  // Exact match
  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i]!.text.toLowerCase() === lower) {
      matchIndex = i
      break
    }
  }
  // Partial match
  if (matchIndex === -1) {
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i]!.text.toLowerCase().includes(lower)) {
        matchIndex = i
        break
      }
    }
  }
  if (matchIndex === -1) return false

  // Use the React nativeInputValueSetter so React's synthetic onChange fires correctly.
  // Setting .selectedIndex directly bypasses React's internal state tracking.
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
  if (nativeSetter) {
    nativeSetter.call(select, select.options[matchIndex]!.value)
  } else {
    select.selectedIndex = matchIndex
  }
  select.dispatchEvent(new Event('input', { bubbles: true }))
  select.dispatchEvent(new Event('change', { bubbles: true }))
  return true
}

export async function fillDropdown(element: HTMLElement, value: string): Promise<boolean> {
  // 1. Element is directly a native <select>
  if (element instanceof HTMLSelectElement) {
    return fillNativeSelect(element, value)
  }

  // 2. Container has a visible native <select> inside
  // Only take this path if the select is actually rendered (not a hidden accessibility shim).
  // Workday sometimes injects a display:none <select> alongside its custom button+listbox widget.
  const innerSelect = element.querySelector<HTMLSelectElement>('select')
  if (innerSelect) {
    const style = window.getComputedStyle(innerSelect)
    const isVisible =
      style.display !== 'none' && style.visibility !== 'hidden' && innerSelect.offsetParent !== null
    if (isVisible) {
      return fillNativeSelect(innerSelect, value)
    }
  }

  // 3. Multiselect with chevron categories (formField-source / "How Did You Hear About Us")
  const multiselectInput = element.querySelector<HTMLElement>(
    '[data-automation-id="multiselectInputContainer"]',
  )
  if (multiselectInput) {
    return fillMultiselectChevron(element, value)
  }

  // 4. Button+listbox dropdown (formField-phoneType, formField-countryRegion, etc.)
  const btn =
    element.querySelector<HTMLElement>('button[aria-haspopup="listbox"]') ??
    element.querySelector<HTMLElement>('button')
  if (btn) {
    return fillButtonListbox(btn, value)
  }

  return false
}
