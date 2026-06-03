import type { FieldDescriptor, FieldMapping, ResumeData } from '@workday-ai/shared'

export class ApiMapperError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiMapperError'
  }
}

export async function mapFieldsViaApi(
  fields: FieldDescriptor[],
  resumeData: ResumeData,
  apiBaseUrl: string,
  token: string,
): Promise<FieldMapping[]> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/api/ai/map-fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields, resumeData }),
    })
  } catch (err) {
    throw new ApiMapperError(`Network error: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!response.ok) {
    throw new ApiMapperError(`API request failed with status ${response.status}`)
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new ApiMapperError('Failed to parse API response as JSON')
  }

  if (!Array.isArray(data)) {
    throw new ApiMapperError('Expected array response from map-fields API')
  }

  return data as FieldMapping[]
}
