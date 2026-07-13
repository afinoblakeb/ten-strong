import { describe, expect, it } from 'vitest'
import { activeSecondsForSet, adaptivePrescription, adjustedSetCount, consistencyRate, getChallengeDay, getProgramDay, recentDaysInfo, recommendationFor, recommendationForDay, sessionStatus, setComparisonKey, streakInfo, targetRirForDay, templateForMode, trainingTemplateForDay, usesDumbbell } from '../lib/engine'
import { createDefaultData } from '../lib/storage'
import { templateById } from '../data/program'
import { exerciseById } from '../data/exercises'
import type { AdaptivePrescription } from '../lib/engine'
import type { AppData, Readiness, RecommendationMode, SessionLog, SetLog, WorkoutItem } from '../types'

const base: Readiness = { energy:'normal', soreness:'none', pain:'none', hasDumbbells:true, availableWeight:10, minutes:10 }
const item: WorkoutItem = { exerciseId:'goblet-squat', sets:2, repMin:8, repMax:12, tempo:'3–1–1', restSeconds:20 }
const logs = (reps:number, rir:number, discomfort=false): SetLog[] => [1,2].map((setNumber)=>({ id:String(setNumber), exerciseId:'goblet-squat', setNumber, reps, weight:10, rir, discomfort, completed:true }))
const session = (day:number, sets:SetLog[], templateId='foundation-a', mode:RecommendationMode='normal'): SessionLog => ({ id:`s${day}`, day, date:'2026-07-01', templateId, mode, status:'completed', durationSeconds:600, activitySeconds:600, readiness:base, sets })
const gobletSets = (over:Partial<SetLog>): SetLog[] => [1,2].map((setNumber)=>({ exerciseId:'goblet-squat', setNumber, reps:8, weight:10, rir:2, formQuality:'good' as const, variation:'Goblet squat', completed:true, ...over, id:`g${setNumber}` }))
const seeded = (sessions:SessionLog[], dumbbells=[10,15,20,25]): AppData => { const data=createDefaultData(); data.profile.dumbbells=dumbbells; data.sessions=sessions; return data }

describe('readiness', () => {
  it('always gives reported pain precedence', () => {
    for (const energy of ['low','normal','high'] as const) for (const soreness of ['none','mild','significant'] as const) for (const minutes of [5,10] as const) {
      expect(recommendationFor({ ...base,energy,soreness,minutes,pain:'present' },'strength').mode).toBe('stop')
    }
  })
  it('uses recovery for significant soreness even with only five minutes', () => expect(recommendationFor({ ...base,soreness:'significant',minutes:5 },'strength').mode).toBe('recovery'))
  it('keeps the ten-minute daily contract when legacy readiness says five minutes', () => expect(recommendationFor({ ...base,minutes:5 },'strength').mode).toBe('normal'))
  it('reduces volume for low energy or mild soreness', () => {
    expect(recommendationFor({ ...base,energy:'low' },'strength').mode).toBe('reduced')
    expect(recommendationFor({ ...base,soreness:'mild' },'strength').mode).toBe('reduced')
  })
  it('pain mode never emits an active-effort RIR line', () => {
    expect(targetRirForDay(70,'stop')).not.toMatch(/\d–\d reps in reserve/)
    expect(targetRirForDay(70,'stop')).toMatch(/rest/i)
  })
})

describe('calendar date calculation', () => {
  it('treats the start date as Day 1 and caps at Day 90', () => {
    expect(getChallengeDay('2026-07-12',new Date(2026,6,12,23,30))).toBe(1)
    expect(getChallengeDay('2026-07-12',new Date(2026,6,13,0,30))).toBe(2)
    expect(getChallengeDay('2025-01-01',new Date(2026,6,12))).toBe(90)
    expect(getProgramDay('2025-01-01',new Date(2026,6,12))).toBeGreaterThan(90)
  })
  it('does not shift a local date around daylight-saving boundaries', () => {
    expect(getChallengeDay('2026-03-07',new Date(2026,2,9,12))).toBe(3)
    expect(getChallengeDay('2026-10-31',new Date(2026,10,2,12))).toBe(3)
  })
})

