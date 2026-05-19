import { z } from 'zod'

export const StepOwner = z.enum(['agent', 'tool'])

export const PlanStep = z.object({
  id: z.string().min(1),
  desc: z.string().min(1),
  owner: StepOwner,
  inputs: z.array(z.string()).default([]),
  outputs: z.array(z.string()).default([]),
})

export const PlanSchema = z.object({
  objective: z.string().min(1),
  steps: z.array(PlanStep).min(1),
  risks: z.array(z.string()).default([]),
  testPlan: z.array(z.string()).default([]),
})

export type Plan = z.infer<typeof PlanSchema>
export type PlanStep = z.infer<typeof PlanStep>
