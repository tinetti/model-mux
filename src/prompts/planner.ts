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

type Style = 'precise' | 'balanced' | 'exploratory'

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

function userPrompt(input: PlanInput, style: Style) {
  const styleHint =
    style === 'precise'
      ? 'Style: precise and minimal risk; keep steps small and clearly ordered.'
      : style === 'balanced'
      ? 'Style: balanced; good coverage and pragmatic detail.'
      : 'Style: exploratory; consider alternatives and note assumptions.'
  return (
    `Objective: ${input.objective}\n` +
    `Constraints: ${JSON.stringify(input.constraints ?? [])}\n` +
    `Acceptance criteria: ${JSON.stringify(input.acceptanceCriteria ?? [])}\n` +
    `${styleHint}\n` +
    `Respond with JSON only.`
  )
}

function supportsTemperature(model: string): boolean {
  // Models that do not support temperature parameter
  const noTempModels = ['o3-mini', 'o1', 'o1-mini', 'o1-preview']
  return !noTempModels.includes(model)
}

export async function generatePlanCandidate(
  input: PlanInput,
  model: string,
  temperature: number,
  opts?: { apiKey?: string; baseURL?: string; style?: Style }
): Promise<Plan> {
  const openai = getOpenAI({ apiKey: opts?.apiKey ?? process.env.OPENAI_API_KEY!, baseURL: opts?.baseURL })
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt(input, opts?.style ?? 'balanced') },
  ]

  const req: any = {
    model,
    messages,
    response_format: { type: 'json_object' },
  }
  if (supportsTemperature(model)) req.temperature = temperature

  const res = await openai.chat.completions.create(req)
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
  return estimateTokens(userPrompt(input, 'balanced'))
}
