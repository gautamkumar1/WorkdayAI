export interface APIResponse<T> {
  success: true
  data: T
}

export interface APIError {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}
