// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  findFieldByAutomationId,
  findFieldByAriaLabel,
  findFieldByLabel,
} from '../fieldFinder'

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('findFieldByAutomationId', () => {
  it('returns element with exact data-automation-id match', () => {
    document.body.innerHTML = '<input data-automation-id="firstName" />'
    const el = findFieldByAutomationId('firstName')
    expect(el).not.toBeNull()
    expect(el?.getAttribute('data-automation-id')).toBe('firstName')
  })

  it('returns element with partial data-automation-id match when exact not found', () => {
    document.body.innerHTML = '<input data-automation-id="firstNameInput" />'
    const el = findFieldByAutomationId('firstName')
    expect(el).not.toBeNull()
  })

  it('returns null when no matching element exists', () => {
    document.body.innerHTML = '<input data-automation-id="lastName" />'
    const el = findFieldByAutomationId('email')
    expect(el).toBeNull()
  })
})

describe('findFieldByAriaLabel', () => {
  it('returns element with matching aria-label (case-insensitive)', () => {
    document.body.innerHTML = '<input aria-label="First Name" />'
    expect(findFieldByAriaLabel('first name')).not.toBeNull()
    expect(findFieldByAriaLabel('FIRST NAME')).not.toBeNull()
    expect(findFieldByAriaLabel('First Name')).not.toBeNull()
  })

  it('returns null when no aria-label matches', () => {
    document.body.innerHTML = '<input aria-label="Last Name" />'
    expect(findFieldByAriaLabel('email')).toBeNull()
  })
})

describe('findFieldByLabel', () => {
  it('finds field via label[for] association', () => {
    document.body.innerHTML = `
      <label for="emailField">Email</label>
      <input id="emailField" type="email" />
    `
    const el = findFieldByLabel('Email')
    expect(el).not.toBeNull()
    expect((el as HTMLInputElement).id).toBe('emailField')
  })

  it('finds field via aria-label (case-insensitive)', () => {
    document.body.innerHTML = '<input aria-label="Phone Number" />'
    const el = findFieldByLabel('phone number')
    expect(el).not.toBeNull()
  })

  it('returns null when no match found', () => {
    document.body.innerHTML = '<input placeholder="something unrelated" />'
    const el = findFieldByLabel('Nonexistent Label')
    expect(el).toBeNull()
  })

  it('strips trailing asterisk from label text when matching', () => {
    document.body.innerHTML = `
      <label for="reqField">Required Field *</label>
      <input id="reqField" />
    `
    const el = findFieldByLabel('Required Field')
    expect(el).not.toBeNull()
  })
})
