import { differenceInCalendarDays, formatISODate, parseLocalDate } from './date'
import { programForDay, recoveryTemplateIdForDay, resolveTemplateById, templateById } from '../data/program'
import { exerciseById } from '../data/exercises'
import type { AppData, Exercise, Readiness, Recommendation, SessionLog, SetLog, WorkoutItem } from '../types'

export function getChallengeDay(startDate: string, now = new Date()): number {
  return Math.min(90,getProgramDay(startDate,now))
}

export function getProgramDay(startDate: string, now = new Date()): number {
  if (!startDate) return 1
  return Math.max(1, differenceInCalendarDays(now, parseLocalDate(startDate)) + 1)
}

export interface SessionPlacement { day:number; date:string; resumedOnLaterDay:boolean }

/**
 * A normal workout that happens to cross midnight belongs to the day it started.
 * A draft abandoned for more than two hours and completed on a later date belongs
 * to the completion date, so yesterday's stale draft cannot create a phantom miss today.
 */
export function sessionPlacementAtCompletion(data: Pick<AppData,'profile'|'sessions'>, scheduledDay: number, startedAt: number, completedAt: number): SessionPlacement {
  const startedDate=formatISODate(new Date(startedAt))
  const completedDate=formatISODate(new Date(completedAt))
  const resumedOnLaterDay=startedDate!==completedDate&&completedAt-startedAt>2*60*60*1000
  if(!resumedOnLaterDay)return {day:scheduledDay,date:startedDate,resumedOnLaterDay:false}
  const firstSession=data.sessions.length===0&&scheduledDay===1
  return {day:firstSession?1:getProgramDay(data.profile.startDate,new Date(completedAt)),date:completedDate,resumedOnLaterDay:true}
}

export function recommendationFor(readiness: Readiness, plannedKind: 'strength' | 'recovery' | 'assessment'): Recommendation {
  if (readiness.pain === 'present') return { mode:'stop', title:'Pause today', explanation:'Pain was reported. Do not train through sharp, sudden, worsening, or unexplained symptoms. Seek appropriate professional guidance when symptoms are concerning.', setMultiplier:0 }
  if (plannedKind === 'recovery' || readiness.soreness === 'significant') return { mode:'recovery', title:'Ten-minute mobility', explanation:readiness.soreness === 'significant' ? 'Significant soreness shifts today to ten minutes of easy, comfortable mobility—never forced stretching.' : 'This planned mobility day builds the daily movement habit while supporting the next strength session.', setMultiplier:0.5 }
  if (readiness.energy === 'low' || readiness.soreness === 'mild') return { mode:'reduced', title:'Reduced-volume session', explanation:`${readiness.energy === 'low' ? 'Energy is low' : 'Soreness is mild'}, so one working set is removed where possible. Keep technique crisp.`, setMultiplier:0.67 }
  return { mode:'normal', title:'Normal session', explanation:'Readiness supports the planned session. Finish most sets with 1–3 good repetitions still possible.', setMultiplier:1 }
}

export function recommendationForDay(data: AppData, day: number, readiness: Readiness, plannedKind: 'strength' | 'recovery' | 'assessment'): Recommendation {
  const base = recommendationFor(readiness, plannedKind)
  if (['stop','recovery','minimum'].includes(base.mode) || plannedKind === 'assessment') return base
  const misses = missedDaysBefore(data, day)
  if (misses >= 7) return { mode:'reduced', title:'Welcome-back session', explanation:'A full week was missed, so today uses about half the planned work at an easy 3–4 reps in reserve. There is nothing to catch up.', setMultiplier:0.5 }
  if (misses >= 2) return { mode:'reduced', title:'Resume session', explanation:'A few sessions were missed, so today removes one working set. The calendar continues without punishment or doubled work.', setMultiplier:0.67 }
  if (day <= 7 && base.mode === 'normal') return { mode:'reduced', title:'Re-entry session', explanation:'Week 1 deliberately uses one work set where possible. Finish feeling that more was available.', setMultiplier:0.5 }
  return base
}