describe('progression core (D1)', () => {
  it('in-range performance below max never regresses', () => {
    // Legacy log format: targetReps stored the range MAX (12) while the user honestly did 8 of a 6–12 ask.
    const data=seeded([session(2,gobletSets({reps:8,targetReps:12}))])
    const next=adaptivePrescription(data,item,25)
    expect(next.action).not.toBe('reduce')
    expect(next.action).toBe('increase-reps')
    expect(next.repMin).toBe(9)
    expect(next.explanation).not.toMatch(/missed the lower target/i)
  })

  it('unloaded exposure never jumps to heaviest dumbbell', () => {
    // Day 1 loaded at 10 lb, then an unloaded regression day the old engine used to catapult to 25 lb.
    const data=seeded([
      session(2,gobletSets({reps:8,targetReps:8,targetRepMax:12})),
      session(4,gobletSets({reps:8,weight:undefined,variation:'Chair squat',targetReps:8,targetRepMax:12})),
    ])
    const next=adaptivePrescription(data,item,25)
    expect(next.variation).toBe('Goblet squat')
    expect(next.weight).toBe(10)
  })

  it('returning to load with no loaded history starts at the lightest dumbbell', () => {
    const data=seeded([session(2,gobletSets({reps:8,weight:undefined,variation:'Chair squat',targetReps:8,targetRepMax:12}))])
    const next=adaptivePrescription(data,item,25)
    expect(next.variation).toBe('Goblet squat')
    expect(next.weight).toBe(10)
  })

  it('phase-4 rir=1 exposures still progress', () => {
    const data=seeded([session(70,gobletSets({reps:9,rir:1,targetReps:9,targetRepMax:12}),'strength-a')])
    const next=adaptivePrescription(data,item,25)
    expect(next.action).toBe('increase-reps')
    expect(next.repMin).toBe(10)
  })

  it('walks the full rep range before any weight jump', () => {
    // Clean at 9 with rir 3 does NOT jump weight: the range top (12) has not been reached yet.
    const data=seeded([session(10,gobletSets({reps:9,rir:3,targetReps:9,targetRepMax:12}))])
    const next=adaptivePrescription(data,item,25)
    expect(next.action).toBe('increase-reps')
    expect(next).toMatchObject({repMin:10,repMax:12,weight:10})
  })

  it('jumps to the next heavier dumbbell after a clean top-of-range exposure with two in reserve and resets to the floor', () => {
    const data=seeded([session(10,gobletSets({reps:12,targetReps:12,targetRepMax:12}))])
    expect(adaptivePrescription(data,item,25)).toMatchObject({action:'increase-weight',weight:15,repMin:8,repMax:12})
  })

  it('legacy top-of-range logs (targetReps stored as max) still earn the weight jump', () => {
    const data=seeded([session(10,gobletSets({reps:12,targetReps:12}))])
    expect(adaptivePrescription(data,item,25)).toMatchObject({action:'increase-weight',weight:15})
  })

  it('holds the top target when the range is topped with only one rep in reserve', () => {
    const data=seeded([session(10,gobletSets({reps:12,rir:1,targetReps:12,targetRepMax:12}))])
    const next=adaptivePrescription(data,item,25)
    expect(next.action).toBe('repeat')
    expect(next.repMin).toBe(12)
    expect(next.weight).toBe(10)
  })

  it('harder variation becomes a tracked state after the heaviest dumbbell', () => {
    const data=seeded([session(10,gobletSets({reps:12,weight:25,targetReps:12,targetRepMax:12}))])
    const progressed=adaptivePrescription(data,item,25)
    expect(progressed).toMatchObject({action:'harder-variation',variation:'Paused 1½-rep goblet squat',repMin:8})
    // The variation now walks its own rep ladder.
    data.sessions.push(session(12,gobletSets({reps:8,weight:25,variation:'Paused 1½-rep goblet squat',targetReps:8,targetRepMax:12})))
    const laddered=adaptivePrescription(data,item,25)
    expect(laddered).toMatchObject({action:'increase-reps',repMin:9,variation:'Paused 1½-rep goblet squat'})
  })

  it('a single miss repeats the target instead of regressing', () => {
    const data=seeded([session(10,gobletSets({reps:5,rir:0,weight:25,targetReps:8,targetRepMax:12}))],[25])
    const next=adaptivePrescription(data,item,25)
    expect(next.action).toBe('repeat')
    expect(next.variation).toBe('Goblet squat')
    expect(next.explanation).not.toMatch(/missed the lower target/i)
  })

  it('two consecutive misses regress to a lighter load or the regression', () => {
    const heavy=(day:number)=>session(day,gobletSets({reps:5,rir:0,weight:25,targetReps:8,targetRepMax:12}))
    expect(adaptivePrescription(seeded([heavy(8),heavy(10)]),item,25)).toMatchObject({action:'reduce',weight:20,variation:'Goblet squat'})
    expect(adaptivePrescription(seeded([heavy(8),heavy(10)],[25]),item,25)).toMatchObject({action:'reduce',weight:null,variation:'Chair squat'})
  })

  it('lets discomfort or form breakdown veto immediately without load', () => {
    expect(adaptivePrescription(seeded([session(2,gobletSets({reps:12,rir:3,discomfort:true}))],[10,15]),item,15)).toMatchObject({action:'reduce',weight:null,variation:'Chair squat'})
    expect(adaptivePrescription(seeded([session(2,gobletSets({reps:12,rir:3,formQuality:'degraded',targetReps:12}))],[10,15]),item,15)).toMatchObject({action:'reduce',weight:null,variation:'Chair squat'})
  })

  it('never pairs weight with a regression variation, even from legacy logs that did', () => {
    // The old engine wrote 'Chair squat at 15 lb'; a repeat must not re-serve that pairing.
    const data=seeded([session(10,gobletSets({reps:5,weight:15,variation:'Chair squat',targetReps:8,targetRepMax:12}))])
    const next=adaptivePrescription(data,item,25)
    expect(next.variation).toBe('Chair squat')
    expect(next.weight).toBeNull()
  })

  it('first exposure never attaches load to a bodyweight movement', () => {
    const data=seeded([])
    const pushItem:WorkoutItem={exerciseId:'incline-pushup',sets:2,repMin:6,repMax:12,tempo:'3–1–1',restSeconds:15}
    expect(adaptivePrescription(data,pushItem,25).weight).toBeNull()
    expect(adaptivePrescription(data,pushItem,25,'baseline').weight).toBeNull()
    const plankItem:WorkoutItem={exerciseId:'side-plank',sets:1,seconds:20,tempo:'steady',restSeconds:20}
    expect(adaptivePrescription(data,plankItem,25,'baseline').weight).toBeNull()
  })

  it('first loaded exposure starts at the lightest dumbbell, never the heaviest', () => {
    expect(adaptivePrescription(seeded([]),item,25)).toMatchObject({action:'start',weight:10,variation:'Goblet squat'})
  })

  it('compensates when a previously used heavier dumbbell is unavailable', () => {
    const data=seeded([session(20,gobletSets({reps:10,weight:25,targetReps:10,targetRepMax:12}))],[10,25])
    expect(adaptivePrescription(data,item,10)).toMatchObject({action:'harder-variation',weight:10,variation:'Paused 1½-rep goblet squat'})
  })

  it('prescribes conservatively after a seven-day gap instead of progressing', () => {
    const data=seeded([session(1,gobletSets({reps:12,weight:15,targetReps:12,targetRepMax:12}))])
    data.profile.onboardingComplete=true
    const next=adaptivePrescription(data,item,25,undefined,true,12)
    expect(next.action).toBe('repeat')
    expect(next.weight).toBe(10)
    expect(['increase-weight','harder-variation']).not.toContain(next.action)
    expect(recommendationForDay(data,12,base,'strength')).toMatchObject({mode:'reduced',title:'Welcome-back session'})
  })

  it('never assumes unstable furniture is available', () => {
    const data=createDefaultData(); data.profile.hasSturdyChair=false
    const pushItem:WorkoutItem={exerciseId:'incline-pushup',sets:1,repMin:5,repMax:10,tempo:'2–1–1',restSeconds:10}
    expect(adaptivePrescription(data,pushItem,null,'baseline')).toMatchObject({ variation:'Wall push-up',weight:null })
  })

  it('serves the bodyweight variation without load when no dumbbells are available', () => {
    expect(adaptivePrescription(seeded([]),item,25,undefined,false)).toMatchObject({weight:null,variation:'Tempo chair squat'})
  })
})

