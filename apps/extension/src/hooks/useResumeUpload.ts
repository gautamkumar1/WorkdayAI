import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import axios from 'axios'
import type { ResumeData } from '@workday-ai/shared'
import { useResumeStore } from '../store/resumeStore'
import { useSettingsStore } from '../store/settingsStore'

interface UploadResponse {
  rawText: string
  parsedData: ResumeData
}

export function useResumeUpload(): UseMutationResult<UploadResponse, Error, File> {
  const { apiBaseUrl } = useSettingsStore()
  const { setFile, setParsed, setParseError } = useResumeStore()

  return useMutation<UploadResponse, Error, File>({
    mutationFn: async (file: File) => {
      setFile(file)
      const formData = new FormData()
      formData.append('resume', file)
      const { data } = await axios.post<UploadResponse>(
        `${apiBaseUrl}/api/resumes/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return data
    },
    onSuccess: (data) => {
      setParsed(data.rawText, data.parsedData)
    },
    onError: (error) => {
      setParseError(error.message)
    },
  })
}
