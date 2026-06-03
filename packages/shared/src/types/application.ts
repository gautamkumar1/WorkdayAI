export type ApplicationStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_review'
  | 'submitted'
  | 'failed'

export type WorkdayStep =
  | 'job_details'
  | 'login'
  | 'my_information'
  | 'experience'
  | 'education'
  | 'application_questions'
  | 'review'
  | 'submit'
  | 'unknown'

export interface ApplicationState {
  applicationId: string | null
  jobUrl: string | null
  jobTitle: string | null
  company: string | null
  status: ApplicationStatus
  currentStep: WorkdayStep
  totalSteps: number
  completedSteps: number
  fillResults: import('./mapping').FillResult[]
  lowConfidenceFields: import('./mapping').FieldMapping[]
}
