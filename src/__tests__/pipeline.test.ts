import { describe, it, expect, beforeEach, vi } from 'vitest'
import { configure } from '../configure.js'
import { runPipeline } from '../pipeline.js'

type MockResponse = { content?: string }
type CreateArgs = { model: string; messages: any[]; temperature?: number; response_format?: any }

// Mock state - will be shared via the mocked module's __mockState
const mockState = {
  responses: [] as MockResponse[],
  callArgs: [] as CreateArgs[],
}

vi.mock('../providers/openai.js', () => {
  const mockCreate = vi.fn(async (args: CreateArgs) => {
    // Use the shared mockState from outer scope
    mockState.callArgs.push(args)
    if (mockState.responses.length === 0) {
      throw new Error('MockOpenAI: no more responses queued. Call setResponse() before the LLM call.')
    }
    const next = mockState.responses.shift()!
    return {
      choices: [{ message: { content: next.content ?? '' } }],
    }
  })

  const mockInstance = {
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }

  return {
    getOpenAI: vi.fn(() => mockInstance),
  }
})

const validPlan = {
  objective: 'Build a login page',
  steps: [
    { id: '1', desc: 'Create form', owner: 'agent' as const, inputs: [], outputs: [] },
  ],
  risks: ['UI mismatch'],
  testPlan: ['Test login flow'],
}

const validValidation = {
  verdict: 'pass' as const,
  avgScore: 4.0,
  scores: {
    coverage: 4,
    feasibility: 4,
    risk_identification: 4,
    dependency_ordering: 4,
    test_plan_quality: 4,
    acceptance_criteria_clarity: 4,
  },
  issues: [],
  missingInfo: [],
  suggestedFixes: [],
  confidence: 0.85,
  needsEscalation: false,
}

// Helper to queue a response for any LLM call (plan or eval)
function setResponse(content: string) {
  mockState.responses.push({ content })
}

function setPlanResponse(plan: Partial<typeof validPlan> = {}) {
  const merged = { ...validPlan, ...plan }
  setResponse(JSON.stringify(merged))
}

function setValidationResponse(val: Partial<typeof validValidation> = {}) {
  const merged = { ...validValidation, ...val }
  setResponse(JSON.stringify(merged))
}

beforeEach(() => {
  configure({
    openaiApiKey: 'test-key',
    omlxBaseURL: 'http://127.0.0.1:8000/v1',
    models: {
      planner: 'o4-mini',
      coder: 'gpt-4o',
      validator: 'gpt-4o-mini',
      longContext: 'gpt-4.1',
      omlx: 'mlx-community/Qwen3.6-35B-A3B-8bit',
    },
  })
  mockState.responses.length = 0
  mockState.callArgs.length = 0
  vi.clearAllMocks()
})

