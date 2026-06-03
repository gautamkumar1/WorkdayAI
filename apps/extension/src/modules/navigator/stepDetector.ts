import type { WorkdayStep } from '@workday-ai/shared'

function hasAutomationId(id: string): boolean {
  return document.querySelector(`[data-automation-id="${id}"]`) !== null
}

function headingContainsText(text: string): boolean {
  const headings = document.querySelectorAll('h1, h2, h3')
  for (const h of headings) {
    if (h.textContent?.includes(text)) return true
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
    headingContainsText('Sign In')
  ) {
    return 'login'
  }

  if (url.includes('/my-information') || hasAutomationId('firstName')) {
    return 'my_information'
  }

  if (url.includes('/experience') || hasAutomationId('workExperience')) {
    return 'experience'
  }

  if (url.includes('/education') || hasAutomationId('education')) {
    return 'education'
  }

  if (
    url.includes('/questionnaire') ||
    url.includes('/questions') ||
    headingContainsText('Application Questions')
  ) {
    return 'application_questions'
  }

  if (url.includes('/review') || hasAutomationId('submitButton')) {
    return 'review'
  }

  if (url.includes('/complete') || url.includes('/thank-you')) {
    return 'submit'
  }

  return 'unknown'
}
