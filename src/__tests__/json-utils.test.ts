import { describe, it, expect } from 'vitest'
import { extractJson, tryParseJson } from '../utils/json.js'

describe('extractJson', () => {
  it('returns raw text when no braces are found', () => {
    expect(extractJson('no json here')).toBe('no json here')
    expect(extractJson('')).toBe('')
  })

  it('extracts JSON from markdown code fences with language tag', () => {
    const input = '```json\n{"key": "value"}\n```'
    expect(extractJson(input)).toBe('{"key": "value"}')
  })

  it('extracts JSON from markdown code fences without language tag', () => {
    const input = '```\n{"key": "value"}\n```'
    expect(extractJson(input)).toBe('{"key": "value"}')
  })

  it('extracts only the content inside code fences', () => {
    const input = 'Some text before\n```json\n{"a": 1}\n``` More text'
    expect(extractJson(input)).toBe('{"a": 1}')
  })

  it('extracts first JSON code fence when multiple exist', () => {
    const input = '```json\n{"first": true}\n```\n```json\n{"second": true}\n```'
    expect(extractJson(input)).toBe('{"first": true}')
  })

  it('falls back to brace matching when no code fences', () => {
    const input = '{"key": "value"}'
    expect(extractJson(input)).toBe('{"key": "value"}')
  })

  it('extracts first-to-last brace pair in nested JSON', () => {
    const input = '{"outer": {"inner": true}}'
    expect(extractJson(input)).toBe('{"outer": {"inner": true}}')
  })

  it('strips surrounding whitespace when no code fences', () => {
    const input = '  {"key": "value"}  '
    expect(extractJson(input)).toBe('{"key": "value"}')
  })

  it('handles empty braces gracefully', () => {
    expect(extractJson('{}')).toBe('{}')
    expect(extractJson('   {}  ')).toBe('{}')
  })

  it('returns full text when braces delimit the whole string', () => {
    const input = '{"a": 1, "b": 2}'
    expect(extractJson(input)).toBe('{"a": 1, "b": 2}')
  })

  it('handles missing closing brace', () => {
    const input = '{"key": "value"'
    expect(extractJson(input)).toBe('{"key": "value"')
  })

  it('returns trimmed text when no opening brace (missing {)', () => {
    const input = '"key": "value"}'
    // No { found, falls back to trim()
    expect(extractJson(input)).toBe('"key": "value"}')
  })
})

describe('tryParseJson', () => {
  it('parses valid JSON', () => {
    expect(tryParseJson('{"key": "value"}')).toEqual({ key: 'value' })
    expect(tryParseJson('["a", "b"]')).toEqual(['a', 'b'])
    expect(tryParseJson('42')).toBe(42)
    expect(tryParseJson('null')).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    expect(tryParseJson('{invalid}')).toBeNull()
    expect(tryParseJson('not json')).toBeNull()
    expect(tryParseJson('')).toBeNull()
    expect(tryParseJson('{[')).toBeNull()
  })
})