export function adjustedSetCount(item: WorkoutItem, recommendation: Recommendation): number {
  if (recommendation.mode === 'stop') return 0
  return Math.max(1, Math.round(item.sets * recommendation.setMultiplier))
}

const templateTierMap: Record<string,[string,string,string,string]> = {
  'foundation-a':['foundation-a','foundation-a','foundation-a','foundation-a'],
  'foundation-b':['foundation-b','foundation-b','foundation-b','foundation-b'],
  'unilateral':['unilateral','unilateral','unilateral','unilateral'],
  'density':['foundation-a','density','density','density'],
  'strength-a':['foundation-a','foundation-a','strength-a','strength-a'],
  'strength-b':['foundation-b','foundation-b','strength-b','strength-b'],
  'intense-a':['foundation-a','density','strength-a','intense-a'],
  'intense-b':['foundation-b','foundation-b','strength-b','intense-b'],
}

export interface TrainingTemplateDecision { templateId:string; plannedTemplateId:string; tier:1|2|3|4; strengthPractices:number; explanation:string | null }

function baseTemplateId(id: string): string { return id.endsWith('--bodyweight') ? id.slice(0,-'--bodyweight'.length) : id }

// D2: qualified strength practice = strength template, normal/reduced mode, ≥600s activity,
// ≥2 movement patterns completed, and no discomfort logged. One grinding rir=0 set or a
// degraded-form note no longer voids an honest day of work.
function isQualifiedStrengthPractice(session:SessionLog): boolean {
  if(resolveTemplateById(session.templateId)?.kind!=='strength'||!['normal','reduced'].includes(session.mode)||(session.activitySeconds??session.durationSeconds)<600)return false
  if(session.sets.some((set)=>set.discomfort))return false
  const completed=session.sets.filter((set)=>set.completed&&exerciseById[set.exerciseId]?.pattern!=='recovery')
  const patterns=new Set(completed.map((set)=>exerciseById[set.exerciseId]?.pattern).filter(Boolean))
  return patterns.size>=2
}

export function trainingTemplateForDay(data: AppData, day: number): TrainingTemplateDecision {
  const plan=programForDay(day)
  // D7: baseline makeup window — until an assessment session exists, days 1–7 serve the baseline.
  const hasBaseline=data.sessions.some((session)=>baseTemplateId(session.templateId)==='assessment')
  if(!hasBaseline&&day<=7) return {templateId:'assessment',plannedTemplateId:plan.templateId,tier:1,strengthPractices:0,explanation:day===1?null:'Your starting point has not been recorded yet, so today captures that calm baseline first. The regular plan continues tomorrow.'}
  // D7: final makeup window — days 90–97 serve the 90-day check-in until it exists.
  const hasFinal=data.sessions.some((session)=>baseTemplateId(session.templateId)==='final-assessment')
  if(!hasFinal&&day>=90&&day<=97) return {templateId:'final-assessment',plannedTemplateId:plan.templateId,tier:Math.min(4,plan.phaseId) as 1|2|3|4,strengthPractices:0,explanation:day===90?null:'The 90-day check-in has not been recorded yet, so today runs it before continuation training resumes.'}
  const planned=templateById[plan.templateId]
  if (planned.kind!=='strength') return {templateId:planned.id,plannedTemplateId:planned.id,tier:Math.min(4,plan.phaseId) as 1|2|3|4,strengthPractices:0,explanation:null}
  const strengthPractices=data.sessions.filter((session)=>session.day<day&&isQualifiedStrengthPractice(session)).length
  let earnedTier:1|2|3|4=strengthPractices>=28?4:strengthPractices>=14?3:strengthPractices>=5?2:1
  if(missedDaysBefore(data,day)>=7&&earnedTier>1) earnedTier=(earnedTier-1) as 1|2|3
  const plannedTier=Math.min(4,plan.phaseId) as 1|2|3|4
  const tier=Math.min(plannedTier,earnedTier) as 1|2|3|4
  const templateId=templateTierMap[planned.id]?.[tier-1]??planned.id
  const explanation=templateId===planned.id?null:`The calendar is in Phase ${plan.phaseId}, but your training level stays at Tier ${tier} until more clean strength practices are logged. Today uses ${templateById[templateId].title} instead of jumping ahead.`
  return {templateId,plannedTemplateId:planned.id,tier,strengthPractices,explanation}
}

