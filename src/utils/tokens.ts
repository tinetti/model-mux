// Very rough token estimator: ~4 chars per token
export function estimateTokens(input: string | object): number {
  const text = typeof input === 'string' ? input : JSON.stringify(input)
  const chars = new TextEncoder().encode(text).length
  return Math.ceil(chars / 4)
}
