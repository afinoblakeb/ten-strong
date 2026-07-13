import type { Phase, ProgramDay, WorkoutTemplate } from '../types'

export const phases: Phase[] = [
  { id:1, name:'Re-entry & movement quality', start:1, end:14, intent:'Rebuild tolerance, learn the movements, and establish the ten-minute cue.', effort:'Easy to moderate · finish with 3–4 reps in reserve' },
  { id:2, name:'Capacity & consistency', start:15, end:35, intent:'Accumulate useful repetitions and make progression repeatable.', effort:'Moderate · usually 2–3 reps in reserve' },
  { id:3, name:'Strength emphasis', start:36, end:63, intent:'Use load, leverage, and unilateral work to make strength measurable.', effort:'Moderate to hard · usually 1–3 reps in reserve' },
  { id:4, name:'Intensification', start:64, end:84, intent:'Apply focused hard work without adding junk volume.', effort:'Hard but controlled · mostly 1–2 reps in reserve' },
  { id:5, name:'Taper & final assessment', start:85, end:90, intent:'Shed fatigue, repeat safe tests, and decide what comes next.', effort:'Easy early; one technically clean assessment' },
]

export const templates: WorkoutTemplate[] = [
  { id:'assessment', title:'Starting point', focus:'Calm, technically clean baseline', kind:'assessment', equipment:['one manageable dumbbell','floor','chair'], items:[
    { exerciseId:'incline-pushup', sets:1, repMin:3, repMax:12, tempo:'2–1–1', restSeconds:30, note:'Stop with about 3 good reps left. Record the incline height.' },
    { exerciseId:'goblet-squat', sets:1, repMin:5, repMax:12, tempo:'3–1–1', restSeconds:30, note:'Choose an easy load; stop well before strain.' },
    { exerciseId:'one-arm-row', sets:1, repMin:5, repMax:12, tempo:'2–1–2', restSeconds:25, note:'Complete both sides; log the weaker side.' },
    { exerciseId:'side-plank', sets:1, seconds:20, tempo:'steady', restSeconds:20, note:'Stop as soon as alignment changes.' },
  ]},
  { id:'foundation-a', title:'Press + squat', focus:'Horizontal push and knee strength', kind:'strength', equipment:['dumbbell','chair or floor'], items:[
    { exerciseId:'incline-pushup', sets:2, repMin:6, repMax:12, tempo:'3–1–1', restSeconds:15 },
    { exerciseId:'goblet-squat', sets:2, repMin:8, repMax:12, tempo:'3–1–1', restSeconds:20 },
    { exerciseId:'dead-bug', sets:1, seconds:30, tempo:'slow', restSeconds:15 },
  ]},
  { id:'foundation-b', title:'Pull + hinge', focus:'Back, hips, and trunk', kind:'strength', equipment:['dumbbell','chair or couch'], items:[
    { exerciseId:'one-arm-row', sets:2, repMin:8, repMax:12, tempo:'2–1–2', restSeconds:15 },
    { exerciseId:'rdl', sets:2, repMin:8, repMax:12, tempo:'3–1–1', restSeconds:20 },
    { exerciseId:'side-plank', sets:1, seconds:20, tempo:'steady', restSeconds:15 },
  ]},
  { id:'unilateral', title:'Single-side strength', focus:'Legs, shoulders, and balance', kind:'strength', equipment:['one dumbbell','chair or wall'], items:[
    { exerciseId:'split-squat', sets:2, repMin:6, repMax:10, tempo:'3–1–1', restSeconds:15 },
    { exerciseId:'oh-press', sets:2, repMin:6, repMax:10, tempo:'2–1–1', restSeconds:20 },
    { exerciseId:'suitcase-carry', sets:1, seconds:30, tempo:'slow walk', restSeconds:15 },
  ]},
  { id:'density', title:'Total-body density', focus:'Useful work in a small window', kind:'strength', equipment:['dumbbell','floor'], items:[
    { exerciseId:'floor-press', sets:2, repMin:8, repMax:14, tempo:'2–1–1', restSeconds:10 },
    { exerciseId:'reverse-lunge', sets:2, repMin:6, repMax:10, tempo:'2–1–1', restSeconds:10 },
    { exerciseId:'rear-delt-row', sets:2, repMin:10, repMax:15, tempo:'2–1–2', restSeconds:15 },
  ]},
  { id:'strength-a', title:'Loaded fundamentals', focus:'Press, squat, and brace', kind:'strength', equipment:['dumbbells','floor'], items:[
    { exerciseId:'floor-press', sets:3, repMin:6, repMax:10, tempo:'2–1–1', restSeconds:20 },
    { exerciseId:'goblet-squat', sets:3, repMin:6, repMax:10, tempo:'3–1–1', restSeconds:20 },
    { exerciseId:'dead-bug', sets:1, seconds:35, tempo:'slow', restSeconds:10 },
  ]},
  { id:'strength-b', title:'Posterior strength', focus:'Row, hinge, and carry', kind:'strength', equipment:['dumbbells','chair'], items:[
    { exerciseId:'one-arm-row', sets:2, repMin:6, repMax:10, tempo:'2–1–2', restSeconds:20 },
    { exerciseId:'single-rdl', sets:2, repMin:6, repMax:10, tempo:'3–1–1', restSeconds:20 },
    { exerciseId:'suitcase-carry', sets:1, seconds:35, tempo:'slow walk', restSeconds:10 },
  ]},
  { id:'intense-a', title:'Controlled intensity', focus:'Paused push and unilateral legs', kind:'strength', equipment:['dumbbell','floor','chair'], items:[
    { exerciseId:'pushup', sets:3, repMin:5, repMax:10, tempo:'3–2–1', restSeconds:20, note:'Use an incline if the pause breaks position.' },
    { exerciseId:'split-squat', sets:2, repMin:6, repMax:10, tempo:'3–1–1', restSeconds:20 },
    { exerciseId:'side-plank', sets:1, seconds:30, tempo:'steady', restSeconds:10 },
  ]},
  { id:'intense-b', title:'Heavy enough', focus:'Mechanical tension with available load', kind:'strength', equipment:['dumbbells','chair'], items:[
    { exerciseId:'one-arm-row', sets:2, repMin:8, repMax:12, tempo:'3–2–1', restSeconds:20 },
    { exerciseId:'rdl', sets:2, repMin:8, repMax:12, tempo:'4–1–1', restSeconds:20 },
    { exerciseId:'oh-press', sets:2, repMin:5, repMax:8, tempo:'2–1–1', restSeconds:15 },
  ]},
  { id:'recovery', title:'Move, breathe, reset', focus:'Recovery and movement quality', kind:'recovery', equipment:['floor or wall'], items:[
    { exerciseId:'recovery-flow', sets:1, seconds:240, tempo:'easy', restSeconds:0, note:'Cycle through cat-cow, wall slides, easy hinges, and marching.' },
    { exerciseId:'calf-raise', sets:1, repMin:8, repMax:15, tempo:'2–1–2', restSeconds:0 },
  ]},
  { id:'minimum', title:'Five-minute minimum', focus:'Keep the cue; earn a useful stimulus', kind:'strength', equipment:['one dumbbell optional','chair or wall'], items:[
    { exerciseId:'incline-pushup', sets:1, repMin:6, repMax:12, tempo:'2–1–1', restSeconds:10 },
    { exerciseId:'split-squat', sets:1, repMin:6, repMax:10, tempo:'2–1–1', restSeconds:10 },
    { exerciseId:'one-arm-row', sets:1, repMin:8, repMax:12, tempo:'2–1–2', restSeconds:10 },
    { exerciseId:'dead-bug', sets:1, seconds:30, tempo:'slow', restSeconds:0 },
  ]},
  { id:'final-assessment', title:'90-day check-in', focus:'Repeatable tests, not max effort', kind:'assessment', equipment:['same setup used on Day 1'], items:[
    { exerciseId:'incline-pushup', sets:1, repMin:3, repMax:20, tempo:'2–1–1', restSeconds:30, note:'Use the same setup as Day 1; stop at technical failure.' },
    { exerciseId:'goblet-squat', sets:1, repMin:5, repMax:20, tempo:'3–1–1', restSeconds:30, note:'Use the same weight as Day 1.' },
    { exerciseId:'one-arm-row', sets:1, repMin:5, repMax:20, tempo:'2–1–2', restSeconds:25, note:'Use the same weight and support as Day 1.' },
    { exerciseId:'side-plank', sets:1, seconds:60, tempo:'steady', restSeconds:20, note:'Stop at technical failure or 60 seconds.' },
  ]},
]