export type ProgressionAction = 'increase-weight'|'increase-reps'|'harder-variation'|'repeat'|'reduce'
export interface ProgressionResult { action:ProgressionAction; nextTarget: number; explanation:string }

export interface AdaptivePrescription {
  repMin?: number
  repMax?: number
  seconds?: number
  weight: number | null
  variation: string
  tempo: string
  action: ProgressionAction | 'start'
  explanation: string
}

export function usesDumbbell(exercise: Exercise): boolean { return exercise.equipment.some((equipment)=>equipment.includes('dumbbell')) }

function exerciseExposures(data: AppData, exerciseId: string): Array<{ session: SessionLog; logs: SetLog[]; item: WorkoutItem }> {
  return data.sessions
    .filter((session) => session.sets.some((set) => set.exerciseId === exerciseId))
    .sort((a,b) => b.day - a.day)
    .map((session) => ({ session, logs:session.sets.filter((set) => set.exerciseId === exerciseId), item:resolveTemplateById(session.templateId)?.items.find((item) => item.exerciseId === exerciseId) ?? { exerciseId, sets:1, repMin:1, repMax:1, tempo:'controlled', restSeconds:0 } }))
}

interface ExposureAnalysis { missed:boolean; clean:boolean; readyForLoad:boolean; discomfort:boolean; degraded:boolean; asked:number; top:number; minPerformed:number; weight:number; variation?:string; timed:boolean }

// D1 exposure reading. `targetReps` on new logs is the floor the user was asked for and
// `targetRepMax` the top of the range. LEGACY logs stored the range MAX in targetReps, so when
// targetRepMax is absent we fall back to the template item's repMin for both the asked floor and
// the missed decision — an honest in-range performance below the max is never scored as a failure.
function analyzeExposure(exposure:{logs:SetLog[];item:WorkoutItem}): ExposureAnalysis {
  const {logs,item}=exposure
  const completed=logs.filter((log)=>log.completed)
  const allCompleted=logs.length>0&&completed.length===logs.length
  const discomfort=logs.some((log)=>log.discomfort)
  const degraded=logs.some((log)=>log.formQuality==='degraded')
  const weight=Math.max(0,...completed.map((log)=>log.weight??0))
  const variation=completed.find((log)=>log.variation)?.variation??logs.find((log)=>log.variation)?.variation
  const minRir=completed.length?Math.min(...completed.map((log)=>log.rir)):0
  if (item.repMin===undefined) {
    const asked=Math.max(0,...logs.map((log)=>log.targetSeconds??item.seconds??0))
    const minPerformed=completed.length?Math.min(...completed.map((log)=>log.seconds??0)):0
    const missed=!allCompleted||completed.some((log)=>(log.seconds??0)<asked||log.rir===0)
    const clean=allCompleted&&!discomfort&&!degraded&&completed.every((log)=>log.rir>=1&&(log.seconds??0)>=asked)
    return {missed,clean,readyForLoad:clean&&minRir>=2,discomfort,degraded,asked,top:asked,minPerformed,weight,variation,timed:true}
  }
  const floor=item.repMin
  const askedOf=(log:SetLog)=>log.targetRepMax!==undefined?(log.targetReps??floor):floor
  const topOf=(log:SetLog)=>log.targetRepMax??item.repMax??askedOf(log)
  const asked=Math.max(floor,...completed.map(askedOf))
  const top=Math.max(floor,...logs.map(topOf))
  const minPerformed=completed.length?Math.min(...completed.map((log)=>log.reps??0)):0
  const missed=!allCompleted||completed.some((log)=>(log.reps??0)<floor||log.rir===0)
  const clean=allCompleted&&!discomfort&&!degraded&&completed.every((log)=>log.rir>=1&&(log.reps??0)>=askedOf(log))
  const readyForLoad=clean&&minRir>=2&&minPerformed>=top
  return {missed,clean,readyForLoad,discomfort,degraded,asked,top,minPerformed,weight,variation,timed:false}
}

