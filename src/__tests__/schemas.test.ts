import { describe, it, expect } from 'vitest'
import { PlanSchema, PlanStep, Plan } from '../schemas/plan.js'
import { ValidationSchema, Validation } from '../schemas/validation.js'

describe('PlanSchema', () => {
  it('accepts a valid minimal plan', () => {
    const input = {
      objective: 'Build a login page',
      steps: [
        { id: '1', desc: 'Create form component', owner: 'agent' },
      ],
    }
    const result = PlanSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.objective).toBe('Build a login page')
      expect(result.data.steps).toHaveLength(1)
    }
  })

  it('accepts a full plan with all fields', () => {
    const input = {
      objective: 'Full objective',
      steps: [
        {
          id: '1',
          desc: 'Step description',
          owner: 'agent',
          inputs: ['requirement doc'],
          outputs: ['component file'],
        },
      ],
      risks: ['UI might not match design'],
      testPlan: ['Manual test login flow'],
    }
    const result = PlanSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects plan with missing objective', () => {
    const result = PlanSchema.safeParse({ steps: [] })
    expect(result.success).toBe(false)
  })

  it('rejects plan with empty objective', () => {
    const result = PlanSchema.safeParse({ objective: '', steps: [] })
    expect(result.success).toBe(false)
  })

  it('rejects plan with no steps', () => {
    const result = PlanSchema.safeParse({ objective: 'Build something' })
    expect(result.success).toBe(false)
  })

  it('rejects plan with empty steps array', () => {
    const result = PlanSchema.safeParse({ objective: 'Build something', steps: [] })
    expect(result.success).toBe(false)
  })

  it('rejects step with empty id', () => {
    const result = PlanSchema.safeParse({
      objective: 'Build something',
      steps: [{ id: '', desc: 'Do stuff', owner: 'agent' as any }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects step with empty desc', () => {
    const result = PlanSchema.safeParse({
      objective: 'Build something',
      steps: [{ id: '1', desc: '', owner: 'agent' as any }],
    })
    expect(result.success).toBe(false)
  })

  it('accepts both agent and tool owners', () => {
    const r1 = PlanSchema.safeParse({
      objective: 'Build',
      steps: [{ id: '1', desc: 'x', owner: 'agent' as const }],
    })
    const r2 = PlanSchema.safeParse({
      objective: 'Build',
      steps: [{ id: '1', desc: 'x', owner: 'tool' as const }],
    })
    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
  })

  it('rejects invalid owner type', () => {
    const result = PlanSchema.safeParse({
      objective: 'Build',
      steps: [{ id: '1', desc: 'x', owner: 'unknown' as any }],
    })
    expect(result.success).toBe(false)
  })

  it('defaults missing optional arrays to empty arrays', () => {
    const input = { objective: 'x', steps: [{ id: '1', desc: 'y', owner: 'agent' as const }] }
    const result = PlanSchema.safeParse(input)
    if (result.success) {
      expect(result.data.risks).toEqual([])
      expect(result.data.testPlan).toEqual([])
    }
  })

  it('defaults missing step arrays to empty arrays', () => {
    const input = {
      objective: 'x',
      steps: [{ id: '1', desc: 'y', owner: 'agent' as const }],
    }
    const result = PlanSchema.safeParse(input)
    if (result.success) {
      expect(result.data.steps[0].inputs).toEqual([])
      expect(result.data.steps[0].outputs).toEqual([])
    }
  })
})

describe('ValidationSchema', () => {
  it('accepts a valid minimal validation', () => {
    const input = {
      verdict: 'pass',
      avgScore: 4.0,
      scores: {
        coverage: 4,
        feasibility: 4,
        risk_identification: 4,
        dependency_ordering: 4,
        test_plan_quality: 4,
        acceptance_criteria_clarity: 4,
      },
      confidence: 0.8,
      needsEscalation: false,
    }
    const result = ValidationSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('accepts a failing validation with issues', () => {
    const input = {
      verdict: 'fail',
      avgScore: 2.0,
      scores: {
        coverage: 2,
        feasibility: 2,
        risk_identification: 1,
        dependency_ordering: 3,
        test_plan_quality: 2,
        acceptance_criteria_clarity: 2,
      },
      issues: [
        { severity: 'high', area: 'coverage', explain: 'Missing auth' },
      ],
      missingInfo: ['Auth requirements'],
      suggestedFixes: ['Add auth step'],
      confidence: 0.7,
      needsEscalation: true,
    }
    const result = ValidationSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects verdict outside pass/fail', () => {
    const base = {
      verdict: 'maybe' as any,
      avgScore: 3.0,
      scores: {
        coverage: 3,
        feasibility: 3,
        risk_identification: 3,
        dependency_ordering: 3,
        test_plan_quality: 3,
        acceptance_criteria_clarity: 3,
      },
      confidence: 0.5,
      needsEscalation: false,
    }
    expect(ValidationSchema.safeParse(base).success).toBe(false)
  })

  it('rejects avgScore below 0', () => {
    const base = {
      verdict: 'pass',
      avgScore: -1,
      scores: {
        coverage: 3,
        feasibility: 3,
        risk_identification: 3,
        dependency_ordering: 3,
        test_plan_quality: 3,
        acceptance_criteria_clarity: 3,
      },
      confidence: 0.5,
      needsEscalation: false,
    }
    expect(ValidationSchema.safeParse(base).success).toBe(false)
  })

  it('rejects avgScore above 5', () => {
    const base = {
      verdict: 'pass',
      avgScore: 6,
      scores: {
        coverage: 3,
        feasibility: 3,
        risk_identification: 3,
        dependency_ordering: 3,
        test_plan_quality: 3,
        acceptance_criteria_clarity: 3,
      },
      confidence: 0.5,
      needsEscalation: false,
    }
    expect(ValidationSchema.safeParse(base).success).toBe(false)
  })

  it('rejects individual score out of range', () => {
    const base = {
      verdict: 'pass',
      avgScore: 3,
      scores: {
        coverage: -1,
        feasibility: 3,
        risk_identification: 3,
        dependency_ordering: 3,
        test_plan_quality: 3,
        acceptance_criteria_clarity: 3,
      },
      confidence: 0.5,
      needsEscalation: false,
    }
    expect(ValidationSchema.safeParse(base).success).toBe(false)
  })

  it('rejects confidence below 0', () => {
    const base = {
      verdict: 'pass',
      avgScore: 3,
      scores: {
        coverage: 3,
        feasibility: 3,
        risk_identification: 3,
        dependency_ordering: 3,
        test_plan_quality: 3,
        acceptance_criteria_clarity: 3,
      },
      confidence: -0.1,
      needsEscalation: false,
    }
    expect(ValidationSchema.safeParse(base).success).toBe(false)
  })

  it('rejects confidence above 1', () => {
    const base = {
      verdict: 'pass',
      avgScore: 3,
      scores: {
        coverage: 3,
        feasibility: 3,
        risk_identification: 3,
        dependency_ordering: 3,
        test_plan_quality: 3,
        acceptance_criteria_clarity: 3,
      },
      confidence: 1.1,
      needsEscalation: false,
    }
    expect(ValidationSchema.safeParse(base).success).toBe(false)
  })

  it('defaults missing optional arrays to empty', () => {
    const input = {
      verdict: 'pass',
      avgScore: 3,
      scores: {
        coverage: 3,
        feasibility: 3,
        risk_identification: 3,
        dependency_ordering: 3,
        test_plan_quality: 3,
        acceptance_criteria_clarity: 3,
      },
      confidence: 0.5,
      needsEscalation: false,
    }
    const result = ValidationSchema.safeParse(input)
    if (result.success) {
      expect(result.data.issues).toEqual([])
      expect(result.data.missingInfo).toEqual([])
      expect(result.data.suggestedFixes).toEqual([])
    }
  })

  it('accepts issue with optional evidence field', () => {
    const input = {
      verdict: 'pass',
      avgScore: 3,
      scores: {
        coverage: 3,
        feasibility: 3,
        risk_identification: 3,
        dependency_ordering: 3,
        test_plan_quality: 3,
        acceptance_criteria_clarity: 3,
      },
      issues: [{ severity: 'low', area: 'test', explain: 'low priority', evidence: 'line 42' }],
      confidence: 0.5,
      needsEscalation: false,
    }
    const result = ValidationSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('accepts issue without evidence field', () => {
    const input = {
      verdict: 'pass',
      avgScore: 3,
      scores: {
        coverage: 3,
        feasibility: 3,
        risk_identification: 3,
        dependency_ordering: 3,
        test_plan_quality: 3,
        acceptance_criteria_clarity: 3,
      },
      issues: [{ severity: 'low', area: 'test', explain: 'low priority' }],
      confidence: 0.5,
      needsEscalation: false,
    }
    const result = ValidationSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects issue with invalid severity', () => {
    const input = {
      verdict: 'pass',
      avgScore: 3,
      scores: {
        coverage: 3,
        feasibility: 3,
        risk_identification: 3,
        dependency_ordering: 3,
        test_plan_quality: 3,
        acceptance_criteria_clarity: 3,
      },
      issues: [{ severity: 'critical' as any, area: 'test', explain: 'oops' }],
      confidence: 0.5,
      needsEscalation: false,
    }
    expect(ValidationSchema.safeParse(input).success).toBe(false)
  })

  it('accepts boundary score values 0 and 5', () => {
    const input = {
      verdict: 'fail',
      avgScore: 0,
      scores: {
        coverage: 0,
        feasibility: 0,
        risk_identification: 0,
        dependency_ordering: 0,
        test_plan_quality: 0,
        acceptance_criteria_clarity: 0,
      },
      confidence: 0,
      needsEscalation: true,
    }
    expect(ValidationSchema.safeParse(input).success).toBe(true)

    const maxInput = {
      verdict: 'pass',
      avgScore: 5,
      scores: {
        coverage: 5,
        feasibility: 5,
        risk_identification: 5,
        dependency_ordering: 5,
        test_plan_quality: 5,
        acceptance_criteria_clarity: 5,
      },
      confidence: 1,
      needsEscalation: false,
    }
    expect(ValidationSchema.safeParse(maxInput).success).toBe(true)
  })
})

describe('Plan type inference', () => {
  it('Plan type has correct shape', () => {
    const plan: Plan = {
      objective: 'test',
      steps: [{ id: '1', desc: 'do', owner: 'agent', inputs: [], outputs: [] }],
      risks: [],
      testPlan: [],
    }
    expect(plan.objective).toBe('test')
  })
})

describe('Validation type inference', () => {
  it('Validation type has correct shape', () => {
    const val: Validation = {
      verdict: 'pass',
      avgScore: 3,
      scores: {
        coverage: 3,
        feasibility: 3,
        risk_identification: 3,
        dependency_ordering: 3,
        test_plan_quality: 3,
        acceptance_criteria_clarity: 3,
      },
      issues: [],
      missingInfo: [],
      suggestedFixes: [],
      confidence: 0.5,
      needsEscalation: false,
    }
    expect(val.verdict).toBe('pass')
  })
})
