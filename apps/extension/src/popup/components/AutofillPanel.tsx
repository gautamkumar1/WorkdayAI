import React, { useState } from 'react'
import { useApplicationStore } from '../../store/applicationStore'
import { useResumeStore } from '../../store/resumeStore'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { splitByConfidence } from '../../modules/mapper/confidenceFilter'
import type { FieldDescriptor, FieldMapping, FillResult } from '@workday-ai/shared'
import axios from 'axios'

type Phase = 'idle' | 'scanning' | 'mapping' | 'filling' | 'done' | 'error'

const STEP_LABELS: Record<string, string> = {
  job_details: 'Job Details',
  login: 'Login',
  my_information: 'My Information',
  experience: 'My Experience',
  education: 'Education',
  application_questions: 'Application Questions',
  review: 'Review',
  submit: 'Submit',
  unknown: 'Unknown',
}

export default function AutofillPanel() {
  const { parsedData } = useResumeStore()
  const { token } = useAuthStore()
  const { apiBaseUrl, fillDelay } = useSettingsStore()
  const { currentStep, startFill, updateFillResult, setStep, fillPlan, fillResults } =
    useApplicationStore()

  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  async function sendToContentScript<T>(message: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id
        if (!tabId) return reject(new Error('No active tab found'))
        chrome.tabs.sendMessage(tabId, message, (response: T) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(response)
          }
        })
      })
    })
  }

  async function handleStartAutofill() {
    if (!parsedData) return
    setError(null)
    setPhase('scanning')

    try {
      // 1. Detect current step
      setStatusMsg('Detecting page step…')
      const stepRes = await sendToContentScript<{ step: string }>({ type: 'GET_STEP' })
      setStep(stepRes.step as Parameters<typeof setStep>[0])

      // 2. Scan fields on the page
      setStatusMsg('Scanning form fields…')
      const scanRes = await sendToContentScript<{ fields: FieldDescriptor[]; error?: string }>(
        { type: 'SCAN_FIELDS' },
      )
      if (scanRes.error) throw new Error(scanRes.error)
      const fields = scanRes.fields
      if (fields.length === 0) {
        setPhase('done')
        setStatusMsg('No fillable fields found on this page.')
        return
      }
      setStatusMsg(`Found ${fields.length} field${fields.length !== 1 ? 's' : ''}. Mapping with AI…`)

      // 3. Call backend to map fields → resume data
      setPhase('mapping')
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}
      const mapRes = await axios.post<{
        success: boolean
        data: { mappings: FieldMapping[]; needsReview: FieldMapping[] }
      }>(
        `${apiBaseUrl}/api/ai/map-fields`,
        {
          fields: fields.map((f) => ({
            label: f.label,
            type: f.type,
            options: f.options ?? [],
          })),
          resumeData: parsedData,
        },
        { headers: { 'Content-Type': 'application/json', ...authHeaders } },
      )
      const { mappings } = mapRes.data.data
      const { autoFill, needsReview } = splitByConfidence(mappings)

      // Record in store so Review tab shows low-confidence fields
      const appId = crypto.randomUUID()
      startFill(appId, window.location.href ?? '', {
        applicationId: appId,
        fields: mappings,
        lowConfidenceCount: needsReview.length,
      })

      if (autoFill.length === 0) {
        setPhase('done')
        setStatusMsg('All fields need review — check the Review tab.')
        return
      }

      // 4. Execute fill
      setPhase('filling')
      setStatusMsg(`Filling ${autoFill.length} field${autoFill.length !== 1 ? 's' : ''}…`)
      const fillRes = await sendToContentScript<{ results: FillResult[]; error?: string }>({
        type: 'EXECUTE_FILL',
        mappings: autoFill,
        delayMs: fillDelay,
      })
      if (fillRes.error) throw new Error(fillRes.error)

      fillRes.results.forEach(updateFillResult)

      const succeeded = fillRes.results.filter((r) => r.status === 'success').length
      const failed = fillRes.results.filter(
        (r) => r.status === 'failed' || r.status === 'manual_required',
      ).length

      setPhase('done')
      setStatusMsg(
        `Done — ${succeeded} filled${failed > 0 ? `, ${failed} need manual input` : ''}${needsReview.length > 0 ? `. ${needsReview.length} low-confidence fields in Review tab.` : ''}.`,
      )
    } catch (err) {
      setPhase('error')
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const canStart = !!parsedData && phase !== 'scanning' && phase !== 'mapping' && phase !== 'filling'

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Current step badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Detected step</span>
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
          {STEP_LABELS[currentStep] ?? 'Unknown'}
        </span>
      </div>

      {/* No resume warning */}
      {!parsedData && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2">
          <p className="text-xs text-yellow-800">Upload your resume first (Resume tab).</p>
        </div>
      )}

      {/* Start button */}
      <button
        onClick={handleStartAutofill}
        disabled={!canStart}
        className={[
          'rounded-md px-4 py-2.5 text-sm font-semibold transition-colors',
          canStart
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed',
        ].join(' ')}
      >
        {phase === 'scanning' && 'Scanning fields…'}
        {phase === 'mapping' && 'Mapping with AI…'}
        {phase === 'filling' && 'Filling fields…'}
        {(phase === 'idle' || phase === 'done' || phase === 'error') && 'Start Autofill'}
      </button>

      {/* Status message */}
      {statusMsg && phase !== 'error' && (
        <p className="text-xs text-gray-600">{statusMsg}</p>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Fill summary */}
      {fillPlan && fillResults.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {fillResults.filter((r) => r.status === 'success').length > 0 && (
            <span className="rounded-md bg-green-50 px-2.5 py-1 text-xs text-green-800">
              ✓ {fillResults.filter((r) => r.status === 'success').length} filled
            </span>
          )}
          {fillResults.filter((r) => r.status === 'failed' || r.status === 'manual_required').length > 0 && (
            <span className="rounded-md bg-red-50 px-2.5 py-1 text-xs text-red-800">
              ✗ {fillResults.filter((r) => r.status === 'failed' || r.status === 'manual_required').length} failed
            </span>
          )}
        </div>
      )}
    </div>
  )
}
