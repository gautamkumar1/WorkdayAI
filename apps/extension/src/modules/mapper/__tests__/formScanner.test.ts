// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { scanFormFields } from '../formScanner'

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('scanFormFields — basic field detection', () => {
  it('finds visible text input', () => {
    document.body.innerHTML = '<input type="text" aria-label="First Name" />'
    const fields = scanFormFields()
    expect(fields.some((f) => f.label === 'First Name')).toBe(true)
  })

  it('finds select with options', () => {
    document.body.innerHTML = `
      <select aria-label="Country">
        <option>United States</option>
        <option>Canada</option>
      </select>`
    const fields = scanFormFields()
    const field = fields.find((f) => f.label === 'Country')
    expect(field).toBeDefined()
    expect(field?.options).toContain('United States')
    expect(field?.options).toContain('Canada')
  })

  it('finds textarea', () => {
    document.body.innerHTML = '<textarea aria-label="Cover Letter"></textarea>'
    const fields = scanFormFields()
    expect(fields.some((f) => f.label === 'Cover Letter')).toBe(true)
  })

  it('finds field via label[for] association', () => {
    document.body.innerHTML = `
      <label for="email-input">Email Address</label>
      <input id="email-input" type="email" />`
    const fields = scanFormFields()
    expect(fields.some((f) => f.label === 'Email Address')).toBe(true)
  })

  it('finds field via aria-labelledby', () => {
    document.body.innerHTML = `
      <div id="lbl-phone">Phone Number</div>
      <input type="tel" aria-labelledby="lbl-phone" />`
    const fields = scanFormFields()
    expect(fields.some((f) => f.label === 'Phone Number')).toBe(true)
  })

  it('finds Workday-style data-automation-id field', () => {
    document.body.innerHTML = '<input data-automation-id="firstName" aria-label="First Name" />'
    const fields = scanFormFields()
    expect(fields.length).toBeGreaterThan(0)
  })
})

describe('scanFormFields — skipped elements', () => {
  it('skips disabled fields', () => {
    document.body.innerHTML = '<input type="text" aria-label="Disabled Field" disabled />'
    const fields = scanFormFields()
    expect(fields.find((f) => f.label === 'Disabled Field')).toBeUndefined()
  })

  it('skips hidden input type', () => {
    document.body.innerHTML = '<input type="hidden" name="csrf_token" value="abc" />'
    const fields = scanFormFields()
    expect(fields.find((f) => (f as any).name === 'csrf_token')).toBeUndefined()
  })

  it('skips already-filled fields (data-wai-filled)', () => {
    document.body.innerHTML = '<input type="text" aria-label="Name" data-wai-filled="true" />'
    const fields = scanFormFields()
    expect(fields.find((f) => f.label === 'Name')).toBeUndefined()
  })

  it('does not duplicate the same element', () => {
    document.body.innerHTML = `
      <input data-automation-id="email" aria-label="Email" type="email" />`
    const fields = scanFormFields()
    const emailFields = fields.filter((f) => f.label === 'Email')
    expect(emailFields.length).toBe(1)
  })
})

describe('scanFormFields — multiple fields', () => {
  it('returns all visible form fields in a typical form', () => {
    document.body.innerHTML = `
      <form>
        <label for="fn">First Name</label><input id="fn" type="text" />
        <label for="ln">Last Name</label><input id="ln" type="text" />
        <label for="em">Email</label><input id="em" type="email" />
        <label for="ph">Phone</label><input id="ph" type="tel" />
        <select aria-label="Country">
          <option>US</option>
        </select>
      </form>`
    const fields = scanFormFields()
    expect(fields.length).toBeGreaterThanOrEqual(5)
  })
})