describe('assessments (D7)', () => {
  it('missed day-1 baseline served on day 3', () => {
    const data=createDefaultData()
    expect(trainingTemplateForDay(data,3).templateId).toBe('assessment')
    expect(trainingTemplateForDay(data,7).templateId).toBe('assessment')
    expect(trainingTemplateForDay(data,8).templateId).not.toBe('assessment')
  })
  it('stops serving the baseline once one exists', () => {
    const data=seeded([session(3,gobletSets({reps:8}),'assessment')])
    expect(trainingTemplateForDay(data,4).templateId).not.toBe('assessment')
  })
  it('serves the final assessment on the next active day through day 97', () => {
    const data=createDefaultData()
    data.sessions=[session(3,gobletSets({reps:8}),'assessment')]
    expect(trainingTemplateForDay(data,92).templateId).toBe('final-assessment')
    expect(trainingTemplateForDay(data,97).templateId).toBe('final-assessment')
    expect(trainingTemplateForDay(data,98).templateId).not.toBe('final-assessment')
    data.sessions.push(session(92,gobletSets({reps:8}),'final-assessment'))
    expect(trainingTemplateForDay(data,93).templateId).not.toBe('final-assessment')
  })
  it('repeats the earliest recorded baseline setup for the final assessment, not literally day 1', () => {
    const data=createDefaultData()
    data.assessments=[{id:'a1',date:'2026-07-03',day:3,metric:'clean repetitions',value:10,unit:'reps',exerciseId:'goblet-squat',weight:10,variation:'Goblet squat'}]
    const final=adaptivePrescription(data,item,25,'final')
    expect(final).toMatchObject({weight:10,variation:'Goblet squat'})
    expect(final.explanation).toContain('Day 3')
  })
  it('strips phantom weight from unloaded movements in the final assessment', () => {
    const data=createDefaultData()
    data.assessments=[{id:'a2',date:'2026-07-01',day:1,metric:'hold',value:20,unit:'seconds',exerciseId:'side-plank',weight:10,variation:'Full side plank'}]
    expect(adaptivePrescription(data,{exerciseId:'side-plank',sets:1,seconds:60,tempo:'steady',restSeconds:20},25,'final').weight).toBeNull()
  })
})