// D1 progression core. The rep ladder walks the FULL range (repMin→repMax) via clean exposures
// (rir ≥ 1); a weight jump requires a clean exposure at the top of the range with rir ≥ 2 and then
// resets the target to repMin. With no heavier dumbbell the progression variation becomes a real
// tracked state with its own ladder. One miss repeats; two consecutive misses or any discomfort
// regress. Weight is only ever non-null for dumbbell exercises and never pairs with a
// regression/no-equipment variation.
export function adaptivePrescription(data: AppData, item: WorkoutItem, maximumAvailableWeight: number | null, assessmentMode?: 'baseline' | 'final', hasDumbbells = true, day?: number): AdaptivePrescription {
  const exercise = exerciseById[item.exerciseId]
  if (item.exerciseId==='strength-primer') return { seconds:item.seconds,weight:null,variation:exercise.standard,tempo:item.tempo,action:'start',explanation:'Use this minute to rehearse the first movements, confirm your support is stable, and choose a comfortable range.' }
  if (exercise.pattern==='recovery') return {repMin:item.repMin,repMax:item.repMax,seconds:item.seconds,weight:null,variation:exercise.standard,tempo:item.tempo,action:'start',explanation:'Keep this restorative: use a comfortable range, steady breathing, and an effort that leaves you feeling the same or better.'}
  const dumbbellLift=usesDumbbell(exercise)
  if (assessmentMode === 'baseline') {
    const needsSubstitute=(!data.profile.hasSturdyChair&&exercise.equipment.some((equipment)=>/chair|couch|counter/.test(equipment)))||(!hasDumbbells&&dumbbellLift)
    const baselineWeight=dumbbellLift&&!needsSubstitute?data.profile.dumbbells.filter((weight) => maximumAvailableWeight!==null&&weight <= maximumAvailableWeight).sort((a,b)=>a-b)[0] ?? maximumAvailableWeight:null
    return { repMin:item.repMin, repMax:item.repMax, seconds:item.seconds, weight:baselineWeight, variation:needsSubstitute?exercise.noEquipment:exercise.standard, tempo:item.tempo, action:'start', explanation:'Record a conservative, repeatable starting point. Stop with about 3 technically clean reps still possible.' }
  }
  if (assessmentMode === 'final') {
    // D7: earliest recorded assessment result per exercise, not literally day 1.
    const baseline=[...data.assessments].filter((result)=>result.exerciseId===item.exerciseId).sort((a,b)=>a.day-b.day)[0]
    if (baseline) return { repMin:item.repMin, repMax:item.repMax, seconds:item.seconds, weight:dumbbellLift?baseline.weight??null:null, variation:baseline.variation??exercise.standard, tempo:item.tempo, action:'repeat', explanation:`Repeat the Day ${baseline.day} setup exactly: ${baseline.variation??exercise.standard}${dumbbellLift&&baseline.weight?` at ${baseline.weight} lb`:''}. This keeps the comparison honest.` }
  }
  if (!data.profile.hasSturdyChair && exercise.equipment.some((equipment) => /chair|couch|counter/.test(equipment))) return { repMin:item.repMin, repMax:item.repMax, seconds:item.seconds, weight:null, variation:exercise.noEquipment, tempo:item.tempo, action:'start', explanation:`No sturdy support is listed, so today uses ${exercise.noEquipment}. Never brace on unstable or rolling furniture.` }
  if (!hasDumbbells && dumbbellLift) return { repMin:item.repMin, repMax:item.repMax, seconds:item.seconds, weight:null, variation:exercise.noEquipment, tempo:item.tempo, action:'start', explanation:`No dumbbells are available today, so use ${exercise.noEquipment}.` }
  const availableWeights = maximumAvailableWeight===null?[]:[...data.profile.dumbbells].filter((weight)=>weight<=maximumAvailableWeight).sort((a,b)=>a-b)
  const heaviestAvailable=availableWeights.at(-1)??null
  const lightestAvailable=availableWeights[0]??null
  const finalize=(prescription:AdaptivePrescription):AdaptivePrescription=>(!dumbbellLift||prescription.variation===exercise.regression||prescription.variation===exercise.noEquipment)?{...prescription,weight:null}:prescription
  const exposures = exerciseExposures(data,item.exerciseId)
  const latest = exposures[0]
  if (!latest) {
    return finalize({ repMin:item.repMin, repMax:item.repMax, seconds:item.seconds, weight:lightestAvailable, variation:exercise.standard, tempo:item.tempo, action:'start', explanation:`Start with ${exercise.standard}${dumbbellLift&&lightestAvailable!==null?` at ${lightestAvailable} lb`:''}. Keep the first exposure conservative and calibrate from clean reps.` })
  }
  const a=analyzeExposure(latest)
  const lastWeight=a.weight
  const lastVariation=a.variation
  const lastLoadedWeight=exposures.map((exposure)=>Math.max(0,...exposure.logs.map((log)=>log.weight??0))).find((weight)=>weight>0)??null
  const cappedLast=lastWeight>0?Math.min(lastWeight,heaviestAvailable??lastWeight):null
  // D1: after an unloaded exposure, returning to load starts at the last loaded weight, else the LIGHTEST available — never the heaviest.
  const returnWeight=():number|null=>{
    if(!dumbbellLift)return null
    if(lastLoadedWeight!==null)return availableWeights.filter((weight)=>weight<=lastLoadedWeight).at(-1)??lightestAvailable
    return lightestAvailable
  }
  // Conservative return after a long gap: the welcome-back recommendation and the prescription agree.
  const currentDay=day??getProgramDay(data.profile.startDate)
  if (missedDaysBefore(data,currentDay)>=7) {
    const easier=dumbbellLift&&lastLoadedWeight!==null?availableWeights.filter((weight)=>weight<lastLoadedWeight).at(-1)??lightestAvailable:null
    const variation=lastVariation&&lastVariation!==exercise.progression?lastVariation:exercise.standard
    return finalize({ repMin:item.repMin, repMax:item.repMax, seconds:item.seconds, weight:easier, variation, tempo:item.tempo, action:'repeat', explanation:`Welcome back. Today restarts one step easier${easier!==null?` at ${easier} lb`:''} from the base target—momentum first, load later.` })
  }
  if (a.discomfort||a.degraded) {
    return finalize({ repMin:item.repMin, repMax:item.repMax, seconds:item.seconds, weight:null, variation:exercise.regression, tempo:item.tempo, action:'reduce', explanation:`Last time ${a.discomfort?'discomfort':'form breakdown'} was logged. Today uses ${exercise.regression} through a symptom-free range only.` })
  }
  if (dumbbellLift&&lastWeight>0&&heaviestAvailable!==null&&lastWeight>heaviestAvailable) return { repMin:item.repMin,repMax:item.repMax,seconds:item.seconds,weight:heaviestAvailable,variation:exercise.progression,tempo:item.tempo,action:'harder-variation',explanation:`The previous ${lastWeight} lb load is not available today. Use ${exercise.progression} with ${heaviestAvailable} lb so the lighter load stays useful.` }
  if (a.missed) {
    const previous=exposures[1]?analyzeExposure(exposures[1]):null
    if (previous?.missed) {
      const lighter=dumbbellLift?availableWeights.filter((weight)=>weight<lastWeight).at(-1)??null:null
      if (lighter!==null&&lastVariation!==exercise.regression&&lastVariation!==exercise.noEquipment) return finalize({repMin:item.repMin,repMax:item.repMax,seconds:item.seconds,weight:lighter,variation:lastVariation??exercise.standard,tempo:item.tempo,action:'reduce',explanation:`Two exposures in a row came in under target, so the load steps down to ${lighter} lb. Build back from clean reps.`})
      return finalize({repMin:item.repMin,repMax:item.repMax,seconds:item.seconds,weight:null,variation:exercise.regression,tempo:item.tempo,action:'reduce',explanation:`Two exposures in a row came in under target, so today uses ${exercise.regression} to rebuild clean reps.`})
    }
    const clampedAsked=item.repMin!==undefined&&item.repMax!==undefined?Math.min(item.repMax,Math.max(item.repMin,a.asked)):undefined
    return finalize({repMin:clampedAsked??item.repMin,repMax:item.repMax,seconds:item.seconds,weight:cappedLast,variation:lastVariation??exercise.standard,tempo:item.tempo,action:'repeat',explanation:'One tough day changes nothing. Repeat the same target today—nothing regresses on a single off session.'})
  }
  const regressed=lastVariation!==undefined&&lastVariation!==exercise.standard&&(lastVariation===exercise.regression||lastVariation===exercise.noEquipment)
  if (a.clean&&regressed) {
    const weight=returnWeight()
    return finalize({repMin:item.repMin,repMax:item.repMax,seconds:item.seconds,weight,variation:exercise.standard,tempo:item.tempo,action:'harder-variation',explanation:`${lastVariation} was clean, so today steps back up to ${exercise.standard}${weight!==null?` at ${weight} lb`:''}, starting from the base target.`})
  }
  // A load/variation step also requires that TODAY'S range is fully walked: when the current item
  // offers more rep room than the topped exposure, the ladder continues instead.
  if (a.readyForLoad&&(item.repMin===undefined||item.repMax===undefined||a.minPerformed>=item.repMax)) {
    const unit=item.repMin!==undefined?'reps':'seconds'
    const heavier=dumbbellLift?(lastWeight>0?availableWeights.find((weight)=>weight>lastWeight):returnWeight()??undefined):undefined
    if (heavier!==undefined) return finalize({repMin:item.repMin,repMax:item.repMax,seconds:item.seconds,weight:heavier,variation:lastVariation??exercise.standard,tempo:item.tempo,action:'increase-weight',explanation:`You owned ${a.top} ${unit} with at least 2 reps in reserve. Move to ${heavier} lb and restart at ${item.repMin??item.seconds} ${unit}.`})
    if (lastVariation!==exercise.progression) return finalize({repMin:item.repMin,repMax:item.repMax,seconds:item.seconds,weight:cappedLast,variation:exercise.progression,tempo:item.tempo,action:'harder-variation',explanation:`${dumbbellLift?'No heavier dumbbell is available, so':'You topped the range with control, so'} progression continues with ${exercise.progression}${cappedLast!==null?` at ${cappedLast} lb`:''}, restarting from the base target.`})
    return finalize({repMin:item.repMax??item.repMin,repMax:item.repMax,seconds:item.seconds,weight:cappedLast,variation:exercise.progression,tempo:item.tempo,action:'repeat',explanation:`${exercise.progression} is fully owned${cappedLast!==null?` at ${cappedLast} lb`:''}. Keep it sharp: add a one-second pause or slow the lowering phase while holding the top target.`})
  }
  if (a.clean&&item.repMin!==undefined&&item.repMax!==undefined) {
    const next=Math.min(item.repMax,Math.max(item.repMin,a.minPerformed+1))
    const weight=lastWeight>0?cappedLast:returnWeight()
    if (next>a.asked) return finalize({repMin:next,repMax:item.repMax,seconds:item.seconds,weight,variation:lastVariation??exercise.standard,tempo:item.tempo,action:'increase-reps',explanation:`Clean work last time. The target moves up one to ${next}${weight!==null?` at ${weight} lb`:''} on the way to ${item.repMax}.`})
    return finalize({repMin:next,repMax:item.repMax,seconds:item.seconds,weight,variation:lastVariation??exercise.standard,tempo:item.tempo,action:'repeat',explanation:`Hold ${next} clean reps${weight!==null?` at ${weight} lb`:''}. When the top of the range leaves two reps in reserve, the load moves up.`})
  }
  if (a.clean) {
    const weight=lastWeight>0?cappedLast:returnWeight()
    return finalize({repMin:item.repMin,repMax:item.repMax,seconds:item.seconds,weight,variation:lastVariation??exercise.standard,tempo:item.tempo,action:'repeat',explanation:`Clean hold last time. Repeat it${weight!==null?` at ${weight} lb`:''}; with two reps in reserve the load or variation moves up.`})
  }
  const clampedAsked=item.repMin!==undefined&&item.repMax!==undefined?Math.min(item.repMax,Math.max(item.repMin,a.asked)):undefined
  return finalize({repMin:clampedAsked??item.repMin,repMax:item.repMax,seconds:item.seconds,weight:cappedLast,variation:lastVariation??exercise.standard,tempo:item.tempo,action:'repeat',explanation:'Repeat this target until every set is clean with at least one rep in reserve—then it moves up.'})
}

