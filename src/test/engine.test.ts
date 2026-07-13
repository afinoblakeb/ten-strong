import { describe, expect, it } from 'vitest'
import { adaptivePrescription, calculateProgression, getChallengeDay, recommendationFor, recommendationForDay } from '../lib/engine'
import { createDefaultData } from '../lib/storage'
import type { Readiness, SessionLog, SetLog, WorkoutItem } from '../types'

const base: Readiness = { energy:'normal', soreness:'none', pain:'none', availableWeight:10, minutes:10 }
const item: WorkoutItem = { exerciseId:'goblet-squat', sets:2, repMin:8, repMax:12, tempo:'3–1–1', restSeconds:20 }
const logs = (reps:number, rir:number, discomfort=false): SetLog[] => [1,2].map((setNumber)=>({ id:String(setNumber), exerciseId:'goblet-squat', setNumber, reps, weight:10, rir, discomfort, completed:true }))

describe('readiness', () => {
  it('always gives reported pain precedence', () => {
    for (const energy of ['low','normal','high'] as const) for (const soreness of ['none','mild','significant'] as const) for (const minutes of [5,10] as const) {
      expect(recommendationFor({ ...base,energy,soreness,minutes,pain:'present' },'strength').mode).toBe('stop')
    }
  })
  it('uses recovery for significant soreness even with only five minutes', () => expect(recommendationFor({ ...base,soreness:'significant',minutes:5 },'strength').mode).toBe('recovery'))
  it('uses the dedicated fallback when time is short', () => expect(recommendationFor({ ...base,minutes:5 },'strength').mode).toBe('minimum'))
  it('reduces volume for low energy or mild soreness', () => {
    expect(recommendationFor({ ...base,energy:'low' },'strength').mode).toBe('reduced')
    expect(recommendationFor({ ...base,soreness:'mild' },'strength').mode).toBe('reduced')
  })
})

describe('progression', () => {
  it('adds the next available weight at the top of the range with 2+ RIR', () => expect(calculateProgression(logs(12,2),item,[10,15,25])).toMatchObject({ action:'increase-weight', nextTarget:8 }))
  it('uses a harder variation when no heavier weight exists', () => expect(calculateProgression(logs(12,3),item,[10])).toMatchObject({ action:'harder-variation' }))
  it('does not progress after failure or a missed lower target', () => expect(calculateProgression(logs(7,0),item,[10,15])).toMatchObject({ action:'reduce' }))
  it('lets discomfort veto progression', () => expect(calculateProgression(logs(12,3,true),item,[10,15])).toMatchObject({ action:'reduce' }))
})

describe('calendar date calculation', () => {
  it('treats the start date as Day 1 and caps at Day 90', () => {
    expect(getChallengeDay('2026-07-12',new Date(2026,6,12,23,30))).toBe(1)
    expect(getChallengeDay('2026-07-12',new Date(2026,6,13,0,30))).toBe(2)
    expect(getChallengeDay('2025-01-01',new Date(2026,6,12))).toBe(90)
  })
  it('does not shift a local date around daylight-saving boundaries', () => {
    expect(getChallengeDay('2026-03-07',new Date(2026,2,9,12))).toBe(3)
    expect(getChallengeDay('2026-10-31',new Date(2026,10,2,12))).toBe(3)
  })
})

describe('real challenge adaptation', () => {
  it('actually reduces the first week and a seven-day re-entry', () => {
    const data=createDefaultData(); data.profile.onboardingComplete=true
    expect(recommendationForDay(data,2,base,'strength')).toMatchObject({ mode:'reduced',setMultiplier:0.5 })
    expect(recommendationForDay(data,8,base,'strength')).toMatchObject({ mode:'reduced',title:'Welcome-back session',setMultiplier:0.5 })
  })

  it('requires two qualifying exposures before increasing weight', () => {
    const data=createDefaultData(); data.profile.dumbbells=[10,15,25]
    const session=(day:number):SessionLog=>({id:`s${day}`,day,date:`2026-07-${day}`,templateId:'foundation-a',mode:'normal',status:'completed',durationSeconds:600,readiness:base,sets:logs(12,2).map((log)=>({...log,id:`${day}-${log.id}`,targetReps:12,formQuality:'good',variation:'Goblet squat'}))})
    data.sessions=[session(2)]
    expect(adaptivePrescription(data,item,25).action).not.toBe('increase-weight')
    data.sessions.push(session(9))
    expect(adaptivePrescription(data,item,25)).toMatchObject({ action:'increase-weight',weight:15,repMin:8,repMax:8 })
  })

  it('lets form breakdown veto an otherwise strong performance', () => {
    const data=createDefaultData(); data.profile.dumbbells=[10,15]
    data.sessions=[{id:'s1',day:2,date:'2026-07-02',templateId:'foundation-a',mode:'normal',status:'completed',durationSeconds:600,readiness:base,sets:logs(12,3).map((log)=>({...log,formQuality:'degraded',targetReps:12}))}]
    expect(adaptivePrescription(data,item,15)).toMatchObject({ action:'reduce',variation:'Chair squat' })
  })
  it('drops to a regression when the only dumbbell was too heavy', () => {
    const data=createDefaultData(); data.profile.dumbbells=[25]
    data.sessions=[{id:'heavy',day:2,date:'2026-07-02',templateId:'foundation-a',mode:'normal',status:'partial',durationSeconds:400,readiness:{...base,availableWeight:25},sets:logs(5,0).map((log)=>({...log,weight:25,targetReps:8}))}]
    expect(adaptivePrescription(data,item,25)).toMatchObject({action:'reduce',weight:null,variation:'Chair squat'})
  })

  it('compensates when a previously used heavier dumbbell is unavailable', () => {
    const data=createDefaultData(); data.profile.dumbbells=[10,25]
    data.sessions=[{id:'travel',day:20,date:'2026-07-20',templateId:'foundation-a',mode:'normal',status:'completed',durationSeconds:600,readiness:{...base,availableWeight:25},sets:logs(10,2).map((log)=>({...log,weight:25,targetReps:12}))}]
    expect(adaptivePrescription(data,item,10)).toMatchObject({action:'harder-variation',weight:10,variation:'Paused 1½-rep goblet squat'})
  })

  it('repeats the recorded Day 1 setup for the final assessment', () => {
    const data=createDefaultData(); data.assessments=[{id:'a1',date:'2026-07-01',day:1,metric:'clean repetitions',value:10,unit:'reps',exerciseId:'goblet-squat',weight:10,variation:'Goblet squat'}]
    expect(adaptivePrescription(data,item,25,'final')).toMatchObject({ weight:10,variation:'Goblet squat' })
  })
  it('never assumes unstable furniture is available', () => {
    const data=createDefaultData(); data.profile.hasSturdyChair=false
    const pushItem:WorkoutItem={exerciseId:'incline-pushup',sets:1,repMin:5,repMax:10,tempo:'2–1–1',restSeconds:10}
    expect(adaptivePrescription(data,pushItem,null,'baseline')).toMatchObject({ variation:'Wall push-up',weight:null })
  })
})
