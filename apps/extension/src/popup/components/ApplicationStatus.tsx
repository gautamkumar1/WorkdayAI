import React from 'react'
import { useApplicationStore } from '../../store/applicationStore'
import type { WorkdayStep } from '@workday-ai/shared'

const STEP_ORDER: WorkdayStep[] = [
  'job_details',
  'login',
  'my_information',
  'experience',
  'education',
  'application_questions',
  'review',
  'submit',
]

const STEP_LABELS: Record<WorkdayStep, string> = {
  job_details: 'Job Details',
  login: 'Login',
  my_information: 'My Information',
  experience: 'Experience',
  education: 'Education',
  application_questions: 'Application Questions',
  review: 'Review',
  submit: 'Submit',
  unknown: 'Unknown',
}

export default function ApplicationStatus() {
  const { currentStep, fillResults, lowConfidenceFields, fillPlan } = useApplicationStore()

  const completedSteps = STEP_ORDER.indexOf(currentStep)
  const totalSteps = STEP_ORDER.length
  const progressPct = completedSteps <= 0 ? 0 : Math.round((completedSteps / totalSteps) * 100)

  const successCount = fillResults.filter((r) => r.status === 'success').length
  const failedCount = fillResults.filter(
    (r) => r.status === 'failed' || r.status === 'manual_required',
  ).length

  if (!fillPlan) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500">No active application. Open a Workday job posting to begin.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-gray-500">Current step</p>
          <p className="text-xs font-semibold text-gray-800">{STEP_LABELS[currentStep]}</p>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-gray-400">
          {Math.max(completedSteps, 0)} / {totalSteps} steps
        </p>
      </div>

      <div className="flex gap-3">
        {fillResults.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-green-800">{successCount} filled</span>
            </div>
            {failedCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-xs text-red-800">{failedCount} failed</span>
              </div>
            )}
          </>
        )}
        {lowConfidenceFields.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-1.5">
            <span className="text-xs text-yellow-800 font-medium">
              ⚠ Low confidence: {lowConfidenceFields.length}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
