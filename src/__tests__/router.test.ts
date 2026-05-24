import { describe, it, expect, beforeEach } from 'vitest'
import { configure, getConfig } from '../configure.js'
import { detectTask, route, type TaskType } from '../router.js'

const baseConfig = {
  openaiApiKey: 'test-key',
  omlxBaseURL: 'http://127.0.0.1:8000/v1',
  models: {
    planner: 'o4-mini',
    coder: 'gpt-4o',
    validator: 'gpt-4o-mini',
    longContext: 'gpt-4.1',
    omlx: 'mlx-community/Qwen3.6-35B-A3B-8bit',
  },
}

beforeEach(() => {
  configure(baseConfig)
})

describe('detectTask', () => {
  it('returns explicit type when provided', () => {
    expect(detectTask({ type: 'code' })).toBe('code')
    expect(detectTask({ type: 'validate' })).toBe('validate')
    expect(detectTask({ type: 'long_context' })).toBe('long_context')
  })

  it('defaults to "plan" for short text', () => {
    expect(detectTask({ text: 'Add login page' })).toBe('plan')
  })

  it('returns "long_context" when tokens exceed threshold', () => {
    // Threshold is 150000 tokens = 600000 chars. Use more to exceed it.
    const longText = 'a'.repeat(600_010)
    expect(detectTask({ text: longText })).toBe('long_context')
  })

  it('respects explicit tokenHint', () => {
    expect(detectTask({ text: 'short', tokensHint: 200_000 })).toBe('long_context')
    expect(detectTask({ text: 'short', tokensHint: 1000 })).toBe('plan')
  })

  it('uses type over tokenHint when both given', () => {
    expect(detectTask({ type: 'plan', tokensHint: 200_000 })).toBe('plan')
  })
})

describe('route', () => {
  it('routes plan task to planner model with temperature 0.7', () => {
    const result = route('plan')
    expect(result).toEqual({ model: 'o4-mini', temperature: 0.7 })
  })

  it('routes code task to coder model with temperature 0.2', () => {
    const result = route('code')
    expect(result).toEqual({ model: 'gpt-4o', temperature: 0.2 })
  })

  it('routes validate task to validator model with temperature 0.0', () => {
    const result = route('validate')
    expect(result).toEqual({ model: 'gpt-4o-mini', temperature: 0.0 })
  })

  it('routes long_context task to longContext model with temperature 0.2', () => {
    const result = route('long_context')
    expect(result).toEqual({ model: 'gpt-4.1', temperature: 0.2 })
  })

  it('respects custom model config', () => {
    configure({
      ...baseConfig,
      models: {
        ...baseConfig.models,
        planner: 'custom-planner',
        coder: 'custom-coder',
        validator: 'custom-validator',
        longContext: 'custom-long-context',
      },
    })
    expect(route('plan')).toEqual({ model: 'custom-planner', temperature: 0.7 })
    expect(route('code')).toEqual({ model: 'custom-coder', temperature: 0.2 })
    expect(route('validate')).toEqual({ model: 'custom-validator', temperature: 0.0 })
    expect(route('long_context')).toEqual({ model: 'custom-long-context', temperature: 0.2 })
  })
})

describe('TaskType', () => {
  it('all task types are routable', () => {
    const types: TaskType[] = ['plan', 'code', 'validate', 'long_context']
    for (const t of types) {
      const result = route(t)
      expect(result.model).toBeDefined()
      expect(result.temperature).toBeDefined()
    }
  })
})
