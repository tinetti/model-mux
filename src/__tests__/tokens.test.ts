import { describe, it, expect } from 'vitest'
import { estimateTokens } from '../utils/tokens.js'

describe('estimateTokens', () => {
  it('estimates tokens for plain English text', () => {
    const text = 'Hello world'
    const tokens = estimateTokens(text)
    // "Hello world" = 12 chars, ~12/4 = 3 tokens (rounded up)
    expect(tokens).toBe(3)
  })

  it('estimates tokens for longer text', () => {
    const text = 'The quick brown fox jumps over the lazy dog'
    const tokens = estimateTokens(text)
    // 43 chars, ~43/4 = 10.75 -> 11
    expect(tokens).toBe(11)
  })

  it('estimates tokens for JSON objects by stringifying them', () => {
    const obj = { key: 'value', nested: { a: 1 } }
    const tokens = estimateTokens(obj)
    const jsonStr = JSON.stringify(obj)
    const expected = Math.ceil(jsonStr.length / 4)
    expect(tokens).toBe(expected)
  })

  it('handles empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('handles unicode characters (multi-byte)', () => {
    // Emoji is 4 bytes in UTF-8
    const text = '😀'
    const tokens = estimateTokens(text)
    // 4 bytes / 4 = 1
    expect(tokens).toBe(1)
  })

  it('produces a rough estimate consistent with ~4 chars per token', () => {
    const text = 'a'.repeat(20)
    const tokens = estimateTokens(text)
    expect(tokens).toBe(5)
  })
})
