import React, { useState } from 'react'
import { useResumeStore } from '../store/resumeStore'
import { useApplicationStore } from '../store/applicationStore'
import { useAuthStore } from '../store/authStore'
import LoginForm from './components/LoginForm'
import ResumeUpload from './components/ResumeUpload'
import ResumePreview from './components/ResumePreview'
import ApplicationStatus from './components/ApplicationStatus'
import ErrorPanel from './components/ErrorPanel'
import FieldReviewPanel from './components/FieldReviewPanel'
import FinalReviewScreen from './components/FinalReviewScreen'
import SettingsPanel from './components/SettingsPanel'

type Tab = 'resume' | 'status' | 'review' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'resume', label: 'Resume' },
  { id: 'status', label: 'Status' },
  { id: 'review', label: 'Review' },
  { id: 'settings', label: 'Settings' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('resume')
  const { parsedData } = useResumeStore()
  const { lowConfidenceFields, fillPlan, currentStep } = useApplicationStore()
  const { isAuthenticated, logout } = useAuthStore()

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col w-[600px] h-[500px] bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
          <div className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">W</span>
          </div>
          <h1 className="text-sm font-semibold text-gray-900">WorkdayAI</h1>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <LoginForm />
        </div>
      </div>
    )
  }

  function renderContent() {
    switch (activeTab) {
      case 'resume':
        return parsedData ? <ResumePreview /> : <ResumeUpload />

      case 'status':
        return (
          <>
            <ApplicationStatus />
            <ErrorPanel />
          </>
        )

      case 'review':
        if (lowConfidenceFields.length > 0) {
          return <FieldReviewPanel />
        }
        if (fillPlan && currentStep === 'review') {
          return <FinalReviewScreen onBack={() => setActiveTab('status')} />
        }
        return (
          <div className="p-4">
            <p className="text-sm text-gray-500">No active application. Open a Workday job posting to begin.</p>
          </div>
        )

      case 'settings':
        return <SettingsPanel />
    }
  }

  return (
    <div className="flex flex-col w-[600px] h-[500px] bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">W</span>
        </div>
        <h1 className="text-sm font-semibold text-gray-900">WorkdayAI</h1>
        <span className="text-xs text-gray-400 flex-1">AI-powered autofill</span>
        <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-700">
          Sign out
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {renderContent()}
      </div>

      {/* Bottom tab bar */}
      <div className="shrink-0 flex border-t border-gray-200 bg-white">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex-1 py-3 text-xs font-medium transition-colors',
              activeTab === tab.id
                ? 'text-blue-600 border-t-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
