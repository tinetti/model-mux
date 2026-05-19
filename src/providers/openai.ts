import OpenAI from 'openai'

export type OpenAIClientConfig = {
  apiKey: string
  baseURL?: string // Allow overriding for Ollama OpenAI-compatible endpoints
}

let client: OpenAI | null = null
let currentConfig: OpenAIClientConfig | null = null

export function getOpenAI(config?: OpenAIClientConfig): OpenAI {
  if (client && currentConfig && config && JSON.stringify(config) === JSON.stringify(currentConfig)) return client
  if (!config && client) return client
  const cfg = config ?? currentConfig
  if (!cfg) throw new Error('OpenAI client not configured. Call configure().')
  client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL })
  currentConfig = cfg
  return client!
}
