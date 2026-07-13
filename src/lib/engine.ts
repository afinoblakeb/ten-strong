import { differenceInCalendarDays, formatISODate, parseLocalDate } from './date'
import { programForDay, templateById } from '../data/program'
import { exerciseById } from '../data/exercises'
import type { AppData, Readiness, Recommendation, SessionLog, SetLog, WorkoutItem } from '../types'

export function getChallengeDay(startDate: string, now = new Date()): number {
  if (!startDate) return 1
  return Math.min(90, Math.max(1, differenceInCalendarDays(now, parseLocalDate(startDate)) + 1))
}

export function recommendationFor(readiness: Readiness, plannedKind: 'strength' | 'recovery' | 'assessment'): Recommendation {
  if (readiness.pain === 'present') return { mode:'stop', title:'Pause today', explanation:'Pain was reported. Do not train through sharp, sudden, worsening, or unexplained symptoms. Seek appropriate professional guidance when symptoms are concerning.', setMultiplier:0 }
  if (plannedKind === 'recovery' || readiness.soreness === 'significant') return { mode:'recovery', title:'Recovery session', explanation:readiness.soreness === 'significant' ? 'Significant soreness shifts today to easy movement so you can recover without punishment.' : 'This planned lower-load day supports the next strength session.', setMultiplier:0.5 }
  if (readiness.minutes === 5) return { mode:'minimum', title:'Five-minute minimum', explanation:'Time is tight, so today uses one concise round. This preserves the habit without turning tomorrow into a catch-up session.', setMultiplier:0.5 }
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

export interface ProgressionResult { action:'increase-weight'|'increase-reps'|'harder-variation'|'repeat'|'reduce'; nextTarget: number; explanation:string }

export interface AdaptivePrescription {
  repMin?: number
  repMax?: number
  seconds?: number
  weight: number | null
  variation: string
  tempo: string
  action: ProgressionResult['action'] | 'start'
  explanation: string
}

export function calculateProgression(logs: SetLog[], item: WorkoutItem, availableWeights: number[] = []): ProgressionResult {
  const completed = logs.filter((log) => log.completed && !log.discomfort)
  const target = item.repMax ?? item.seconds ?? 0
  if (logs.some((log) => log.discomfort)) return { action:'reduce', nextTarget:item.repMin ?? Math.max(10, target - 5), explanation:'Discomfort was reported, so next time use the regression, reduce range, or substitute the movement.' }
  if (completed.length < item.sets) return { action:'repeat', nextTarget:item.repMin ?? target, explanation:'Not all planned work was completed, so the same target stays in place—no catch-up volume.' }
  const atHighEnd = completed.every((log) => (log.reps ?? log.seconds ?? 0) >= target)
  const controlled = completed.every((log) => log.rir >= 2)
  const currentWeight = Math.max(...completed.map((log) => log.weight ?? 0), 0)
  const heavier = [...availableWeights].sort((a,b) => a-b).find((weight) => weight > currentWeight)
  if (atHighEnd && controlled && heavier) return { action:'increase-weight', nextTarget:item.repMin ?? target, explanation:`You reached the top of the range with at least 2 reps in reserve, so try ${heavier} lb next time and return to the lower rep target.` }
  if (atHighEnd && controlled && !heavier) return { action:'harder-variation', nextTarget:target, explanation:'You reached the top of the range with control. With no heavier dumbbell available, use a longer pause, slower lowering, greater range, or the listed progression.' }
  const belowMinimum = completed.some((log) => (log.reps ?? log.seconds ?? 0) < (item.repMin ?? target))
  const failed = completed.some((log) => log.rir === 0)
  if (belowMinimum || failed) return { action:'reduce', nextTarget:item.repMin ?? target, explanation:'The lower target was missed or reached failure, so reduce load or use the regression next time.' }
  const best = Math.max(...completed.map((log) => log.reps ?? log.seconds ?? 0), item.repMin ?? 1)
  return { action:'increase-reps', nextTarget:Math.min(target, best + 1), explanation:`The work was controlled, so the next target increases to ${Math.min(target, best + 1)} before load or variation changes.` }
}

function exerciseExposures(data: AppData, exerciseId: string): Array<{ session: SessionLog; logs: SetLog[]; item: WorkoutItem }> {
  return data.sessions
    .filter((session) => session.sets.some((set) => set.exerciseId === exerciseId))
    .sort((a,b) => b.day - a.day)
    .map((session) => ({ session, logs:session.sets.filter((set) => set.exerciseId === exerciseId), item:templateById[session.templateId]?.items.find((item) => item.exerciseId === exerciseId) ?? { exerciseId, sets:1, repMin:1, repMax:1, tempo:'controlled', restSeconds:0 } }))
}

function qualifiesForProgression(logs: SetLog[], item: WorkoutItem): boolean {
  const completed = logs.filter((log) => log.completed)
  if (!completed.length || completed.length < Math.min(item.sets, logs.length)) return false
  return completed.every((log) => !log.discomfort && log.formQuality !== 'degraded' && log.rir >= 2 && (log.reps ?? log.seconds ?? 0) >= (log.targetReps ?? log.targetSeconds ?? item.repMax ?? item.seconds ?? 0))
}

export function adaptivePrescription(data: AppData, item: WorkoutItem, maximumAvailableWeight: number | null, assessmentMode?: 'baseline' | 'final'): AdaptivePrescription {
  const exercise = exerciseById[item.exerciseId]
  if (item.exerciseId==='strength-primer') return { seconds:item.seconds,weight:null,variation:exercise.standard,tempo:item.tempo,action:'start',explanation:'Use this minute to rehearse the first movements, confirm your support is stable, and choose a comfortable range.' }
  if (assessmentMode === 'baseline') { const needsSubstitute=(!data.profile.hasSturdyChair&&exercise.equipment.some((equipment)=>/chair|couch|counter/.test(equipment)))||(maximumAvailableWeight===null&&exercise.equipment.some((equipment)=>equipment.includes('dumbbell'))); return { repMin:item.repMin, repMax:item.repMax, seconds:item.seconds, weight:needsSubstitute?null:data.profile.dumbbells.filter((weight) => maximumAvailableWeight!==null&&weight <= maximumAvailableWeight).sort((a,b)=>a-b)[0] ?? maximumAvailableWeight, variation:needsSubstitute?exercise.noEquipment:exercise.standard, tempo:item.tempo, action:'start', explanation:'Record a conservative, repeatable starting point. Stop with about 3 technically clean reps still possible.' } }
  if (assessmentMode === 'final') {
    const baseline=data.assessments.find((result) => result.day===1 && result.exerciseId===item.exerciseId)
    if (baseline) return { repMin:item.repMin, repMax:item.repMax, seconds:item.seconds, weight:baseline.weight??null, variation:baseline.variation??exercise.standard, tempo:item.tempo, action:'repeat', explanation:`Repeat the Day 1 setup exactly: ${baseline.variation??exercise.standard}${baseline.weight?` at ${baseline.weight} lb`:''}. This keeps the comparison honest.` }
  }
  if (!data.profile.hasSturdyChair && exercise.equipment.some((equipment) => /chair|couch|counter/.test(equipment))) return { repMin:item.repMin, repMax:item.repMax, seconds:item.seconds, weight:exercise.pattern==='pull'?null:maximumAvailableWeight, variation:exercise.noEquipment, tempo:item.tempo, action:'start', explanation:`No sturdy support is listed, so today uses ${exercise.noEquipment}. Never brace on unstable or rolling furniture.` }
  const availableWeights = data.profile.dumbbells.filter((weight) => maximumAvailableWeight === null ? false : weight <= maximumAvailableWeight).sort((a,b) => a-b)
  const exposures = exerciseExposures(data,item.exerciseId)
  const latest = exposures[0]
  const lastWeight = latest ? Math.max(0,...latest.logs.map((log) => log.weight ?? 0)) : 0
  const lastVariation = latest?.logs.find((log) => log.variation)?.variation
  if (maximumAvailableWeight === null && exercise.equipment.some((equipment) => equipment.includes('dumbbell'))) {
    return { repMin:item.repMin, repMax:item.repMax, seconds:item.seconds, weight:null, variation:exercise.noEquipment, tempo:item.tempo, action:'start', explanation:`No dumbbell is selected today, so use ${exercise.noEquipment}.` }
  }
  if (!latest) {
    const startingWeight = availableWeights[0] ?? maximumAvailableWeight
    return { repMin:item.repMin, repMax:item.repMax, seconds:item.seconds, weight:startingWeight, variation:exercise.standard, tempo:item.tempo, action:'start', explanation:`Start with ${exercise.standard}. Keep the first exposure conservative and calibrate from clean reps.` }
  }
  const latestCompleted = latest.logs.filter((log) => log.completed)
  const safetyVeto = latest.logs.some((log) => log.discomfort || log.formQuality === 'degraded')
  if (safetyVeto) {
    const lighter = [...availableWeights].reverse().find((weight) => weight < lastWeight) ?? null
    return { repMin:item.repMin, repMax:item.repMin, seconds:item.seconds, weight:lighter, variation:exercise.regression, tempo:item.tempo, action:'reduce', explanation:`Last time discomfort or form breakdown was logged. Today uses ${exercise.regression}${lighter ? ` at ${lighter} lb` : ''}; use only a symptom-free range.` }
  }
  const belowTarget = latestCompleted.some((log) => (log.reps ?? log.seconds ?? 0) < (log.targetReps ?? log.targetSeconds ?? latest.item.repMin ?? latest.item.seconds ?? 0) || log.rir === 0)
  if (belowTarget || latestCompleted.length < latest.logs.length) {
    const lighter = ([...availableWeights].reverse().find((weight) => weight < lastWeight) ?? Math.min(lastWeight, maximumAvailableWeight ?? lastWeight)) || null
    return { repMin:item.repMin, repMax:item.repMin, seconds:item.seconds, weight:lighter, variation:lastVariation ?? exercise.standard, tempo:item.tempo, action:'reduce', explanation:'The last exposure missed the lower target, reached failure, or was incomplete. Today returns to the lower target without adding work.' }
  }
  const twoQualified = exposures.slice(0,2).length === 2 && exposures.slice(0,2).every((exposure) => qualifiesForProgression(exposure.logs,exposure.item))
  if (twoQualified) {
    const heavier = availableWeights.find((weight) => weight > lastWeight)
    if (heavier) return { repMin:item.repMin, repMax:item.repMin, seconds:item.seconds, weight:heavier, variation:lastVariation ?? exercise.standard, tempo:item.tempo, action:'increase-weight', explanation:`Two clean exposures reached the top of the range with at least 2 reps in reserve. Move to ${heavier} lb and return to the lower target.` }
    return { repMin:item.repMin, repMax:item.repMax, seconds:item.seconds, weight:lastWeight || maximumAvailableWeight, variation:exercise.progression, tempo:item.tempo, action:'harder-variation', explanation:`Two clean exposures reached the top of the range. No sensible heavier dumbbell is available, so use ${exercise.progression}.` }
  }
  const best = Math.max(0,...latestCompleted.map((log) => log.reps ?? 0))
  if (item.repMin !== undefined && item.repMax !== undefined && best >= item.repMin && best < item.repMax) {
    const next = Math.min(item.repMax,best + 1)
    return { repMin:next, repMax:next, weight:Math.min(lastWeight || maximumAvailableWeight || 0, maximumAvailableWeight ?? Infinity) || null, variation:lastVariation ?? exercise.standard, tempo:item.tempo, action:'increase-reps', explanation:`The last exposure was controlled. Add one clean repetition, moving the target to ${next}, while keeping the same setup.` }
  }
  return { repMin:item.repMin, repMax:item.repMax, seconds:item.seconds, weight:Math.min(lastWeight || maximumAvailableWeight || 0, maximumAvailableWeight ?? Infinity) || null, variation:lastVariation ?? exercise.standard, tempo:item.tempo, action:'repeat', explanation:'Repeat this target until two clean exposures reach the top of the range with at least 2 reps in reserve.' }
}

export function targetRirForDay(day: number, mode: Recommendation['mode']): string {
  if (mode === 'recovery') return 'Easy · at least 4 reps in reserve'
  if (mode === 'reduced' || day <= 14) return 'Easy–moderate · 3–4 reps in reserve'
  if (day <= 35) return 'Moderate · 2–3 reps in reserve'
  if (day <= 63) return 'Moderate–hard · 1–3 reps in reserve'
  if (day <= 84) return 'Hard but clean · 1–2 reps in reserve'
  return 'Easy taper · 3–4 reps in reserve'
}

export function previousExerciseLogs(data: AppData, exerciseId: string): SetLog[] {
  return [...data.sessions].reverse().find((session) => session.sets.some((set) => set.exerciseId === exerciseId))?.sets.filter((set) => set.exerciseId === exerciseId) ?? []
}

export function sessionStatus(sets: SetLog[], mode: string): SessionLog['status'] {
  if (mode === 'recovery') return 'recovery'
  if (sets.length > 0 && sets.every((set) => set.completed)) return 'completed'
  return 'partial'
}

export function consistencyRate(data: AppData, today = new Date()): number {
  if (!data.profile.onboardingComplete) return 0
  const elapsed = getChallengeDay(data.profile.startDate, today)
  const completedDays = new Set(data.sessions.filter((session) => ['completed','partial','recovery'].includes(session.status)).map((session) => session.day)).size
  return Math.round((completedDays / elapsed) * 100)
}

export function totalMinutes(data: AppData): number {
  return Math.round(data.sessions.reduce((sum, session) => sum + session.durationSeconds, 0) / 60)
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

export function todayPlan(data: AppData, now = new Date()) { const day = getChallengeDay(data.profile.startDate, now); return programForDay(day) }
export function templateForMode(templateId: string, mode: Recommendation['mode']) { return templateById[mode === 'minimum' ? 'minimum' : mode === 'recovery' ? 'recovery' : templateId] }
