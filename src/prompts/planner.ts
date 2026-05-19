import { Plan, PlanSchema } from '../schemas/plan.js'
import { extractJson, tryParseJson } from '../utils/json.js'
import { estimateTokens } from '../utils/tokens.js'
import { getOpenAI } from '../providers/openai.js'
import { temperatures } from '../policy.js'

export type PlannerModels = {
  planner: string
  longContext?: string
}

export type PlanInput = {
  objective: string
  constraints?: string[]
  acceptanceCriteria?: string[]
}

const systemPrompt = `You are a precise planner. Output only valid JSON matching the provided schema.
Schema:
{
  "objective": string,
  "steps": [
    { "id": string, "desc": string, "owner": "agent"|"tool", "inputs": string[], "outputs": string[] }
  ],
  "risks": string[],
  "testPlan": string[]
}`

function userPrompt(input: PlanInput) {
  return (
    `Objective: ${input.objective}\n` +
    `Constraints: ${JSON.stringify(input.constraints ?? [])}\n` +
    `Acceptance criteria: ${JSON.stringify(input.acceptanceCriteria ?? [])}\n` +
    `Respond with JSON only.`
  )
}

export async function generatePlanCandidate(
  input: PlanInput,
  model: string,
  temperature: number,
  opts?: { apiKey?: string; baseURL?: string }
): Promise<Plan> {
  const openai = getOpenAI({ apiKey: opts?.apiKey ?? process.env.OPENAI_API_KEY!, baseURL: opts?.baseURL })
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt(input) },
  ]

  const res = await openai.chat.completions.create({
    model,
    temperature,
    messages,
    response_format: { type: 'json_object' },
  })
  const text = res.choices?.[0]?.message?.content ?? ''
  const json = extractJson(text)
  const parsed = tryParseJson(json)
  const plan = PlanSchema.safeParse(parsed)
  if (!plan.success) {
    throw new Error('Planner produced invalid JSON: ' + plan.error.message)
  }
  return plan.data
}

export function estimatePlanInputTokens(input: PlanInput): number {
  return estimateTokens(userPrompt(input))
}