describe('tier qualification (D2)', () => {
  const qualifying=(day:number,over:Partial<SetLog>={}):SessionLog=>session(day,[
    {id:`q${day}-1`,exerciseId:'goblet-squat',setNumber:1,reps:10,rir:2,completed:true,...over},
    {id:`q${day}-2`,exerciseId:'incline-pushup',setNumber:1,reps:10,rir:2,completed:true},
  ])
  it('caps calendar intensity until enough strength practices are logged', () => {
    const data=createDefaultData()
    expect(trainingTemplateForDay(data,64)).toMatchObject({plannedTemplateId:'intense-a',templateId:'foundation-a',tier:1})
    data.sessions=[...Array.from({length:28},(_,index)=>qualifying(index+1)),...Array.from({length:7},(_,index)=>qualifying(57+index))]
    expect(trainingTemplateForDay(data,64)).toMatchObject({templateId:'intense-a',tier:4})
  })
  it('does not void a practice for an honest rir=0 set or degraded form', () => {
    const data=createDefaultData()
    data.sessions=Array.from({length:28},(_,index)=>qualifying(index+1,{rir:0,formQuality:'degraded'}))
    data.sessions.push(...Array.from({length:7},(_,index)=>qualifying(57+index,{rir:0})))
    expect(trainingTemplateForDay(data,64).tier).toBe(4)
  })
  it('keeps the discomfort veto for tier credit', () => {
    const data=createDefaultData()
    data.sessions=Array.from({length:35},(_,index)=>qualifying(index+1,{discomfort:true}))
    expect(trainingTemplateForDay(data,64).tier).toBe(1)
  })
})

