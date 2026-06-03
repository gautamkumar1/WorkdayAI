import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import axios from 'axios'
import type { ResumeData } from '@workday-ai/shared'
import { useResumeStore } from '../store/resumeStore'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'

interface ResumeRecord {
  id: string
  rawText: string
}

export function useResumeUpload(): UseMutationResult<ResumeData, Error, File> {
  const { apiBaseUrl } = useSettingsStore()
  const { setFile, setParsed, setParseError } = useResumeStore()
  const { token } = useAuthStore()

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

  return useMutation<{ rawText: string; parsedData: ResumeData }, Error, File>({
    mutationFn: async (file: File) => {
      setFile(file)

      // Step 1: upload file, get rawText back
      const formData = new FormData()
      formData.append('resume', file)
      const uploadRes = await axios.post<{ success: boolean; data: ResumeRecord }>(
        `${apiBaseUrl}/api/resumes/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data', ...authHeaders } },
      )
      const { rawText } = uploadRes.data.data

      // Step 2: parse rawText with AI to get structured ResumeData
      const parseRes = await axios.post<{ success: boolean; data: ResumeData }>(
        `${apiBaseUrl}/api/ai/parse-resume`,
        { rawText },
        { headers: { 'Content-Type': 'application/json', ...authHeaders } },
      )
      return { rawText, parsedData: parseRes.data.data }
    },
    onSuccess: ({ rawText, parsedData }) => {
      setParsed(rawText, parsedData)
    },
    onError: (error) => {
      setParseError(error.message)
    },
  })
}
