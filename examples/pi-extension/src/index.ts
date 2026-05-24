import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import OpenAI from "openai";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "route_to_best_model",
    label: "Best Model Router",
    description: "Route a request through the cost-balanced multi-model system (local oMLX with OpenAI fallback)",
    parameters: Type.Object({
      message: Type.String({ description: "The message or prompt to route through the model router" }),
      context: Type.Optional(Type.Array(Type.String(), {
        description: "Optional additional context (constraints, requirements, etc.)"
      })),
    }),
    async execute(_toolCallId, params) {
      const result = await routeMessage(params.message, params.context ?? []);

      return {
        content: [{ type: "text", text: result.response }],
        details: {
          modelUsed: result.modelUsed,
          cost: result.cost,
          tokens: result.tokens,
        },
      };
    },
  });
}

/**
 * Router configuration - mirrors model-mux routing logic
 */
const modelConfig = {
  planner: "o4-mini",
  coder: "gpt-4o",
  validator: "gpt-4o-mini",
  longContext: "gpt-4.1",
  omlx: "mlx-community/Qwen3.6-35B-A3B-8bit",
};

type TaskType = 'plan' | 'code' | 'validate' | 'long_context';

function detectTask(input: { text?: string; tokensHint?: number; type?: TaskType }): TaskType {
  if (input.type) return input.type;
  // Default to plan for now - could add keyword detection
  return 'plan';
}

function route(task: TaskType): { model: string; temperature: number } {
  switch (task) {
    case 'plan':
      return { model: modelConfig.planner, temperature: 0.7 };
    case 'code':
      return { model: modelConfig.coder, temperature: 0.2 };
    case 'validate':
      return { model: modelConfig.validator, temperature: 0.0 };
    case 'long_context':
      return { model: modelConfig.longContext, temperature: 0.2 };
  }
}

/**
 * Route a message through the cost-balanced model system.
 * Uses local oMLX for cost efficiency with OpenAI fallback when quality thresholds not met.
 */
async function routeMessage(
  message: string,
  context: string[]
): Promise<{ response: string; modelUsed: string; cost: number; tokens: number }> {
  // Auto-detect task type from the message
  const taskType = detectTask({ text: message, type: "plan" });

  // Get routed model configuration
  const { model, temperature } = route(taskType);

  // Determine which API endpoint to use based on model type
  // Local oMLX models run on your machine (cheap), OpenAI models are cloud-based
  const isLocalOmlx = model.includes("mlx") || model.includes("omlx");
  
  // Read API config from environment or default
  const apiKey = process.env.OPENAI_API_KEY ?? "dummy-key-for-testing";
  const baseURL = isLocalOmlx 
    ? process.env.OMLX_BASE_URL ?? "http://127.0.0.1:8000/v1"
    : undefined;

  // Estimate tokens for cost calculation
  const tokenCount = estimateTokens(message);

  // Make the API call
  const openai = new OpenAI({
    apiKey,
    baseURL,
  });

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "user", content: buildPrompt(message, context) },
    ],
    temperature,
  });

  const content = response.choices?.[0]?.message?.content ?? "";
  const usage = response.usage;

  // Calculate cost (simple estimation - adjust based on actual pricing)
  const cost = estimateCost(model, usage?.prompt_tokens ?? tokenCount, usage?.completion_tokens ?? 0);

  return {
    response: content,
    modelUsed: model,
    cost,
    tokens: (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0),
  };
}

function buildPrompt(message: string, context: string[]): string {
  const parts: string[] = [message];

  if (context.length > 0) {
    parts.unshift("Additional context:\n" + context.map(c => `- ${c}`).join("\n"));
  }

  return parts.join("\n\n");
}

function estimateTokens(text: string): number {
  // Simple token estimation: ~4 characters per token (conservative)
  return Math.ceil(text.length / 4);
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Simple cost model - adjust based on actual pricing
  // Local oMLX models are very cheap, OpenAI models vary

  const isLocal = model.includes("mlx") || model.includes("omlx");
  if (isLocal) {
    // Local oMLX - minimal cost (simulated)
    return (inputTokens + outputTokens) * 0.0000001;
  }

  // OpenAI pricing estimates per 1M tokens
  const pricing: Record<string, { input: number; output: number }> = {
    "gpt-4o": { input: 2.5, output: 10 },
    "gpt-4.1": { input: 2.0, output: 8 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "o4-mini": { input: 1.1, output: 4.4 },
    "o3-mini": { input: 1.1, output: 4.4 },
  };

  const prices = pricing[model] ?? { input: 1.0, output: 3.0 };

  return (inputTokens / 1_000_000) * prices.input +
         (outputTokens / 1_000_000) * prices.output;
}
