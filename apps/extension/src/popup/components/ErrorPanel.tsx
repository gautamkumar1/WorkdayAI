import React from 'react'
import { useApplicationStore } from '../../store/applicationStore'

export default function ErrorPanel() {
  const { fillResults } = useApplicationStore()

  const problemFields = fillResults.filter(
    (r) => r.status === 'failed' || r.status === 'manual_required',
  )

  if (problemFields.length === 0) return null

  return (
    <div className="flex flex-col gap-2 p-4">
      <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
        Fields requiring manual action ({problemFields.length})
      </p>
      <div className="flex flex-col gap-2">
        {problemFields.map((result) => (
          <div
            key={result.fieldLabel}
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 flex flex-col gap-0.5"
          >
            <p className="text-xs font-medium text-red-800">{result.fieldLabel}</p>
            {result.error && (
              <p className="text-xs text-red-600">{result.error}</p>
            )}
            <p className="text-xs text-gray-500 italic">Please fill this field manually.</p>
          </div>
        ))}
      </div>
    </div>
  )
}
