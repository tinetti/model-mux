import { Validation, ValidationSchema } from '../schemas/validation.js'
import { extractJson, tryParseJson } from '../utils/json.js'
import { getOpenAI } from '../providers/openai.js'
import { temperatures } from '../policy.js'

const systemPrompt = `You are a strict plan validator. Output only valid JSON matching the schema.`

export async function cloudValidate(
  planJson: string,
  ctx: { objective: string; constraints?: string[]; acceptanceCriteria?: string[] },
  opts: { apiKey: string; model: string; baseURL?: string }
): Promise<Validation> {
  const openai = getOpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL })
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    {
      role: 'user' as const,
      content:
        `Context: ${JSON.stringify({ ...ctx, planJson })}\n` +
        `Output strictly as JSON per the schema.`,
    },
  ]
  const res = await openai.chat.completions.create({
    model: opts.model,
    temperature: temperatures.validator,
    messages,
    response_format: { type: 'json_object' },
  })
  const text = res.choices?.[0]?.message?.content ?? ''
  const json = extractJson(text)
  const parsed = tryParseJson(json)
  const val = ValidationSchema.safeParse(parsed)
  if (!val.success) {
    throw new Error('Cloud validator produced invalid JSON: ' + val.error.message)
  }
  return val.data
}
