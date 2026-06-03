import React, { useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'

export default function SettingsPanel() {
  const { apiBaseUrl, fillDelay, autoAdvance, debugMode, updateSettings } = useSettingsStore()

  const [form, setForm] = useState({ apiBaseUrl, fillDelay, autoAdvance, debugMode })
  const [saved, setSaved] = useState(false)

  function handleSave() {
    updateSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700" htmlFor="apiBaseUrl">
          API Base URL
        </label>
        <input
          id="apiBaseUrl"
          type="text"
          value={form.apiBaseUrl}
          onChange={(e) => setForm((f) => ({ ...f, apiBaseUrl: e.target.value }))}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="http://localhost:3000"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700" htmlFor="fillDelay">
          Fill Delay (ms)
        </label>
        <input
          id="fillDelay"
          type="number"
          min={150}
          max={1000}
          value={form.fillDelay}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              fillDelay: Math.min(1000, Math.max(150, Number(e.target.value))),
            }))
          }
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <p className="text-xs text-gray-400">Range: 150–1000 ms. Faster fills may miss fields.</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="autoAdvance"
          type="checkbox"
          checked={form.autoAdvance}
          onChange={(e) => setForm((f) => ({ ...f, autoAdvance: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <label htmlFor="autoAdvance" className="text-sm text-gray-700 cursor-pointer">
          Auto-advance steps
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="debugMode"
          type="checkbox"
          checked={form.debugMode}
          onChange={(e) => setForm((f) => ({ ...f, debugMode: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <label htmlFor="debugMode" className="text-sm text-gray-700 cursor-pointer">
          Debug mode
        </label>
      </div>

      <button
        onClick={handleSave}
        className={[
          'rounded-md px-4 py-2 text-sm font-medium text-white transition-colors',
          saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700',
        ].join(' ')}
      >
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
