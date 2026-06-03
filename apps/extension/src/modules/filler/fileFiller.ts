export async function fillFileInput(element: HTMLInputElement, file: File): Promise<void> {
  const dt = new DataTransfer()
  dt.items.add(file)
  element.files = dt.files
  element.dispatchEvent(new Event('change', { bubbles: true }))
}
