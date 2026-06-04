export type FieldType = 'text' | 'dropdown' | 'date' | 'radio' | 'checkbox' | 'file' | 'textarea'

export interface FieldDescriptor {
  label: string
  type: FieldType
  automationId: string | null
  ariaLabel: string | null
  placeholder: string | null
  options: string[] | null
  required: boolean
  currentValue: string | null
}

export type MappingSource = 'resume' | 'ai_generated' | 'user_override'

export interface FieldMapping {
  fieldLabel: string
  fieldType: FieldType
  value: string
  confidence: number
  reasoning: string
  source: MappingSource
  needsReview: boolean
  automationId?: string | null // Workday formField-* id or radio name, used by filler to locate element
}

export interface FillPlan {
  applicationId: string
  fields: FieldMapping[]
  lowConfidenceCount: number
}

export type FillStatus = 'pending' | 'success' | 'failed' | 'skipped' | 'manual_required'

export interface FillResult {
  fieldLabel: string
  status: FillStatus
  error: string | null
  attempts: number
}
