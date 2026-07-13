import { describe, expect, it } from 'vitest'
import { formatDumbbells, parseDumbbellInput, parseWeightLb, toggleDumbbell } from '../lib/parse'

describe('parseDumbbellInput', () => {
  it('parses a comma-separated list', () => {
    expect(parseDumbbellInput('10, 15, 25')).toEqual({ weights: [10, 15, 25], dropped: [] })
  })
  it('parses space-separated input (regression: "10 15" used to yield [])', () => {
    expect(parseDumbbellInput('10 15')).toEqual({ weights: [10, 15], dropped: [] })
  })
  it('parses semicolons and mixed separators', () => {
    expect(parseDumbbellInput('10;15, 25  30')).toEqual({ weights: [10, 15, 25, 30], dropped: [] })
  })
  it('strips lb/lbs/# unit suffixes (regression: "10lb, 15lb" used to yield [])', () => {
    expect(parseDumbbellInput('10lb, 15lbs, 25#')).toEqual({ weights: [10, 15, 25], dropped: [] })
    expect(parseDumbbellInput('20LB 35Lbs.')).toEqual({ weights: [20, 35], dropped: [] })
    expect(parseDumbbellInput('40pounds 45pound')).toEqual({ weights: [40, 45], dropped: [] })
  })
  it('silently ignores standalone unit words so "10 lb" does not warn', () => {
    expect(parseDumbbellInput('10 lb, 15 lbs')).toEqual({ weights: [10, 15], dropped: [] })
  })
  it('reads x-prefixed pair counts (regression: "2x15, 2x25" used to yield [])', () => {
    expect(parseDumbbellInput('2x15, 2x25')).toEqual({ weights: [15, 25], dropped: [] })
    expect(parseDumbbellInput('2X20 1×30')).toEqual({ weights: [20, 30], dropped: [] })
    expect(parseDumbbellInput('2x15lb')).toEqual({ weights: [15], dropped: [] })
  })
  it('keeps readable numbers and reports the rest (regression: "10 and 15" used to yield [])', () => {
    expect(parseDumbbellInput('10 and 15')).toEqual({ weights: [10, 15], dropped: ['and'] })
    expect(parseDumbbellInput('ten, 15')).toEqual({ weights: [15], dropped: ['ten'] })
  })
  it('dedupes and sorts ascending', () => {
    expect(parseDumbbellInput('25 10 10 15').weights).toEqual([10, 15, 25])
  })
  it('accepts decimals', () => {
    expect(parseDumbbellInput('12.5, 17.5lb').weights).toEqual([12.5, 17.5])
  })
  it('drops zero, negatives, and garbage numerics', () => {
    expect(parseDumbbellInput('0 -5 10')).toEqual({ weights: [10], dropped: ['0', '-5'] })
    expect(parseDumbbellInput('x15')).toEqual({ weights: [], dropped: ['x15'] })
  })
  it('handles empty and separator-only input', () => {
    expect(parseDumbbellInput('')).toEqual({ weights: [], dropped: [] })
    expect(parseDumbbellInput('  ,;  ')).toEqual({ weights: [], dropped: [] })
  })
})

describe('toggleDumbbell', () => {
  it('adds a weight not in the list, in sorted position', () => {
    expect(toggleDumbbell('10, 25', 15)).toBe('10, 15, 25')
  })
  it('removes a weight already in the list', () => {
    expect(toggleDumbbell('10, 15, 25', 15)).toBe('10, 25')
  })
  it('starts a list from empty text', () => {
    expect(toggleDumbbell('', 10)).toBe('10')
  })
  it('canonicalizes messy text while toggling', () => {
    expect(toggleDumbbell('10lb and 15', 20)).toBe('10, 15, 20')
  })
  it('recognizes weights typed with unit suffixes when removing', () => {
    expect(toggleDumbbell('10lb 15lb', 10)).toBe('15')
  })
})

describe('formatDumbbells', () => {
  it('joins with comma-space', () => {
    expect(formatDumbbells([10, 15, 25])).toBe('10, 15, 25')
    expect(formatDumbbells([])).toBe('')
  })
})

describe('parseWeightLb', () => {
  it('returns null for empty or whitespace (regression: clearing the field snapped to 0)', () => {
    expect(parseWeightLb('')).toBeNull()
    expect(parseWeightLb('   ')).toBeNull()
  })
  it('parses plain and decimal weights', () => {
    expect(parseWeightLb('185')).toBe(185)
    expect(parseWeightLb('185.5')).toBe(185.5)
    expect(parseWeightLb(' 165 ')).toBe(165)
  })
  it('tolerates a stray leading zero (regression: retyping produced "0185")', () => {
    expect(parseWeightLb('0185')).toBe(185)
  })
  it('rejects out-of-range and non-numeric values', () => {
    expect(parseWeightLb('0')).toBeNull()
    expect(parseWeightLb('79')).toBeNull()
    expect(parseWeightLb('501')).toBeNull()
    expect(parseWeightLb('abc')).toBeNull()
  })
  it('accepts the range boundaries', () => {
    expect(parseWeightLb('80')).toBe(80)
    expect(parseWeightLb('500')).toBe(500)
  })
})
