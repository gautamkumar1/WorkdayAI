import { create } from 'zustand'
import type { ResumeData } from '@workday-ai/shared'

type ParseStatus = 'idle' | 'parsing' | 'done' | 'error'

interface ResumeState {
  file: File | null
  rawText: string | null
  parsedData: ResumeData | null
  parseStatus: ParseStatus
  parseError: string | null
  setFile: (file: File) => void
  setParsed: (rawText: string, parsedData: ResumeData) => void
  setParseError: (error: string) => void
  clearResume: () => void
  rehydrate: () => Promise<void>
}

export const useResumeStore = create<ResumeState>((set) => ({
  file: null,
  rawText: null,
  parsedData: null,
  parseStatus: 'idle',
  parseError: null,

  setFile: (file) => set({ file, parseStatus: 'parsing', parseError: null }),

  setParsed: (rawText, parsedData) => {
    chrome.storage.local
      .set({ resumeRawText: rawText, resumeParsedData: parsedData })
      .catch(console.error)
    set({ rawText, parsedData, parseStatus: 'done', parseError: null })
  },

  setParseError: (error) => set({ parseStatus: 'error', parseError: error }),

  clearResume: () => {
    chrome.storage.local.remove(['resumeRawText', 'resumeParsedData']).catch(console.error)
    set({ file: null, rawText: null, parsedData: null, parseStatus: 'idle', parseError: null })
  },

  rehydrate: async () => {
    const result = await chrome.storage.local.get(['resumeRawText', 'resumeParsedData'])
    const rawText = result['resumeRawText'] as string | undefined
    const parsedData = result['resumeParsedData'] as ResumeData | undefined
    if (rawText && parsedData) {
      set({ rawText, parsedData, parseStatus: 'done', parseError: null })
    }
  },
}))
