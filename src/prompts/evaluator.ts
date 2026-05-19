import { Validation, ValidationSchema } from '../schemas/validation.js'
import { extractJson, tryParseJson } from '../utils/json.js'
import { temperatures } from '../policy.js'
import { getOpenAI } from '../providers/openai.js'

const systemPrompt = `You are a strict plan evaluator. Do not rewrite the plan. Output only valid JSON matching the provided schema.`

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

export async function evaluateWithOllama(
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
    temperature: temperatures.ollama,
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