export function targetRirForDay(day: number, mode: Recommendation['mode']): string {
  if (mode === 'stop') return 'No effort target today · rest and recover'
  if (mode === 'recovery') return 'Easy · at least 4 reps in reserve'
  if (mode === 'reduced' || day <= 14) return 'Easy–moderate · 3–4 reps in reserve'
  if (day > 90) return 'Moderate–hard · 1–3 reps in reserve'
  if (day <= 35) return 'Moderate · 2–3 reps in reserve'
  if (day <= 63) return 'Moderate–hard · 1–3 reps in reserve'
  if (day <= 84) return 'Hard but clean · 1–2 reps in reserve'
  return 'Easy taper · 3–4 reps in reserve'
}

export function previousExerciseLogs(data: AppData, exerciseId: string): SetLog[] {
  return [...data.sessions].reverse().find((session) => session.sets.some((set) => set.exerciseId === exerciseId))?.sets.filter((set) => set.exerciseId === exerciseId) ?? []
}

export function setComparisonKey(set:Pick<SetLog,'exerciseId'|'weight'|'variation'|'tempo'|'reps'|'seconds'>): string {
  return [set.exerciseId,set.reps!==undefined?'reps':'seconds',set.weight??0,set.variation??'',set.tempo??''].join('|')
}

