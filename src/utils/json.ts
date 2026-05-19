export function extractJson(text: string): string {
  // Try to find the first JSON object in the string (supports code fences)
  const fence = text.match(/```(?:json)?\n([\s\S]*?)```/)
  if (fence) return fence[1].trim()
  // Fallback: naive first/last brace match
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return text.slice(start, end + 1)
  return text.trim()
}

export function tryParseJson<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
