import type { WorkdayStep } from '@workday-ai/shared'

function hasAutomationId(id: string): boolean {
  return document.querySelector(`[data-automation-id="${id}"]`) !== null
}

function headingContains(text: string): boolean {
  const lower = text.toLowerCase()
  const headings = document.querySelectorAll('h1, h2, h3')
  for (const h of headings) {
    if (h.textContent?.toLowerCase().includes(lower)) return true
  }
  return false
}

export function detectCurrentStep(): WorkdayStep {
  const url = window.location.href

  if (url.includes('/job-details') || hasAutomationId('jobPostingTitle')) {
    return 'job_details'
  }

  if (
    url.includes('/login') ||
    hasAutomationId('signInSubmitButton') ||
    hasAutomationId('createAccount') ||
    headingContains('Sign In') ||
    headingContains('Create Account')
  ) {
    return 'login'
  }

  if (
    url.includes('/myinformation') ||
    url.includes('/my-information') ||
    (url.includes('/application') &&
      (hasAutomationId('legalNameSection') || hasAutomationId('addressSection'))) ||
    hasAutomationId('legalNameSection') ||
    hasAutomationId('addressSection') ||
    hasAutomationId('firstName') ||
    headingContains('My Information')
  ) {
    return 'my_information'
  }

  if (
    url.includes('/experience') ||
    hasAutomationId('workExperienceSection') ||
    headingContains('My Experience')
  ) {
    return 'experience'
  }

  if (url.includes('/education') || hasAutomationId('educationSection')) {
    return 'education'
  }

  if (
    url.includes('/questionnaire') ||
    url.includes('/question') ||
    hasAutomationId('questionnaire') ||
    headingContains('Application Questions')
  ) {
    return 'application_questions'
  }

  if (
    url.includes('/review') ||
    hasAutomationId('submitButton') ||
    hasAutomationId('submit') ||
    headingContains('Review')
  ) {
    return 'review'
  }

  if (url.includes('/complete') || url.includes('/thank-you')) {
    return 'submit'
  }

  return 'unknown'
}