export function activeSecondsForSet(input:{completed:boolean;reps?:number;seconds?:number;tempo:string;perSide?:boolean}):number {
  if(!input.completed)return 0
  const sideMultiplier=input.perSide?2:1
  if(input.seconds!==undefined)return Math.max(0,input.seconds)*sideMultiplier
  const tempoSeconds=(input.tempo.match(/[0-9]+/g)??[]).reduce((sum,value)=>sum+Number(value),0)||2
  return Math.max(0,input.reps??0)*tempoSeconds*sideMultiplier
}

export function sessionStatus(sets: SetLog[], mode: string): SessionLog['status'] {
  if (mode === 'recovery' && sets.length > 0 && sets.every((set)=>set.completed)) return 'recovery'
  if (sets.length > 0 && sets.every((set) => set.completed)) return 'completed'
  return 'partial'
}

function qualifyingDaySet(data: AppData, maxDay = Infinity): Set<number> {
  return new Set(data.sessions.filter((session) => session.day<=maxDay&&(session.activitySeconds??session.durationSeconds)>=600&&['completed','partial','recovery'].includes(session.status)).map((session) => session.day))
}

function safetyDaySet(data: AppData, maxDay = Infinity): Set<number> {
  return new Set(data.sessions.filter((session)=>session.status==='safety'&&session.day<=maxDay).map((session)=>session.day))
}

