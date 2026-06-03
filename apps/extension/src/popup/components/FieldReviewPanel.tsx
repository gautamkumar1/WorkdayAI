import React, { useState } from 'react'
import { useApplicationStore } from '../../store/applicationStore'
import type { FieldMapping } from '@workday-ai/shared'

export default function FieldReviewPanel() {
  const { lowConfidenceFields, updateFillResult } = useApplicationStore()
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(lowConfidenceFields.map((f) => [f.fieldLabel, f.value])),
  )
  const [approved, setApproved] = useState<Set<string>>(new Set())

  if (lowConfidenceFields.length === 0) return null

  function approveField(field: FieldMapping) {
    updateFillResult({
      fieldLabel: field.fieldLabel,
      status: 'success',
      error: null,
      attempts: 1,
    })
    setApproved((prev) => new Set(prev).add(field.fieldLabel))
  }

  function approveAll() {
    lowConfidenceFields.forEach((f) => approveField(f))
  }

  const pending = lowConfidenceFields.filter((f) => !approved.has(f.fieldLabel))

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">
          Fields needing review ({pending.length})
        </p>
        {pending.length > 0 && (
          <button
            onClick={approveAll}
            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            Approve All
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {lowConfidenceFields.map((field) => {
          const isApproved = approved.has(field.fieldLabel)
          return (
            <div
              key={field.fieldLabel}
              className={[
                'rounded-lg border p-3 flex flex-col gap-2',
                isApproved ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{field.fieldLabel}</p>
                  <p className="text-xs text-gray-500">{field.reasoning}</p>
                </div>
                <span
                  className={[
                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                    field.confidence >= 0.6
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800',
                  ].join(' ')}
                >
                  {Math.round(field.confidence * 100)}%
                </span>
              </div>

              <input
                type="text"
                value={values[field.fieldLabel] ?? field.value}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.fieldLabel]: e.target.value }))
                }
                disabled={isApproved}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-800 disabled:bg-gray-100 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />

              {isApproved ? (
                <p className="text-xs text-green-700 font-medium">Approved</p>
              ) : (
                <button
                  onClick={() => approveField(field)}
                  className="self-end rounded-md bg-yellow-500 px-3 py-1 text-xs font-medium text-white hover:bg-yellow-600"
                >
                  Approve
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
