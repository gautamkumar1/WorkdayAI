import { create } from 'zustand'
import type { WorkdayStep } from '@workday-ai/shared'
import type { FillPlan, FillResult, FieldMapping } from '@workday-ai/shared'

interface ApplicationState {
  applicationId: string | null
  jobUrl: string | null
  currentStep: WorkdayStep
  fillPlan: FillPlan | null
  fillResults: FillResult[]
  lowConfidenceFields: FieldMapping[]
  startFill: (applicationId: string, jobUrl: string, fillPlan: FillPlan) => void
  updateFillResult: (result: FillResult) => void
  setStep: (step: WorkdayStep) => void
  confirmSubmit: () => void
  reset: () => void
}

export const useApplicationStore = create<ApplicationState>((set) => ({
  applicationId: null,
  jobUrl: null,
  currentStep: 'unknown',
  fillPlan: null,
  fillResults: [],
  lowConfidenceFields: [],

  startFill: (applicationId, jobUrl, fillPlan) =>
    set({
      applicationId,
      jobUrl,
      fillPlan,
      fillResults: [],
      lowConfidenceFields: fillPlan.fields.filter((f) => f.needsReview),
      currentStep: 'my_information',
    }),

  updateFillResult: (result) =>
    set((state) => ({
      fillResults: [
        ...state.fillResults.filter((r) => r.fieldLabel !== result.fieldLabel),
        result,
      ],
    })),

  setStep: (step) => set({ currentStep: step }),

  confirmSubmit: () => set({ currentStep: 'submit' }),

  reset: () =>
    set({
      applicationId: null,
      jobUrl: null,
      currentStep: 'unknown',
      fillPlan: null,
      fillResults: [],
      lowConfidenceFields: [],
    }),
}))
