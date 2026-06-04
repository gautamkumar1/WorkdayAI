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

  // Login — confirmed IDs from ubangura/Workday-Application-Automator
  if (
    url.includes('/login') ||
    hasAutomationId('signInSubmitButton') ||
    hasAutomationId('createAccountLink') ||
    hasAutomationId('utilityButtonSignIn') ||
    url.includes('/applyManually') ||
    url.includes('/autofillWithResume') ||
    headingContains('Sign In') ||
    headingContains('Create Account')
  ) {
    return 'login'
  }

  // My Information — real section ID is contactInformationPage
  if (
    hasAutomationId('contactInformationPage') ||
    hasAutomationId('legalNameSection_firstName') ||
    hasAutomationId('addressSection_addressLine1') ||
    hasAutomationId('applyFlowMyInfoPage') ||
    headingContains('My Information') ||
    headingContains('Contact Information')
  ) {
    return 'my_information'
  }

  // My Experience — real section ID is myExperiencePage
  if (
    hasAutomationId('myExperiencePage') ||
    hasAutomationId('workExperienceSection') ||
    hasAutomationId('educationSection') ||
    headingContains('My Experience')
  ) {
    return 'experience'
  }

  // Application questions
  if (
    url.includes('/questionnaire') ||
    url.includes('/question') ||
    hasAutomationId('questionnaire') ||
    headingContains('Application Questions')
  ) {
    return 'application_questions'
  }

  // Voluntary disclosures
  if (
    hasAutomationId('voluntaryDisclosuresPage') ||
    hasAutomationId('selfIdentificationPage') ||
    headingContains('Voluntary Disclosures') ||
    headingContains('Self Identification')
  ) {
    return 'experience' // grouped under experience step for progress tracking
  }

  if (url.includes('/review') || hasAutomationId('submitButton') || headingContains('Review')) {
    return 'review'
  }

  if (url.includes('/complete') || url.includes('/thank-you')) {
    return 'submit'
  }

  return 'unknown'
}
