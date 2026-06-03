import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import axios from 'axios'
import type { ApplicationState } from '@workday-ai/shared'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'

export function useApplicationStatus(
  applicationId: string | null,
): UseQueryResult<ApplicationState, Error> {
  const { apiBaseUrl } = useSettingsStore()
  const { token } = useAuthStore()

  return useQuery<ApplicationState, Error>({
    queryKey: ['application', applicationId],
    queryFn: async () => {
      const { data } = await axios.get<ApplicationState>(
        `${apiBaseUrl}/api/applications/${applicationId}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      )
      return data
    },
    enabled: applicationId !== null,
    staleTime: 0,
    refetchInterval: 5000,
  })
}
