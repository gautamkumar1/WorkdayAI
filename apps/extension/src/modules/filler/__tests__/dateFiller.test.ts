// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'

// Mock fillTextField so dateFiller tests only exercise normalization logic
vi.mock('../textFiller.js', () => ({
  fillTextField: vi.fn().mockResolvedValue(undefined),
}))

import { fillTextField } from '../textFiller.js'
import { fillDateField } from '../dateFiller.js'

const mockFillTextField = fillTextField as ReturnType<typeof vi.fn>

function makeInput(): HTMLInputElement {
  return document.createElement('input')
}

describe('fillDateField', () => {
  it('converts YYYY-MM-DD to MM/DD/YYYY', async () => {
    const el = makeInput()
    await fillDateField(el, '2020-06-15')
    expect(mockFillTextField).toHaveBeenCalledWith(el, '06/15/2020')
  })

  it('converts "June 2020" to 06/01/2020', async () => {
    const el = makeInput()
    await fillDateField(el, 'June 2020')
    expect(mockFillTextField).toHaveBeenCalledWith(el, '06/01/2020')
  })

  it('passes MM/DD/YYYY through unchanged', async () => {
    const el = makeInput()
    await fillDateField(el, '03/22/1995')
    expect(mockFillTextField).toHaveBeenCalledWith(el, '03/22/1995')
  })

  it('converts "January 1985" to 01/01/1985', async () => {
    const el = makeInput()
    await fillDateField(el, 'January 1985')
    expect(mockFillTextField).toHaveBeenCalledWith(el, '01/01/1985')
  })

  it('converts "December 2023" to 12/01/2023', async () => {
    const el = makeInput()
    await fillDateField(el, 'December 2023')
    expect(mockFillTextField).toHaveBeenCalledWith(el, '12/01/2023')
  })
})