// D3: today only counts against the rate once it is logged; a day that has both a safety stop and
// real practice counts once; the result can never exceed 100.
export function consistencyRate(data: AppData, today = new Date()): number {
  if (!data.profile.onboardingComplete) return 0
  const elapsed = getChallengeDay(data.profile.startDate, today)
  const qualifying=qualifyingDaySet(data,elapsed)
  const safety=safetyDaySet(data,elapsed)
  const todayLogged=data.sessions.some((session)=>session.day===elapsed)
  const considered=todayLogged?elapsed:elapsed-1
  let done=0, eligible=0
  for (let dayIndex=1; dayIndex<=considered; dayIndex+=1) {
    if (qualifying.has(dayIndex)) { done+=1; eligible+=1 }
    else if (!safety.has(dayIndex)) eligible+=1
  }
  return eligible===0?100:Math.max(0,Math.min(100,Math.round((done/eligible)*100)))
}

// D3: recent-days window excludes today until it is logged; safety-stop days shrink the window
// instead of counting as misses.
export function recentDaysInfo(data: AppData, today = new Date()): { done:number; window:number } {
  const day=getProgramDay(data.profile.startDate,today)
  const todayLogged=data.sessions.some((session)=>session.day===day)
  const anchor=todayLogged?day:day-1
  const qualifying=qualifyingDaySet(data)
  const safety=safetyDaySet(data)
  let done=0, window=0
  for (let dayIndex=Math.max(1,anchor-6); dayIndex<=anchor; dayIndex+=1) {
    if (qualifying.has(dayIndex)) { done+=1; window+=1 }
    else if (!safety.has(dayIndex)) window+=1
  }
  return {done,window}
}

