import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import axios from 'axios'
import type { FieldDescriptor, FieldMapping, ResumeData } from '@workday-ai/shared'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'

interface MapFieldsInput {
  fields: FieldDescriptor[]
  resumeData: ResumeData
  applicationId: string
}

export function useFieldMapping(): UseMutationResult<FieldMapping[], Error, MapFieldsInput> {
  const { apiBaseUrl } = useSettingsStore()
  const { token } = useAuthStore()

  return useMutation<FieldMapping[], Error, MapFieldsInput>({
    mutationFn: async (input: MapFieldsInput) => {
      const { data } = await axios.post<FieldMapping[]>(`${apiBaseUrl}/api/ai/map-fields`, input, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return data
    },
  })
}
