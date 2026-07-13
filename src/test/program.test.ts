import { describe, expect, it } from 'vitest'
import { exerciseById, exercises } from '../data/exercises'
import { bodyweightTemplateFor, continuationCycle, fullProgram, phaseForDay, programForDay, resolveTemplateById, templateById, templates } from '../data/program'

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
      expect(exercise.instructions.purpose.length).toBeGreaterThan(20)
      expect(exercise.instructions.setup.length).toBeGreaterThanOrEqual(2)
      expect(exercise.instructions.motion.length).toBeGreaterThanOrEqual(3)
      expect(exercise.instructions.breathing.length).toBeGreaterThan(15)
      expect(exercise.instructions.feel.length).toBeGreaterThan(15)
    })
  })

  it('has a unique written motion sequence for every exercise', () => {
    const sequences=exercises.map((exercise)=>exercise.instructions.motion.join('|'))
    expect(new Set(sequences).size).toBe(exercises.length)
  })

  it('uses a calm Day 1 assessment and a final comparable assessment', () => {
    expect(fullProgram[0].templateId).toBe('assessment')
    expect(fullProgram[88].kind).toBe('recovery')
    expect(fullProgram[89].templateId).toBe('final-assessment')
  })

  it('continues after Day 90 without resetting history or repeating the assessment', () => {
    expect(programForDay(91)).toMatchObject({day:91,templateId:'recovery',kind:'recovery'})
    expect(Array.from({length:7},(_,index)=>programForDay(91+index).templateId)).toEqual(continuationCycle)
    expect(programForDay(98).templateId).toBe('recovery')
  })

  it('makes every recovery day a structured ten-minute mobility session', () => {
    const recoveryTemplates=templates.filter((template)=>template.kind==='recovery')
    expect(recoveryTemplates.length).toBeGreaterThanOrEqual(3)
    recoveryTemplates.forEach((template)=>{
      expect(template.items.length).toBeGreaterThanOrEqual(5)
      expect(template.items.reduce((seconds,item)=>seconds+(item.seconds??0)*item.sets,0)).toBe(600)
      template.items.forEach((item)=>{
        expect(item.seconds).toBeGreaterThan(0)
        expect(exerciseById[item.exerciseId].pattern).toBe('recovery')
        expect(exerciseById[item.exerciseId].equipment.join(' ')).not.toMatch(/dumbbell|weight/i)
      })
    })
  })

  it('can resolve every day in a full simulated challenge without a missing exercise', () => {
    fullProgram.forEach((day) => {
      const template=templateById[day.templateId]
      expect(template.items.length).toBeGreaterThan(0)
      template.items.forEach((item) => expect(exercises.some((exercise) => exercise.id===item.exerciseId)).toBe(true))
    })
  })

  it('creates a complete zero-dumbbell queue for every workout template', () => {
    templates.forEach((template) => {
      const bodyweight=bodyweightTemplateFor(template)
      expect(bodyweight.id).toBe(`${template.id}--bodyweight`)
      expect(resolveTemplateById(bodyweight.id)).toEqual(bodyweight)
      expect(bodyweight.items).toHaveLength(template.items.length)
      bodyweight.items.forEach((item) => {
        const exercise=exerciseById[item.exerciseId]
        expect(exercise).toBeDefined()
        expect(exercise.equipment.join(' ')).not.toMatch(/dumbbell|backpack|bottle|weight/i)
      })
    })
  })

  it('keeps travel versions separate from loaded movement progression', () => {
    expect(bodyweightTemplateFor(templateById['foundation-a']).items.map((item)=>item.exerciseId)).toEqual(['wall-pushup','bodyweight-squat','dead-bug'])
    expect(bodyweightTemplateFor(templateById['foundation-b']).items.map((item)=>item.exerciseId)).toEqual(['prone-w','glute-bridge','side-plank'])
    expect(bodyweightTemplateFor(templateById['unilateral']).items.map((item)=>item.exerciseId)).toEqual(['pike-press','bodyweight-split-squat','tall-march'])
  })

  it.each([[2,8],[15,21],[36,42],[64,70]])('covers every foundational pattern across Days %i–%i', (start,end) => {
    const patterns=new Set(fullProgram.filter((day)=>day.day>=start&&day.day<=end).flatMap((day)=>templateById[day.templateId].items.map((item)=>exercises.find((exercise)=>exercise.id===item.exerciseId)!.pattern)))
    for(const pattern of ['push','pull','squat','hinge','unilateral','trunk','carry']) expect(patterns.has(pattern as never)).toBe(true)
  })
})
