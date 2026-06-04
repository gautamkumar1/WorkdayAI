export async function fillRadio(groupName: string, value: string): Promise<boolean> {
  const lower = value.toLowerCase()

  // Strategy 1: find by name attribute + label match
  const byName = document.querySelectorAll<HTMLInputElement>(
    `input[type="radio"][name="${groupName}"]`,
  )
  for (const radio of byName) {
    const label = radio.labels?.[0]?.textContent?.trim().toLowerCase()
    const ariaLabel = radio.getAttribute('aria-label')?.toLowerCase()
    if (label === lower || ariaLabel === lower) {
      radio.click()
      return true
    }
  }

  // Strategy 2: data-automation-id containing groupName
  const byAutomation = document.querySelectorAll<HTMLInputElement>(
    `input[type="radio"][data-automation-id*="${groupName}"]`,
  )
  for (const radio of byAutomation) {
    const ariaLabel = radio.getAttribute('aria-label')?.toLowerCase()
    if (ariaLabel === lower) {
      radio.click()
      return true
    }
  }

  // Strategy 3 (Workday): find the question label div, then find sibling radios
  // Workday renders radios as: <div>[question label]</div> <div><input type=radio/><label>Yes</label>...
  const allLabels = document.querySelectorAll<Element>('[data-automation-id$="Label"], label, div')
  for (const labelEl of allLabels) {
    const text = labelEl.textContent?.replace(/\*/g, '').trim().toLowerCase() ?? ''
    if (text === groupName.toLowerCase() || text.includes(groupName.toLowerCase().slice(0, 20))) {
      // Look for radio inputs near this label
      const container =
        labelEl.closest('div[data-automation-id], fieldset, [role="group"]') ??
        labelEl.parentElement?.parentElement
      if (container) {
        const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]')
        for (const radio of radios) {
          const radioLabel =
            radio.labels?.[0]?.textContent?.trim().toLowerCase() ??
            radio.nextElementSibling?.textContent?.trim().toLowerCase() ??
            radio.getAttribute('aria-label')?.toLowerCase()
          if (radioLabel === lower) {
            radio.click()
            return true
          }
        }
      }
    }
  }

  // Strategy 4: scan ALL radios on page, match by adjacent label text
  const allRadios = document.querySelectorAll<HTMLInputElement>('input[type="radio"]')
  for (const radio of allRadios) {
    const labelText = (
      radio.labels?.[0]?.textContent?.trim() ??
      radio.nextElementSibling?.textContent?.trim() ??
      radio.getAttribute('aria-label') ??
      ''
    ).toLowerCase()
    if (labelText === lower) {
      radio.click()
      return true
    }
  }

  return false
}
