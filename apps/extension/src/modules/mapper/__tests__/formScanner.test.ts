// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { scanFormFields } from '../formScanner'

function makeWorkdayField(automationId: string, labelText: string, inputHtml: string): string {
  return `<div data-automation-id="${automationId}"><label>${labelText}</label>${inputHtml}</div>`
}

function inSection(fields: string): string {
  return `<div data-automation-id="applyFlowMyInfoPage">${fields}</div>`
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('scanFormFields — Workday formField containers', () => {
  it('finds text input inside formField container', () => {
    document.body.innerHTML = inSection(
      makeWorkdayField('formField-legalName--firstName', 'First Name', '<input type="text" />'),
    )
    const fields = scanFormFields()
    expect(fields.length).toBeGreaterThan(0)
    expect(fields[0]!.label).toBe('First Name')
    expect(fields[0]!.type).toBe('text')
  })

  it('finds select with options', () => {
    document.body.innerHTML = inSection(
      makeWorkdayField(
        'formField-country',
        'Country',
        '<select><option>India</option><option>United States</option></select>',
      ),
    )
    const fields = scanFormFields()
    expect(fields.length).toBeGreaterThan(0)
    expect(fields[0]!.label).toBe('Country')
    expect(fields[0]!.type).toBe('dropdown')
    expect(fields[0]!.options).toContain('India')
  })

  it('finds radio group', () => {
    document.body.innerHTML = inSection(
      makeWorkdayField(
        'formField-candidateIsPreviousWorker',
        'Have you previously worked here?',
        `<input type="radio" name="candidateIsPreviousWorker"><label>Yes</label>
         <input type="radio" name="candidateIsPreviousWorker"><label>No</label>`,
      ),
    )
    const fields = scanFormFields()
    expect(fields.length).toBeGreaterThan(0)
    expect(fields[0]!.type).toBe('radio')
    expect(fields[0]!.automationId).toBe('candidateIsPreviousWorker')
  })

  it('finds Workday multiselect container', () => {
    document.body.innerHTML = inSection(
      makeWorkdayField(
        'formField-source',
        'How Did You Hear About Us?',
        '<div data-automation-id="multiSelectContainer"><div data-automation-id="multiselectInputContainer"></div></div>',
      ),
    )
    const fields = scanFormFields()
    expect(fields.length).toBeGreaterThan(0)
    expect(fields[0]!.type).toBe('dropdown')
    expect(fields[0]!.automationId).toBe('formField-source')
  })

  it('finds textarea', () => {
    document.body.innerHTML = inSection(
      makeWorkdayField('formField-coverLetter', 'Cover Letter', '<textarea></textarea>'),
    )
    const fields = scanFormFields()
    expect(fields.length).toBeGreaterThan(0)
    expect(fields[0]!.type).toBe('textarea')
  })
})

describe('scanFormFields — skipped elements', () => {
  it('skips navigation chrome containers', () => {
    document.body.innerHTML = `
      <div data-automation-id="header">
        <div data-automation-id="navigationContainer">Nav</div>
      </div>`
    const fields = scanFormFields()
    expect(fields).toHaveLength(0)
  })

  it('skips display:none containers', () => {
    document.body.innerHTML = inSection(`
      <div data-automation-id="formField-hidden" style="display:none">
        <label>Hidden</label><input type="text"/>
      </div>`)
    const fields = scanFormFields()
    expect(fields).toHaveLength(0)
  })

  it('returns all visible form containers', () => {
    document.body.innerHTML = inSection(
      makeWorkdayField('formField-legalName--firstName', 'First Name', '<input type="text"/>') +
        makeWorkdayField('formField-legalName--lastName', 'Last Name', '<input type="text"/>') +
        makeWorkdayField('formField-country', 'Country', '<select><option>India</option></select>'),
    )
    const fields = scanFormFields()
    expect(fields.length).toBe(3)
  })
})