describe('stats (D3)', () => {
  const done=(day:number):SessionLog=>({...session(day,[]),status:'completed'})
  const safety=(day:number):SessionLog=>({...session(day,[]),status:'safety',mode:'stop',durationSeconds:0,activitySeconds:0})
  const withStart=(sessions:SessionLog[]):AppData=>{const data=seeded(sessions);data.profile.onboardingComplete=true;data.profile.startDate='2026-07-01';return data}

  it('shows a perfect user 100% on the morning of an unlogged day', () => {
    const data=withStart([1,2,3,4,5,6].map(done))
    expect(consistencyRate(data,new Date(2026,6,7,8))).toBe(100)
    expect(recentDaysInfo(data,new Date(2026,6,7,8))).toEqual({done:6,window:6})
  })
  it('never exceeds 100 even with duplicate or conflicting same-day sessions', () => {
    const data=withStart([done(1),done(1),safety(1),done(2)])
    expect(consistencyRate(data,new Date(2026,6,2))).toBeLessThanOrEqual(100)
  })
  it('requires a true ten-minute practice for consistency credit', () => {
    const partial=(day:number,durationSeconds:number):SessionLog=>({...session(day,[]),status:'partial',durationSeconds,activitySeconds:undefined})
    let data=withStart([partial(1,599)])
    expect(consistencyRate(data,new Date(2026,6,1))).toBe(0)
    data=withStart([partial(1,600)])
    expect(consistencyRate(data,new Date(2026,6,1))).toBe(100)
    data=withStart([{...partial(1,900),activitySeconds:599}])
    expect(consistencyRate(data,new Date(2026,6,1))).toBe(0)
    data=withStart([safety(1)])
    expect(consistencyRate(data,new Date(2026,6,1))).toBe(100)
  })
  it('streak preserved across safety stop', () => {
    const data=withStart([done(1),done(2),safety(3),done(4)])
    expect(streakInfo(data,new Date(2026,6,5,8))).toEqual({current:3,best:3})
  })
  it('missed day breaks the streak but best is remembered', () => {
    const data=withStart([done(1),done(2),done(3),done(5)])
    expect(streakInfo(data,new Date(2026,6,6,8))).toEqual({current:1,best:3})
  })
  it('an unlogged today does not break the current streak', () => {
    const data=withStart([done(1),done(2)])
    expect(streakInfo(data,new Date(2026,6,3,8)).current).toBe(2)
  })
})

describe('templates and modes (D8)', () => {
  it('mobility-hips template actually served', () => {
    expect(templateForMode('mobility-hips','recovery').id).toBe('mobility-hips')
    expect(templateForMode('mobility-upper','recovery').id).toBe('mobility-upper')
  })
  it('converts a strength day to a rotated mobility session', () => {
    const served=templateForMode('foundation-a','recovery',7)
    expect(served.kind).toBe('recovery')
    expect(templateForMode('foundation-a','recovery').id).toBe('recovery')
  })
  it('planned mobility day survives the whole decision chain', () => {
    const data=seeded([session(2,gobletSets({reps:8}),'assessment')])
    const decision=trainingTemplateForDay(data,10)
    expect(templateById[decision.templateId].kind).toBe('recovery')
    const recommendation=recommendationForDay(data,10,base,'recovery')
    expect(templateForMode(decision.templateId,recommendation.mode,10).id).toBe(decision.templateId)
  })
})

describe('session bookkeeping', () => {
  it('keeps comparison keys honest across load, version, and tempo', () => {
    const first=logs(10,2)[0]; first.variation='Goblet squat'; first.tempo='3–1–1'
    expect(setComparisonKey(first)).not.toBe(setComparisonKey({...first,weight:15}))
    expect(setComparisonKey(first)).not.toBe(setComparisonKey({...first,variation:'Paused squat'}))
    expect(setComparisonKey(first)).not.toBe(setComparisonKey({...first,tempo:'4–1–1'}))
  })
  it('does not call a skipped recovery sequence complete', () => {
    const recoveryLog:SetLog={id:'r',exerciseId:'cat-cow-flow',setNumber:1,seconds:120,rir:4,completed:false}
    expect(sessionStatus([recoveryLog],'recovery')).toBe('partial')
    expect(sessionStatus([{...recoveryLog,completed:true}],'recovery')).toBe('recovery')
  })
  it('counts active movement from tempo and both sides without counting skipped work', () => {
    expect(activeSecondsForSet({completed:true,reps:8,tempo:'3–1–1'})).toBe(40)
    expect(activeSecondsForSet({completed:true,reps:8,tempo:'2–1–1',perSide:true})).toBe(64)
    expect(activeSecondsForSet({completed:true,seconds:20,tempo:'steady',perSide:true})).toBe(40)
    expect(activeSecondsForSet({completed:false,reps:20,tempo:'3–1–1'})).toBe(0)
  })
})

