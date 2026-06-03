import React from 'react'
import { useApplicationStore } from '../../store/applicationStore'

const SOURCE_LABEL: Record<string, string> = {
  resume: 'Resume',
  ai_generated: 'AI',
  user_override: 'You',
}

interface Props {
  onBack: () => void
}

export default function FinalReviewScreen({ onBack }: Props) {
  const { fillPlan, currentStep, confirmSubmit } = useApplicationStore()

  if (!fillPlan || currentStep !== 'review') return null

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
        <p className="text-xs text-amber-800 font-medium">
          ⚠ This will submit your application. Review carefully before confirming.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-600">
              <th className="px-2 py-1.5 font-medium border border-gray-200">Field</th>
              <th className="px-2 py-1.5 font-medium border border-gray-200">Value</th>
              <th className="px-2 py-1.5 font-medium border border-gray-200 text-center">Conf.</th>
              <th className="px-2 py-1.5 font-medium border border-gray-200 text-center">Source</th>
            </tr>
          </thead>
          <tbody>
            {fillPlan.fields.map((field) => (
              <tr key={field.fieldLabel} className="even:bg-gray-50">
                <td className="px-2 py-1.5 border border-gray-200 text-gray-800 font-medium max-w-[120px] truncate">
                  {field.fieldLabel}
                </td>
                <td className="px-2 py-1.5 border border-gray-200 text-gray-700 max-w-[160px] truncate">
                  {field.value || <span className="text-gray-400 italic">empty</span>}
                </td>
                <td className="px-2 py-1.5 border border-gray-200 text-center">
                  <span
                    className={[
                      'rounded-full px-1.5 py-0.5 font-medium',
                      field.confidence >= 0.8
                        ? 'bg-green-100 text-green-800'
                        : field.confidence >= 0.6
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800',
                    ].join(' ')}
                  >
                    {Math.round(field.confidence * 100)}%
                  </span>
                </td>
                <td className="px-2 py-1.5 border border-gray-200 text-center text-gray-600">
                  {SOURCE_LABEL[field.source]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onBack}
          className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Go Back
        </button>
        <button
          onClick={confirmSubmit}
          className="flex-[2] rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Confirm &amp; Submit
        </button>
      </div>
    </div>
  )
}
