import { z } from 'zod'

export const Score = z.number().min(0).max(5)

export const Scores = z.object({
  coverage: Score,
  feasibility: Score,
  risk_identification: Score,
  dependency_ordering: Score,
  test_plan_quality: Score,
  acceptance_criteria_clarity: Score,
})

export const Issue = z.object({
  severity: z.enum(['low', 'med', 'high']),
  area: z.string(),
  explain: z.string(),
  evidence: z.string().optional(),
})

export const ValidationSchema = z.object({
  verdict: z.enum(['pass', 'fail']),
  avgScore: z.number().min(0).max(5),
  scores: Scores,
  issues: z.array(Issue).default([]),
  missingInfo: z.array(z.string()).default([]),
  suggestedFixes: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  needsEscalation: z.boolean(),
})

export type Validation = z.infer<typeof ValidationSchema>
