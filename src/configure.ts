import { Thresholds, defaultThresholds, longContext as defaultLongContext } from './policy.js'

export type ModelsConfig = {
  planner: string
  coder: string
  validator: string
  longContext: string
  omlx: string
}

export type Config = {
  openaiApiKey: string
  omlxBaseURL?: string // OpenAI-compatible
  models: ModelsConfig
  thresholds?: Thresholds
  longContext?: { enabled: boolean; tokenTrigger: number }
}

let CONFIG: Required<Config>

export function configure(cfg: Config) {
  CONFIG = {
    openaiApiKey: cfg.openaiApiKey,
    omlxBaseURL: cfg.omlxBaseURL ?? 'http://127.0.0.1:8000/v1',
    models: cfg.models,
    thresholds: cfg.thresholds ?? defaultThresholds,
    longContext: cfg.longContext ?? defaultLongContext,
  }
}

export function getConfig(): Required<Config> {
  if (!CONFIG) throw new Error('model-mux not configured. Call configure().')
  return CONFIG
}
