import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import axios from 'axios'
import type { ResumeData } from '@workday-ai/shared'
import { useResumeStore } from '../store/resumeStore'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'

interface ResumeRecord {
  id: string
  rawText: string
  parsedData: ResumeData | Record<string, never>
}

interface BackendResponse {
  success: boolean
  data: ResumeRecord
}

export function useResumeUpload(): UseMutationResult<ResumeRecord, Error, File> {
  const { apiBaseUrl } = useSettingsStore()
  const { setFile, setParsed, setParseError } = useResumeStore()
  const { token } = useAuthStore()

  return useMutation<ResumeRecord, Error, File>({
    mutationFn: async (file: File) => {
      setFile(file)
      const formData = new FormData()
      formData.append('resume', file)
      const { data } = await axios.post<BackendResponse>(
        `${apiBaseUrl}/api/resumes/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      )
      return data.data
    },
    onSuccess: (record) => {
      setParsed(record.rawText, record.parsedData as ResumeData)
    },
    onError: (error) => {
      setParseError(error.message)
    },
  })
}
