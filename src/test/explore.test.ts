import { describe, expect, it } from 'vitest'
import { calendarCellClass, calendarDayStatus, calendarGlyph, calendarStatusLabel, formatWeightLb, latestWeightLb, proteinRange, searchExercises } from '../pages/ExplorePages'
import { exercises } from '../data/exercises'
import { challengeDateForDay, formatISODate } from '../lib/date'
import type { AppData, SessionLog, SessionStatus } from '../types'

const log = (status: SessionStatus, activitySeconds?: number, durationSeconds = 0): SessionLog =>
  ({ id: 'x', day: 1, date: '2026-07-01', templateId: 't', mode: 'full', status, durationSeconds, activitySeconds, readiness: {}, sets: [] }) as unknown as SessionLog

describe('calendarDayStatus', () => {
  it('returns the logged status for completed / recovery / safety days', () => {
    expect(calendarDayStatus(log('completed', 700), 3, 10)).toBe('completed')
    expect(calendarDayStatus(log('recovery', 620), 3, 10)).toBe('recovery')
    expect(calendarDayStatus(log('safety', 120), 3, 10)).toBe('safety')
  })
  it('upgrades a partial with ten active minutes to practiced', () => {
    expect(calendarDayStatus(log('partial', 640), 3, 10)).toBe('practiced')
  })
  it('falls back to durationSeconds for legacy partials without activitySeconds', () => {
    expect(calendarDayStatus(log('partial', undefined, 700), 3, 10)).toBe('practiced')
  })
  it('keeps a short partial as partial', () => {
    expect(calendarDayStatus(log('partial', 300, 300), 3, 10)).toBe('partial')
  })
  it('marks unlogged past days missed, the current day today, and future days upcoming', () => {
    expect(calendarDayStatus(undefined, 4, 10)).toBe('missed')
    expect(calendarDayStatus(undefined, 10, 10)).toBe('today')
    expect(calendarDayStatus(undefined, 11, 10)).toBe('upcoming')
    expect(calendarDayStatus(undefined, 90, 10)).toBe('upcoming')
  })
  it('a logged day wins over the today fallback', () => {
    expect(calendarDayStatus(log('completed', 650), 10, 10)).toBe('completed')
  })
})

describe('challengeDateForDay', () => {
  it('maps challenge days to local calendar dates across weeks and years', () => {
    expect(formatISODate(challengeDateForDay('2026-07-13', 1))).toBe('2026-07-13')
    expect(formatISODate(challengeDateForDay('2026-07-13', 8))).toBe('2026-07-20')
    expect(formatISODate(challengeDateForDay('2026-12-30', 4))).toBe('2027-01-02')
  })
})

describe('calendarCellClass', () => {
  it('namespaces status and kind so they can never collide', () => {
    expect(calendarCellClass('completed', 'strength')).toBe('day-cell is-completed kind-strength')
    expect(calendarCellClass('upcoming', 'recovery')).toBe('day-cell is-upcoming kind-recovery')
  })
  it('regression: a future mobility day never carries a bare status class that styles it as done', () => {
    const classes = calendarCellClass('upcoming', 'recovery').split(' ')
    expect(classes).not.toContain('recovery')
    expect(classes).not.toContain('completed')
    expect(classes).toContain('is-upcoming')
  })
})

describe('calendarGlyph / calendarStatusLabel', () => {
  it('maps every status to a legend glyph', () => {
    expect(calendarGlyph('completed', 'strength')).toBe('✓')
    expect(calendarGlyph('practiced', 'strength')).toBe('✓')
    expect(calendarGlyph('recovery', 'recovery')).toBe('○')
    expect(calendarGlyph('partial', 'strength')).toBe('½')
    expect(calendarGlyph('safety', 'strength')).toBe('!')
    expect(calendarGlyph('missed', 'strength')).toBe('—')
    expect(calendarGlyph('today', 'strength')).toBe('•')
  })
  it('hints at upcoming assessment and mobility days without claiming them done', () => {
    expect(calendarGlyph('upcoming', 'assessment')).toBe('A')
    expect(calendarGlyph('upcoming', 'recovery')).toBe('○')
    expect(calendarGlyph('upcoming', 'strength')).toBe('')
  })
  it('labels every status for screen readers', () => {
    const statuses = ['completed', 'practiced', 'partial', 'recovery', 'safety', 'missed', 'today', 'upcoming'] as const
    statuses.forEach((status) => expect(calendarStatusLabel(status)).toBeTruthy())
    expect(calendarStatusLabel('recovery')).toContain('mobility')
  })
})

describe('proteinRange / latestWeightLb', () => {
  it('computes 1.4–1.7 g/kg from pounds (205 lb → 130–158 g)', () => {
    expect(proteinRange(205)).toEqual({ kg: 93, low: 130, high: 158 })
  })
  it('is weight-sensitive, not hardcoded to 140 lb', () => {
    expect(proteinRange(140)).toEqual({ kg: 64, low: 89, high: 108 })
    expect(proteinRange(140)).not.toEqual(proteinRange(205))
  })
  it('prefers the latest logged body weight and falls back to the profile', () => {
    const data = { bodyWeights: [{ date: '2026-07-01', weightLb: 210 }, { date: '2026-07-10', weightLb: 205.4 }], profile: { weightLb: 215 } } as unknown as AppData
    expect(latestWeightLb(data)).toBe(205.4)
    expect(latestWeightLb({ bodyWeights: [], profile: { weightLb: 215 } } as unknown as AppData)).toBe(215)
  })
})

describe('formatWeightLb', () => {
  it('regression: float noise never renders (142.45000000000002 → 142.5)', () => {
    expect(formatWeightLb(142.45000000000002)).toBe('142.5')
  })
  it('keeps whole numbers clean', () => {
    expect(formatWeightLb(180)).toBe('180')
    expect(formatWeightLb(180.04)).toBe('180')
  })
})

describe('searchExercises', () => {
  it('filters by name, case-insensitively, within a pattern', () => {
    const hits = searchExercises(exercises, 'all', 'cat-cow')
    expect(hits.map((exercise) => exercise.id)).toContain('cat-cow-flow')
    expect(searchExercises(exercises, 'recovery', 'CAT').every((exercise) => exercise.pattern === 'recovery')).toBe(true)
  })
  it('returns everything for a blank query and nothing for a miss', () => {
    expect(searchExercises(exercises, 'all', '  ')).toHaveLength(exercises.length)
    expect(searchExercises(exercises, 'all', 'zzz-not-a-movement')).toHaveLength(0)
  })
})
