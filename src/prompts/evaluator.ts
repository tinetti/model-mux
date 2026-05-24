import { Validation, ValidationSchema } from '../schemas/validation.js'
import { extractJson, tryParseJson } from '../utils/json.js'
import { temperatures } from '../policy.js'
import { getOpenAI } from '../providers/openai.js'

const systemPrompt = `You are a strict plan evaluator. Do not rewrite the plan. Output only valid JSON matching the provided schema.\n\nSchema:\n{\n  "verdict": "pass" | "fail",\n  "avgScore": number,\n  "scores": {\n    "coverage": number,\n    "feasibility": number,\n    "risk_identification": number,\n    "dependency_ordering": number,\n    "test_plan_quality": number,\n    "acceptance_criteria_clarity": number\n  },\n  "issues": [ { "severity": "low"|"med"|"high", "area": string, "explain": string, "evidence": string } ],\n  "missingInfo": string[],\n  "suggestedFixes": string[],\n  "confidence": number,\n  "needsEscalation": boolean\n}\n\nEscalation policy (derive needsEscalation):\n- true if any issue.severity == 'high' OR avgScore < 3.5 OR confidence < 0.6.`

const rubric = `Evaluation rubric (0-5 each):
- coverage: Does the plan fully address the objective and constraints?
- feasibility: Steps are realistic with available tools/time?
- risk_identification: Key risks and mitigations identified?
- dependency_ordering: Steps are ordered and unblocked?
- test_plan_quality: Tests/verification are concrete and sufficient?
- acceptance_criteria_clarity: Clear, measurable done-ness?`

export function evaluatorUserPrompt(context: {
  objective: string
  constraints?: string[]
  acceptanceCriteria?: string[]
  planJson: string
}) {
  return (
    `Context:\n` +
    `- Objective: ${context.objective}\n` +
    `- Constraints: ${JSON.stringify(context.constraints ?? [])}\n` +
    `- Success criteria: ${JSON.stringify(context.acceptanceCriteria ?? [])}\n` +
    `\nPlan JSON:\n${context.planJson}\n\n` +
    `${rubric}\n\n` +
    `Output strictly as JSON per the schema.`
  )
}

export async function evaluateWithOmlx(
  planJson: string,
  ctx: { objective: string; constraints?: string[]; acceptanceCriteria?: string[] },
  opts: { apiKey: string; baseURL: string; model: string }
): Promise<Validation> {
  const openai = getOpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL })
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    {
      role: 'user' as const,
      content: evaluatorUserPrompt({ ...ctx, planJson }),
    },
  ]
  const res = await openai.chat.completions.create({
    model: opts.model,
    temperature: temperatures.omlx,
    messages,
  })
  const text = res.choices?.[0]?.message?.content ?? ''
  const json = extractJson(text)
  const parsed = tryParseJson(json)
  const val = ValidationSchema.safeParse(parsed)
  if (!val.success) {
    throw new Error('Evaluator produced invalid JSON: ' + val.error.message)
  }
  return val.data
}
