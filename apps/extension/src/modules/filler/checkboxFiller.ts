export async function fillCheckbox(element: HTMLInputElement, checked: boolean): Promise<void> {
  if (element.checked !== checked) {
    element.click()
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }
}