describe('runPipeline', () => {
  it('calls planner 3 times with different temperatures and evaluator 3 times', async () => {
    // 3 plan responses + 3 eval responses
    setPlanResponse()
    setPlanResponse()
    setPlanResponse()
    setValidationResponse()
    setValidationResponse()
    setValidationResponse()

    const result = await runPipeline({
      objective: 'Build a login page',
      constraints: ['No DB'],
      acceptanceCriteria: ['Login works'],
    })

    expect(result.plans).toHaveLength(3)
    expect(result.evaluations).toHaveLength(3)

    // Should be 6 total LLM calls: 3 planner + 3 evaluator
    const calls = mockState.callArgs
    expect(calls).toHaveLength(6)

    // First 3 calls: planner with varying temperatures
    expect(calls[0].temperature).toBe(0.3)
    expect(calls[1].temperature).toBe(0.7)
    expect(calls[2].temperature).toBe(0.95)

    // Last 3 calls: evaluator with omlx temperature
    expect(calls[3].temperature).toBe(0.1)
    expect(calls[4].temperature).toBe(0.1)
    expect(calls[5].temperature).toBe(0.1)
  })

  it('returns plans sorted by avgScore descending', async () => {
    // All 3 plan responses first (parallel execution)
    setPlanResponse() // Plan 1 (temperature 0.3)
    setPlanResponse() // Plan 2 (temperature 0.7)
    setPlanResponse() // Plan 3 (temperature 0.95)
    // Then all 3 evaluation responses
    setValidationResponse({ avgScore: 3.0, verdict: 'pass' })
    setValidationResponse({ avgScore: 5.0, verdict: 'pass' })
    setValidationResponse({ avgScore: 4.0, verdict: 'pass' })

    const result = await runPipeline({
      objective: 'Build a login page',
    })

    expect(result.plans).toHaveLength(3)
    expect(result.evaluations).toHaveLength(3)
    // Should be sorted: 5, 4, 3
    expect(result.evaluations[0].avgScore).toBe(5.0)
    expect(result.evaluations[1].avgScore).toBe(4.0)
    expect(result.evaluations[2].avgScore).toBe(3.0)
  })

  it('passes input to planner with all optional fields', async () => {
    // All 3 plan responses first (parallel execution)
    setPlanResponse()
    setPlanResponse()
    setPlanResponse()
    // Then all 3 evaluation responses
    setValidationResponse()
    setValidationResponse()
    setValidationResponse()

    const input = {
      objective: 'Add OAuth',
      constraints: ['No migrations', '1 day'],
      acceptanceCriteria: ['Login works'],
    }

    await runPipeline(input)

    // Check planner calls (first 3)
    const calls = mockState.callArgs
    const plannerCalls = calls.slice(0, 3)

    // All three should contain the input fields
    for (const call of plannerCalls) {
      const userMessage = call.messages.find((m: any) => m.role === 'user')
      expect(userMessage.content).toContain('Add OAuth')
      expect(userMessage.content).toContain('No migrations')
      expect(userMessage.content).toContain('Login works')
    }
  })

  it('throws when planner returns invalid JSON', async () => {
    // First call: invalid JSON (not a JSON object at all)
    mockState.responses.push({ content: 'not json at all' })

    await expect(
      runPipeline({ objective: 'Build something' })
    ).rejects.toThrow(/Planner produced invalid JSON/)
  })

  it('throws when evaluator returns invalid JSON', async () => {
    // First 3 planner calls succeed
    setPlanResponse()
    setPlanResponse()
    setPlanResponse()
    // First evaluator: invalid JSON
    setResponse('not json')
    // Remaining evaluators succeed
    setValidationResponse()
    setValidationResponse()

    await expect(
      runPipeline({ objective: 'Build something' })
    ).rejects.toThrow(/Evaluator produced invalid JSON/)
  })

  it('passes pipeline input to evaluator with context', async () => {
    // All 3 plan responses first (parallel execution)
    setPlanResponse()
    setPlanResponse()
    setPlanResponse()
    // Then all 3 evaluation responses
    setValidationResponse()
    setValidationResponse()
    setValidationResponse()

    const input = {
      objective: 'New feature',
      constraints: ['Budget: $100'],
      acceptanceCriteria: ['Feature works'],
    }

    await runPipeline(input)

    // Last 3 calls are evaluation calls
    const calls = mockState.callArgs
    const evalCalls = calls.slice(3)

    for (const call of evalCalls) {
      const userMessage = call.messages.find((m: any) => m.role === 'user')
      expect(userMessage.content).toContain('New feature')
      expect(userMessage.content).toContain('Budget: $100')
      expect(userMessage.content).toContain('Feature works')
    }
  })

  it('passes correct model names from config', async () => {
    // All 3 plan responses first (parallel execution)
    setPlanResponse()
    setPlanResponse()
    setPlanResponse()
    // Then all 3 evaluation responses
    setValidationResponse()
    setValidationResponse()
    setValidationResponse()

    await runPipeline({ objective: 'Test' })

    const calls = mockState.callArgs
    // First 3 calls should use the planner model
    expect(calls[0].model).toBe('o4-mini')
    expect(calls[1].model).toBe('o4-mini')
    expect(calls[2].model).toBe('o4-mini')
    // Last 3 calls should use the omlx model
    expect(calls[3].model).toBe('mlx-community/Qwen3.6-35B-A3B-8bit')
    expect(calls[4].model).toBe('mlx-community/Qwen3.6-35B-A3B-8bit')
    expect(calls[5].model).toBe('mlx-community/Qwen3.6-35B-A3B-8bit')
  })

  it('handles responses with markdown code fences', async () => {
    // Simulate planner wrapping JSON in code fences (common LLM behavior)
    const wrappedPlan = {
      objective: 'Build login',
      steps: [{ id: '1', desc: 'Make form', owner: 'agent' as const, inputs: [], outputs: [] }],
      risks: [],
      testPlan: [],
    }
    // All 3 plan responses first (parallel execution)
    setResponse('```json\n' + JSON.stringify(wrappedPlan) + '\n```')
    setPlanResponse()
    setPlanResponse()
    // Then all 3 evaluation responses
    setValidationResponse()
    setValidationResponse()
    setValidationResponse()

    const result = await runPipeline({ objective: 'Build login' })
    expect(result.plans).toHaveLength(3)
    expect(result.plans[0].objective).toBe('Build login')
  })
})