// D3: a day extends the streak with ≥600s of activity (completed/partial/recovery); a safety-stop
// day PRESERVES the streak without extending it; a missed day breaks it. Today never breaks the
// streak before it has been logged.
export function streakInfo(data: AppData, today = new Date()): { current:number; best:number } {
  if (!data.profile.onboardingComplete) return {current:0,best:0}
  const day=getProgramDay(data.profile.startDate,today)
  const qualifying=qualifyingDaySet(data)
  const safety=safetyDaySet(data)
  const anchor=data.sessions.some((session)=>session.day===day)?day:day-1
  let current=0
  for (let dayIndex=anchor; dayIndex>=1; dayIndex-=1) {
    if (qualifying.has(dayIndex)) current+=1
    else if (!safety.has(dayIndex)) break
  }
  let best=0, run=0
  for (let dayIndex=1; dayIndex<=anchor; dayIndex+=1) {
    if (qualifying.has(dayIndex)) { run+=1; best=Math.max(best,run) }
    else if (!safety.has(dayIndex)) run=0
  }
  return {current,best}
}

export function totalMinutes(data: AppData): number {
  return Math.round(data.sessions.reduce((sum, session) => sum + (session.activitySeconds??session.durationSeconds), 0) / 60)
}

export function missedDaysBefore(data: AppData, day: number): number {
  const completed = new Set(data.sessions.map((session) => session.day))
  let misses = 0
  for (let current = Math.max(1, day - 7); current < day; current += 1) if (!completed.has(current)) misses += 1
  return misses
}

export function reentryNote(data: AppData, day: number): string | null {
  const misses = missedDaysBefore(data, day)
  if (misses >= 7) return 'A full week was missed: use about half the planned sets today and stay near 4 reps in reserve.'
  if (misses >= 2) return 'A few sessions were missed. Resume here—do not double the work or restart the challenge.'
  return null
}

export function buildSessionId(day: number): string { return `${formatISODate(new Date())}-d${day}-${Date.now()}` }

export function todayPlan(data: AppData, now = new Date()) { const day = getProgramDay(data.profile.startDate, now); return programForDay(day) }

// D8: a planned recovery-kind template (mobility-hips/mobility-upper) is preserved when the mode is
// 'recovery' so those sessions actually run; converting a non-recovery day rotates deterministically
// by day when a day is provided.
export function templateForMode(templateId: string, mode: Recommendation['mode'], day?: number) {
  if (mode === 'minimum') return templateById.minimum
  if (mode === 'recovery') {
    const planned = resolveTemplateById(templateId)
    if (planned?.kind === 'recovery') return planned
    return templateById[day !== undefined ? recoveryTemplateIdForDay(day) : 'recovery']
  }
  return templateById[templateId]
}
