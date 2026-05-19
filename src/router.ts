import { getConfig } from './configure.js'
import { estimateTokens } from './utils/tokens.js'

export type TaskType = 'plan' | 'code' | 'validate' | 'long_context'

export function detectTask(input: { text?: string; tokensHint?: number; type?: TaskType }): TaskType {
  if (input.type) return input.type
  const tokens = input.tokensHint ?? estimateTokens(input.text ?? '')
  const { longContext } = getConfig()
  if (longContext.enabled && tokens > longContext.tokenTrigger) return 'long_context'
  return 'plan'
}

export function route(task: TaskType): { model: string; temperature: number } {
  const { models } = getConfig()
  switch (task) {
    case 'plan':
      return { model: models.planner, temperature: 0.7 }
    case 'code':
      return { model: models.coder, temperature: 0.2 }
    case 'validate':
      return { model: models.validator, temperature: 0.0 }
    case 'long_context':
      return { model: models.longContext, temperature: 0.2 }
  }
}
