# @tinetti/model-mux

Cost‑balanced multi‑model router and plan evaluator.

- Planner: o4-mini (generates 3 diverse plans)
- Local plan evaluator: oMLX (OpenAI‑compatible) using mlx-community/Qwen3.6-35B-A3B-8bit
- Cloud validator (optional escalation): gpt-4o-mini
- Coder default: gpt-4o
- Long‑context routing: gpt-4.1 when estimated input > 150k tokens

## Install

Using GitHub Packages (scoped):

```sh
pnpm add @tinetti/model-mux
```

Add an .npmrc with:

```
@tinetti:registry=https://npm.pkg.github.com
```

## Quick start

```ts
import { configure, runPipeline, evaluatePlan, plan, route } from '@tinetti/model-mux'

configure({
  openaiApiKey: process.env.OPENAI_API_KEY!,
  // oMLX OpenAI‑compatible base URL
  omlxBaseURL: 'http://127.0.0.1:8000/v1',
  models: {
    planner: 'o4-mini',
    coder: 'gpt-4o',
    validator: 'gpt-4o-mini',
    longContext: 'gpt-4.1',
    omlx: 'mlx-community/Qwen3.6-35B-A3B-8bit'
  }
})

const { plans, evaluations } = await runPipeline({
  objective: 'Add OAuth login to app',
  constraints: ['No DB migrations', 'Time budget: 1 day'],
  acceptanceCriteria: ['Login works for GitHub', 'Unit tests updated']
})

console.log(evaluations.map(e => [e.avgScore, e.verdict]))
```

## API

- configure(opts)
- plan(input) → { plans: Plan[] } // returns 3 candidates
- evaluatePlan(plan, context) → Validation
- runPipeline(input) → { plans: Plan[], evaluations: Validation[] }
- route(task) → { model, temperature }

See src/schemas for exact JSON formats.
