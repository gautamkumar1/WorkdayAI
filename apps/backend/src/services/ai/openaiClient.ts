import OpenAI from 'openai'

const MAX_TOKENS_DEFAULT = 4096

let client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env['OPENAI_API_KEY']
    if (!apiKey) throw new Error('OPENAI_API_KEY not set')
    client = new OpenAI({ apiKey, maxRetries: 3, timeout: 30_000 })
  }
  return client
}

export function getDefaultModel(): string {
  return process.env['OPENAI_MODEL'] ?? 'gpt-4o'
}

export function getFallbackModel(): string {
  return process.env['OPENAI_FALLBACK_MODEL'] ?? 'gpt-4o-mini'
}

export function getMaxTokens(): number {
  const val = process.env['OPENAI_MAX_TOKENS']
  if (val) {
    const n = parseInt(val, 10)
    if (!isNaN(n) && n > 0) return n
  }
  return MAX_TOKENS_DEFAULT
}
