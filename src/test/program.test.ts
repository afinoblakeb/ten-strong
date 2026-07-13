import { describe, expect, it } from 'vitest'
import { exercises } from '../data/exercises'
import { fullProgram, phaseForDay, templateById } from '../data/program'

describe('90-day program', () => {
  it('defines exactly 90 continuous days with valid references', () => {
    expect(fullProgram).toHaveLength(90)
    expect(fullProgram.map((day) => day.day)).toEqual(Array.from({ length:90 }, (_, index) => index + 1))
    fullProgram.forEach((day) => expect(templateById[day.templateId]).toBeDefined())
  })

  it.each([[1,1],[14,1],[15,2],[35,2],[36,3],[63,3],[64,4],[84,4],[85,5],[90,5]])('maps Day %i to Phase %i', (day, phase) => {
    expect(phaseForDay(day).id).toBe(phase)
  })

  it('gives every exercise complete coaching metadata', () => {
    exercises.forEach((exercise) => {
      expect(exercise.cues.length).toBeGreaterThanOrEqual(2)
      expect(exercise.cues.length).toBeLessThanOrEqual(4)
      expect(exercise.regression).toBeTruthy()
      expect(exercise.standard).toBeTruthy()
      expect(exercise.progression).toBeTruthy()
      expect(exercise.noEquipment).toBeTruthy()
      expect(exercise.warning).toBeTruthy()
      expect(exercise.mistakes.length).toBeGreaterThan(0)
    })
  })

  it('uses a calm Day 1 assessment and a final comparable assessment', () => {
    expect(fullProgram[0].templateId).toBe('assessment')
    expect(fullProgram[88].kind).toBe('recovery')
    expect(fullProgram[89].templateId).toBe('final-assessment')
  })

  it('can resolve every day in a full simulated challenge without a missing exercise', () => {
    fullProgram.forEach((day) => {
      const template=templateById[day.templateId]
      expect(template.items.length).toBeGreaterThan(0)
      template.items.forEach((item) => expect(exercises.some((exercise) => exercise.id===item.exerciseId)).toBe(true))
    })
  })
})
