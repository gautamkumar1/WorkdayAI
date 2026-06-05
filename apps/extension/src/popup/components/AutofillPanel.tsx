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
        const tab = tabs[0]
        if (!tab?.id) return reject(new Error('No active tab found'))
        const url = tab.url ?? ''
        if (!url.includes('myworkday')) {
          return reject(
            new Error('Navigate to a Workday job page first, then click Start Autofill.'),
          )
        }
        chrome.tabs.sendMessage(tab.id, message, (response: T) => {
          if (chrome.runtime.lastError) {
            reject(new Error('Content script not ready. Reload the Workday page and try again.'))
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
      const scanRes = await sendToContentScript<{ fields: FieldDescriptor[]; error?: string }>({
        type: 'SCAN_FIELDS',
      })
      if (scanRes.error) throw new Error(scanRes.error)
      const fields = scanRes.fields
      if (fields.length === 0) {
        setPhase('done')
        setStatusMsg('No fillable fields found on this page.')
        return
      }
      setStatusMsg(
        `Found ${fields.length} field${fields.length !== 1 ? 's' : ''}. Mapping with AI…`,
      )

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
      // Attach automationId and fieldType from scanned fields back onto AI mappings
      const labelToField = new Map(fields.map((f) => [f.label.toLowerCase(), f]))
      const { mappings } = mapRes.data.data

      // Parse location string into city/state/postalCode for client-side defaults
      // location is typically "City, State, Country" or "City, Country"
      const locationParts = (
        ((parsedData as Record<string, unknown>).location as string | null) ?? ''
      )
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const locationCity = locationParts[0] ?? ''
      const locationState = locationParts.length >= 3 ? locationParts[1] : ''

      const mappingsWithId = mappings.map((m) => {
        const scanned = labelToField.get(m.fieldLabel.toLowerCase())
        const mapping = {
          ...m,
          automationId: scanned?.automationId ?? null,
          // fieldType must come from the scanner — AI doesn't return it
          fieldType: scanned?.type ?? m.fieldType,
        }
        const label = m.fieldLabel.toLowerCase()

        // Hard defaults — override AI when value is missing or confidence too low
        if (label === 'country' && (!m.value || m.confidence < 0.6)) {
          mapping.value = 'India'
          mapping.confidence = 0.95
          mapping.needsReview = false
        }
        if (label === 'city' && !m.value && locationCity) {
          mapping.value = locationCity
          mapping.confidence = 0.85
          mapping.needsReview = false
        }
        if ((label === 'state' || label === 'state/region') && !m.value && locationState) {
          mapping.value = locationState
          mapping.confidence = 0.8
          mapping.needsReview = false
        }
        if (label === 'address line 1' && !m.value && locationCity) {
          // Use city as a stand-in so the field isn't blank — user can correct
          mapping.value = locationCity
          mapping.confidence = 0.65
          mapping.needsReview = false
        }
        if (label === 'phone extension' && !m.value) {
          mapping.value = ''
          mapping.confidence = 0.95
          mapping.needsReview = false
        }
        if (label === 'country phone code') {
          // Field shows "India (+91)" by default — always force it to India
          mapping.value = 'India (+91)'
          mapping.confidence = 0.95
          mapping.needsReview = false
        }
        if (label === 'phone device type' && (!m.value || m.confidence < 0.7)) {
          mapping.value = 'Home'
          mapping.confidence = 0.9
          mapping.needsReview = false
        }
        if (label === 'how did you hear about us?' && (!m.value || m.confidence < 0.6)) {
          // Two-level Workday multiselect. Top-level categories: Associations, Event/Conference,
          // Job Board, Social Media, University, Website. Clicking a category replaces the list
          // The search box searches across ALL sub-options, so type a specific sub-option name.
          // "Indeed" lives under Job Board and will appear in filtered results directly.
          mapping.value = 'Indeed'
          mapping.confidence = 0.8
          mapping.needsReview = false
        }
        if (label === 'postal code' && m.confidence < 0.6) {
          // Keep whatever AI found; only clear needsReview if AI gave a value
          if (m.value) {
            mapping.needsReview = false
            mapping.confidence = Math.max(m.confidence, 0.65)
          }
        }
        return mapping
      })
      const { autoFill, needsReview } = splitByConfidence(mappingsWithId)

      // Record in store so Review tab shows low-confidence fields
      const appId = crypto.randomUUID()
      startFill(appId, window.location.href ?? '', {
        applicationId: appId,
        fields: mappingsWithId,
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

  const canStart =
    !!parsedData && phase !== 'scanning' && phase !== 'mapping' && phase !== 'filling'

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
      {statusMsg && phase !== 'error' && <p className="text-xs text-gray-600">{statusMsg}</p>}

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
          {fillResults.filter((r) => r.status === 'failed' || r.status === 'manual_required')
            .length > 0 && (
            <span className="rounded-md bg-red-50 px-2.5 py-1 text-xs text-red-800">
              ✗{' '}
              {
                fillResults.filter((r) => r.status === 'failed' || r.status === 'manual_required')
                  .length
              }{' '}
              failed
            </span>
          )}
        </div>
      )}
    </div>
  )
}
