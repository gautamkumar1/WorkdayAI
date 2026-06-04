// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { detectCurrentStep } from '../stepDetector'

function setHref(url: string) {
  Object.defineProperty(window, 'location', {
    value: { href: url },
    writable: true,
    configurable: true,
  })
}

function clearBody() {
  document.body.innerHTML = ''
}

beforeEach(() => {
  clearBody()
  setHref('https://example.wd5.myworkdayjobs.com/jobs')
})

describe('detectCurrentStep', () => {
  it('detects login when URL contains /login', () => {
    setHref('https://example.myworkday.com/login')
    expect(detectCurrentStep()).toBe('login')
  })

  it('detects my_information when DOM has contactInformationPage section', () => {
    setHref('https://example.myworkday.com/apply/step')
    document.body.innerHTML = '<div data-automation-id="contactInformationPage"></div>'
    expect(detectCurrentStep()).toBe('my_information')
  })

  it('returns unknown for unrecognized URL and DOM', () => {
    setHref('https://example.myworkday.com/some-other-page')
    document.body.innerHTML = '<div>nothing here</div>'
    expect(detectCurrentStep()).toBe('unknown')
  })

  it('detects job_details when URL contains /job-details', () => {
    setHref('https://example.myworkday.com/job-details/123')
    expect(detectCurrentStep()).toBe('job_details')
  })

  it('detects experience when DOM has myExperiencePage section', () => {
    setHref('https://example.myworkday.com/apply/step')
    document.body.innerHTML = '<div data-automation-id="myExperiencePage"></div>'
    expect(detectCurrentStep()).toBe('experience')
  })

  it('detects submit when URL contains /thank-you', () => {
    setHref('https://example.myworkday.com/thank-you')
    expect(detectCurrentStep()).toBe('submit')
  })
})
