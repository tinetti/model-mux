import { Thresholds, defaultThresholds, longContext as defaultLongContext } from './policy.js'

export type ModelsConfig = {
  planner: string
  coder: string
  validator: string
  longContext: string
  ollama: string
}

export type Config = {
  openaiApiKey: string
  ollamaBaseURL?: string // OpenAI-compatible
  models: ModelsConfig
  thresholds?: Thresholds
  longContext?: { enabled: boolean; tokenTrigger: number }
}

let CONFIG: Required<Config>

export function configure(cfg: Config) {
  CONFIG = {
    openaiApiKey: cfg.openaiApiKey,
    ollamaBaseURL: cfg.ollamaBaseURL ?? 'http://localhost:11434/v1',
    models: cfg.models,
    thresholds: cfg.thresholds ?? defaultThresholds,
    longContext: cfg.longContext ?? defaultLongContext,
  }
}

export function getConfig(): Required<Config> {
  if (!CONFIG) throw new Error('model-mux not configured. Call configure().')
  return CONFIG
}
