export async function fillTextField(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): Promise<void> {
  const proto =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype

  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  const nativeInputValueSetter = descriptor?.set

  if (!nativeInputValueSetter) {
    throw new Error('Could not retrieve native value setter')
  }

  nativeInputValueSetter.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
  element.dispatchEvent(new Event('blur', { bubbles: true }))
}