describe('90-day smoke simulation', () => {
  it('an honest daily user with 10/15/20/25 lb progresses without catapults, phantom loads, or false failures', () => {
    const data=createDefaultData()
    data.profile={...data.profile,onboardingComplete:true,startDate:'2026-01-01',dumbbells:[10,15,20,25]}
    const readiness:Readiness={energy:'normal',soreness:'none',pain:'none',hasDumbbells:true,availableWeight:25}
    const seen=new Set<string>()
    const byExercise=new Map<string,Array<{day:number;p:AdaptivePrescription}>>()
    const finals=new Map<string,AdaptivePrescription>()
    const tiers=new Map<number,number>()
    for (let day=1;day<=90;day+=1) {
      const decision=trainingTemplateForDay(data,day)
      tiers.set(day,decision.tier)
      const planned=templateById[decision.templateId]
      const recommendation=recommendationForDay(data,day,readiness,planned.kind)
      const template=templateForMode(decision.templateId,recommendation.mode,day)
      const assessmentMode=template.id==='assessment'?'baseline' as const:template.id==='final-assessment'?'final' as const:undefined
      const sets:SetLog[]=[]
      for (const templateItem of template.items) {
        const p=adaptivePrescription(data,templateItem,25,assessmentMode,true,day)
        const exercise=exerciseById[templateItem.exerciseId]
        if (p.weight!==null) {
          expect(usesDumbbell(exercise)).toBe(true)
          expect(p.variation===exercise.regression||p.variation===exercise.noEquipment).toBe(false)
        }
        expect(p.explanation).not.toMatch(/missed the lower target/i)
        const records=byExercise.get(templateItem.exerciseId)??[]; records.push({day,p}); byExercise.set(templateItem.exerciseId,records)
        if (assessmentMode==='final') finals.set(templateItem.exerciseId,p)
        // Honest user: calibrates the first exposure of a movement at the top of the range, then does exactly what is asked.
        const first=!seen.has(templateItem.exerciseId); seen.add(templateItem.exerciseId)
        const count=adjustedSetCount(templateItem,recommendation)
        for (let setNumber=1;setNumber<=count;setNumber+=1) {
          sets.push({ id:`${day}-${templateItem.exerciseId}-${setNumber}`, exerciseId:templateItem.exerciseId, setNumber,
            reps:p.repMin!==undefined?(first?(p.repMax??p.repMin):p.repMin):undefined,
            seconds:p.repMin===undefined?p.seconds:undefined,
            weight:p.weight??undefined, rir:2, formQuality:'good', variation:p.variation,
            targetReps:p.repMin, targetRepMax:p.repMax, targetSeconds:p.seconds, tempo:p.tempo, completed:true })
        }
      }
      data.sessions.push({ id:`sim-${day}`, day, date:'2026-01-01', templateId:template.id, mode:recommendation.mode, status:template.kind==='recovery'?'recovery':'completed', durationSeconds:600, activitySeconds:600, readiness, sets })
      if (assessmentMode==='baseline') for (const templateItem of template.items) { const log=sets.find((set)=>set.exerciseId===templateItem.exerciseId); if(log) data.assessments.push({ id:`base-${templateItem.exerciseId}`, date:'2026-01-01', day, metric:'baseline', value:log.reps??log.seconds??0, unit:log.reps!==undefined?'reps':'seconds', exerciseId:templateItem.exerciseId, weight:log.weight, variation:log.variation, tempo:log.tempo }) }
    }
    // Tier unlocks stay pinned to the calendar for a compliant user.
    expect(tiers.get(15)).toBe(2)
    expect(tiers.get(36)).toBe(3)
    expect(tiers.get(64)).toBe(4)
    // Assessments happened on both ends.
    expect(data.sessions.find((s)=>s.day===1)?.templateId).toBe('assessment')
    expect(data.sessions.find((s)=>s.day===90)?.templateId).toBe('final-assessment')
    expect(finals.get('goblet-squat')).toMatchObject({weight:10,variation:'Goblet squat'})
    expect(finals.get('side-plank')?.weight).toBeNull()
    // Load progresses on every dumbbell lift by day 45.
    for (const [exerciseId,records] of byExercise) {
      if (!usesDumbbell(exerciseById[exerciseId])) continue
      const early=records.filter((record)=>record.day<=45)
      expect(early.length).toBeGreaterThanOrEqual(2)
      const firstWeight=early.find((record)=>record.p.weight!==null)?.p.weight??0
      const maxWeight=Math.max(...early.map((record)=>record.p.weight??0))
      expect(maxWeight,`${exerciseId} should progress load by day 45`).toBeGreaterThan(firstWeight)
    }
    // The last 30 days keep prescribing trackable, varied targets for every rep-range exercise.
    for (const [exerciseId,records] of byExercise) {
      const late=records.filter((record)=>record.day>=61&&record.p.repMin!==undefined)
      if (late.length<2) continue
      expect(new Set(late.map((record)=>JSON.stringify(record.p))).size,`${exerciseId} late prescriptions should vary`).toBeGreaterThan(1)
    }
  })
})
