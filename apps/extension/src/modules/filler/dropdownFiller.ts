function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Wait for a NEW [role="listbox"] that wasn't present before clicking.
// Proven pattern from aRustyDev/forge workday plugin.
function waitForNewListbox(
  existingListboxes: Set<Element>,
  timeoutMs = 3000,
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const find = (): HTMLElement | null => {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('[role="listbox"]'))) {
        if (!existingListboxes.has(el)) return el
      }
      return null
    }
    const found = find()
    if (found) {
      resolve(found)
      return
    }
    const start = Date.now()
    const id = setInterval(() => {
      const el = find()
      if (el) {
        clearInterval(id)
        resolve(el)
        return
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(id)
        resolve(null)
      }
    }, 50)
  })
}

function findOptionInListbox(listbox: HTMLElement, value: string): HTMLElement | null {
  const lower = value.toLowerCase().trim()
  const options = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'))
  for (const o of options) {
    if (o.textContent?.trim().toLowerCase() === lower) return o
  }
  for (const o of options) {
    if (o.textContent?.trim().toLowerCase().startsWith(lower)) return o
  }
  for (const o of options) {
    if (o.textContent?.trim().toLowerCase().includes(lower)) return o
  }
  return null
}

// Fill button+listbox dropdown (phoneType, countryRegion, country).
// Pattern: snapshot listboxes → click button → wait for NEW listbox → click option.
async function fillButtonListbox(btn: HTMLElement, value: string): Promise<boolean> {
  const existingListboxes = new Set(Array.from(document.querySelectorAll('[role="listbox"]')))
  btn.click()
  const listbox = await waitForNewListbox(existingListboxes, 3000)
  if (!listbox) return false
  const option = findOptionInListbox(listbox, value)
  if (!option) {
    btn.click() // close
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

export async function fillDropdown(element: HTMLElement, value: string): Promise<boolean> {
  // Native <select>
  if (element instanceof HTMLSelectElement) {
    const lower = value.toLowerCase()
    for (let i = 0; i < element.options.length; i++) {
      if (element.options[i]!.text.toLowerCase() === lower) {
        element.selectedIndex = i
        element.dispatchEvent(new Event('change', { bubbles: true }))
        return true
      }
    }
    for (let i = 0; i < element.options.length; i++) {
      if (element.options[i]!.text.toLowerCase().includes(lower)) {
        element.selectedIndex = i
        element.dispatchEvent(new Event('change', { bubbles: true }))
        return true
      }
    }
    return false
  }

  // Multiselect with chevron categories (formField-source / "How Did You Hear About Us").
  const multiselectInput = element.querySelector<HTMLElement>(
    '[data-automation-id="multiselectInputContainer"]',
  )
  if (multiselectInput) {
    return fillMultiselectChevron(element, value)
  }

  // Button+listbox dropdown (formField-phoneType, formField-countryRegion, etc.)
  const btn =
    element.querySelector<HTMLElement>('button[aria-haspopup="listbox"]') ??
    element.querySelector<HTMLElement>('button')
  if (btn) {
    return fillButtonListbox(btn, value)
  }

  return false
}