export const templateById = Object.fromEntries(templates.map((template) => [template.id, template]))

const phaseCycle: Record<number, string[]> = {
  1: ['foundation-a','recovery','foundation-b','recovery','unilateral','recovery','foundation-a'],
  2: ['foundation-a','foundation-b','recovery','unilateral','density','recovery','foundation-b'],
  3: ['strength-a','strength-b','recovery','unilateral','strength-a','density','recovery'],
  4: ['intense-a','intense-b','recovery','strength-a','intense-b','density','recovery'],
  5: ['foundation-a','recovery','foundation-b','recovery','recovery','recovery'],
}

export function phaseForDay(day: number): Phase {
  return phases.find((phase) => day >= phase.start && day <= phase.end) ?? phases[phases.length - 1]
}

export function programForDay(day: number): ProgramDay {
  const safeDay = Math.min(90, Math.max(1, day))
  if (safeDay === 1) return { day:1, phaseId:1, templateId:'assessment', kind:'assessment', title:'Starting point' }
  if (safeDay === 89) return { day:89, phaseId:5, templateId:'recovery', kind:'recovery', title:'Recover & prepare' }
  if (safeDay === 90) return { day:90, phaseId:5, templateId:'final-assessment', kind:'assessment', title:'Final assessment' }
  const phase = phaseForDay(safeDay)
  const cycle = phaseCycle[phase.id]
  const index = phase.id === 1 ? (safeDay - phase.start - 1 + cycle.length) % cycle.length : (safeDay - phase.start) % cycle.length
  const templateId = cycle[index]
  const template = templateById[templateId]
  return { day:safeDay, phaseId:phase.id, templateId, kind:template.kind, title:template.title }
}

export const fullProgram = Array.from({ length:90 }, (_, index) => programForDay(index + 1))
