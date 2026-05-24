import { generatePlanCandidate, type PlanInput } from './prompts/planner.js'
import { evaluateWithOmlx } from './prompts/evaluator.js'
import { Plan } from './schemas/plan.js'
import { Validation } from './schemas/validation.js'
import { getConfig } from './configure.js'
import { temperatures } from './policy.js'

export async function runPipeline(input: PlanInput): Promise<{ plans: Plan[]; evaluations: Validation[] }> {
  const cfg = getConfig()
  // 3 candidate plans from the planner model with diverse temps
  const temps = [temperatures.plannerPrecise, temperatures.plannerBalanced, temperatures.plannerExploratory]
  const styles: Array<'precise' | 'balanced' | 'exploratory'> = ['precise', 'balanced', 'exploratory']
  const planPromises = temps.map((t, idx) =>
    generatePlanCandidate(input, cfg.models.planner, t, { apiKey: cfg.openaiApiKey, style: styles[idx] })
  )
  const plans = await Promise.all(planPromises)

  // Evaluate each plan via oMLX (OpenAI-compatible)
  const evalPromises = plans.map((p) =>
    evaluateWithOmlx(JSON.stringify(p), {
      objective: input.objective,
      constraints: input.constraints,
      acceptanceCriteria: input.acceptanceCriteria,
    }, {
      apiKey: cfg.openaiApiKey, // some oMLX setups ignore apiKey; OpenAI client requires a string
      baseURL: cfg.omlxBaseURL,
      model: cfg.models.omlx,
    })
  )
  const evaluations = await Promise.all(evalPromises)

  // Sort plans by avgScore desc (stable with original index)
  const ranked = plans.map((p, i) => ({ p, i, s: evaluations[i].avgScore }))
    .sort((a, b) => b.s - a.s)
  const sortedPlans: Plan[] = []
  const sortedEvals: Validation[] = []
  for (const r of ranked) {
    sortedPlans.push(r.p)
    sortedEvals.push(evaluations[r.i])
  }

  return { plans: sortedPlans, evaluations: sortedEvals }
}
