import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import ErrorBoundary from './ErrorBoundary'
import { useAuthStore } from '../store/authStore'
import { useResumeStore } from '../store/resumeStore'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err: unknown) => (err as { status?: number }).status !== 404 && count < 3,
    },
    mutations: { retry: false },
  },
})

// Rehydrate persisted state before rendering
Promise.all([useAuthStore.getState().rehydrate(), useResumeStore.getState().rehydrate()]).then(
  () => {
    const root = document.getElementById('root')
    if (!root) throw new Error('Root element not found')

    createRoot(root).render(
      <React.StrictMode>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </ErrorBoundary>
      </React.StrictMode>,
    )
  },
)
