import { describe, it, expect } from 'vitest'
import { cleanResumeText } from '../resumeTextCleaner.js'

describe('cleanResumeText', () => {
  it('collapses multiple blank lines to a single blank line', () => {
    const input = 'Section A\n\n\n\nSection B'
    const result = cleanResumeText(input)
    expect(result).toBe('Section A\n\nSection B')
  })

  it('normalizes \\r\\n line endings to \\n', () => {
    const input = 'Line 1\r\nLine 2\r\nLine 3'
    const result = cleanResumeText(input)
    expect(result).toBe('Line 1\nLine 2\nLine 3')
  })

  it('removes "Page X of Y" page number patterns', () => {
    const input = 'John Doe\nPage 1 of 3\nSoftware Engineer'
    const result = cleanResumeText(input)
    expect(result).not.toMatch(/Page \d+ of \d+/i)
    expect(result).toContain('John Doe')
    expect(result).toContain('Software Engineer')
  })

  it('removes standalone "Confidential" header lines', () => {
    const input = 'Confidential\nJohn Doe\nSoftware Engineer'
    const result = cleanResumeText(input)
    expect(result).not.toMatch(/^Confidential$/m)
    expect(result).toContain('John Doe')
  })

  it('preserves meaningful content intact', () => {
    const input =
      'John Doe\njohn@example.com\n\nExperience\nSoftware Engineer at Acme Corp (2020-2023)'
    const result = cleanResumeText(input)
    expect(result).toContain('John Doe')
    expect(result).toContain('john@example.com')
    expect(result).toContain('Software Engineer at Acme Corp (2020-2023)')
  })

  it('trims leading and trailing whitespace', () => {
    const input = '   \n\nResume Content\n\n   '
    const result = cleanResumeText(input)
    expect(result).toBe('Resume Content')
  })

  it('converts tabs to spaces', () => {
    const input = 'Name:\tJohn Doe'
    const result = cleanResumeText(input)
    expect(result).not.toContain('\t')
    expect(result).toContain('Name:')
    expect(result).toContain('John Doe')
  })
})
