// Shared free-text input parsing for onboarding and Settings (plan D11).

export interface ParsedDumbbells { weights: number[]; dropped: string[] }

const UNIT_SUFFIX = /(?:lbs?|pounds?|#)\.?$/i
const UNIT_ONLY = /^(?:lbs?|pounds?|#)\.?$/i

/** Tokenizes on whitespace/commas/semicolons, strips unit suffixes ('10lb', '15#') and
 * x-prefixed counts ('2x15' → 15), dedupes + sorts ascending, and reports tokens it could
 * not read so the UI can warn instead of silently discarding input. */
export function parseDumbbellInput(raw: string): ParsedDumbbells {
  const weights: number[] = []
  const dropped: string[] = []
  for (const token of raw.split(/[\s,;]+/)) {
    if (!token || UNIT_ONLY.test(token)) continue
    let cleaned = token.replace(UNIT_SUFFIX, '')
    const pair = /^\d+(?:\.\d+)?[x×](\d+(?:\.\d+)?)$/i.exec(cleaned)
    if (pair) cleaned = pair[1]
    const value = Number(cleaned)
    if (cleaned && Number.isFinite(value) && value > 0) weights.push(value)
    else dropped.push(token)
  }
  return { weights: [...new Set(weights)].sort((a, b) => a - b), dropped }
}

/** Canonical text form of a dumbbell list ('10, 15, 25'). */
export function formatDumbbells(weights: number[]): string { return weights.join(', ') }

/** Adds or removes one weight from a free-text dumbbell list, returning canonical text —
 * lets tap-to-toggle chips stay in sync with what the user typed. */
export function toggleDumbbell(raw: string, weight: number): string {
  const { weights } = parseDumbbellInput(raw)
  const next = weights.includes(weight) ? weights.filter((value) => value !== weight) : [...weights, weight].sort((a, b) => a - b)
  return formatDumbbells(next)
}

/** Parses a body-weight field held as a controlled string (so the input can sit empty while
 * editing instead of snapping to '0'). Returns null when blank or outside 80–500 lb. */
export function parseWeightLb(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const value = Number(trimmed)
  return Number.isFinite(value) && value >= 80 && value <= 500 ? value : null
}
