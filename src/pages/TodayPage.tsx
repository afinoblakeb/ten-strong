// oxlint-disable react/only-export-components -- page helpers are exported for unit tests (vitest runs src/**/*.test.ts)
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock3, Dumbbell, Gauge, Trophy, X } from 'lucide-react'
import { useAppState } from '../AppState'
import { bodyweightTemplateFor, phaseForDay, programForDay, templateById } from '../data/program'
import { exerciseById } from '../data/exercises'
import { adaptivePrescription, adjustedSetCount, consistencyRate, getProgramDay, recommendationForDay, reentryNote, setComparisonKey, streakInfo, targetRirForDay, templateForMode, trainingTemplateForDay, type AdaptivePrescription } from '../lib/engine'
import { differenceInCalendarDays, formatISODate, parseLocalDate } from '../lib/date'
import type { AppData, Readiness, Recommendation, SessionKind, SessionStatus, WorkoutItem } from '../types'

// D12: energy/soreness prefill from the most recent session; pain ALWAYS resets to 'none'.
// Equipment comes from the profile inventory — an empty inventory means bodyweight, no daily question.
export function initialReadiness(data: AppData): Readiness {
  const last=[...data.sessions].sort((a,b)=>b.day-a.day)[0]?.readiness
  const inventory=data.profile.dumbbells
  const highest=inventory.length?Math.max(...inventory):null
  const remembered=last?.availableWeight!=null&&inventory.includes(last.availableWeight)?last.availableWeight:highest
  return { energy:last?.energy??'normal', soreness:last?.soreness??'none', pain:'none', hasDumbbells:inventory.length>0, availableWeight:remembered }
}

export function backupNudgeDue(data: AppData, today = new Date()): boolean {
  if (data.sessions.length<5) return false
  return !data.lastBackupAt||differenceInCalendarDays(today,parseLocalDate(data.lastBackupAt))>14
}

export function backedUpRecently(data: AppData, today = new Date()): boolean {
  return !!data.lastBackupAt&&differenceInCalendarDays(today,parseLocalDate(data.lastBackupAt))<=14
}

// Weekly cue check surfaces on day multiples of 7 and stays confirmed for a week once answered.
export function cueCheckDue(data: AppData, day: number, todayISO = formatISODate(new Date())): boolean {
  if (day%7!==0) return false
  const through=data.profile.cueConfirmedThrough
  return !through||todayISO>through
}

export function effortLabelFor(day: number, kind: SessionKind): string {
  if (kind==='recovery') return 'Easy · comfortable range and steady breathing'
  if (day>90) return 'Moderate–hard · 1–3 reps in reserve'
  return phaseForDay(day).effort
}

export function completionHeadline(status: SessionStatus, day: number): string {
  if (day===90) return 'You finished Ten Strong.'
  if (status==='safety') return 'Stopping was the right call.'
  if (status==='recovery') return 'Mobility day, done.'
  return 'Today is in the books.'
}

// The one short "why" line per exercise — replaces the old stacked "Why today looks like this" card.
export function previewDelta(prescription: AdaptivePrescription): string | null {
  if (prescription.action==='increase-weight') return prescription.weight!==null?`up to ${prescription.weight} lb today`:'moves up today'
  if (prescription.action==='increase-reps') return `target up to ${prescription.repMin}`
  if (prescription.action==='harder-variation') return 'steps up today'
  if (prescription.action==='reduce') return 'easier today'
  return null
}

interface ResumeDraft { logs:unknown[]; index:number; finishing?:boolean; readiness?:Partial<Readiness>; recommendation?:Recommendation }
function readResumeDraft(key: string): ResumeDraft | null {
  try { const parsed=JSON.parse(localStorage.getItem(key)??'null'); return parsed&&Array.isArray(parsed.logs)&&typeof parsed.index==='number'?parsed as ResumeDraft:null } catch { return null }
}

// A mid-workout draft with no logged session turns the CTA into "Resume workout · N of M done".
export function resumeInfo(data: AppData, day: number): { done:number; total:number; kind:SessionKind } | null {
  if (data.sessions.some((session)=>session.day===day)) return null
  const draft=readResumeDraft(`ten-strong-draft-d${day}-db`)??readResumeDraft(`ten-strong-draft-d${day}-bw`)??readResumeDraft(`ten-strong-draft-d${day}`)
  const recommendation=draft?.recommendation
  if (!draft||!recommendation) return null
  const hasDumbbells=draft.readiness?.hasDumbbells??true
  const base=templateById[trainingTemplateForDay(data,day).templateId]
  const modeTemplate=templateForMode(base.id,recommendation.mode,day)
  const template=hasDumbbells?modeTemplate:bodyweightTemplateFor(modeTemplate)
  const primer:WorkoutItem[]=template.kind!=='recovery'&&modeTemplate.id!=='minimum'?[{exerciseId:'strength-primer',sets:1,seconds:60,tempo:'easy rehearsal',restSeconds:10}]:[]
  const total=[...primer,...template.items].reduce((sum,item)=>sum+adjustedSetCount(item,recommendation),0)
  const done=Math.min(total,draft.finishing?total:draft.index)
  return total>0&&done>0?{done,total,kind:template.kind}:null
}

function Choice<T extends string>({ label, options, value, onSelect, two }: { label:string; options:Array<{value:T;label:string}>; value:T; onSelect:(next:T)=>void; two?:boolean }) {
  return <fieldset><legend>{label}</legend><div className={`segmented${two?' two':''}`} role="radiogroup" aria-label={label}>{options.map((option)=><button type="button" role="radio" aria-checked={value===option.value} className={value===option.value?'selected':''} onClick={()=>onSelect(option.value)} key={option.value}>{option.label}</button>)}</div></fieldset>
}

export function TodayPage() {
  const { data, loadFailure, updateProfile } = useAppState()
  const navigate = useNavigate()
  const inventory = data.profile.dumbbells
  const hasInventory = inventory.length>0
  const highestWeight = hasInventory?Math.max(...inventory):null
  const [open,setOpen] = useState(false)
  const [readiness,setReadiness] = useState<Readiness>(()=>initialReadiness(data))
  const sheetRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLButtonElement>(null)
  const day = getProgramDay(data.profile.startDate)
  const templateDecision = trainingTemplateForDay(data,day)
  const template = templateById[templateDecision.templateId]
  const phase = phaseForDay(day)
  const existing = data.sessions.find((session)=>session.day===day)
  const rate = consistencyRate(data)
  const streak = streakInfo(data)
  const daysUntilStart = Math.max(0,-differenceInCalendarDays(new Date(),parseLocalDate(data.profile.startDate)))
  const recommendation = recommendationForDay(data,day,readiness,template.kind)
  const assessmentMode = template.id==='assessment'?'baseline':template.id==='final-assessment'?'final':undefined
  const previewTemplate = useMemo(()=>hasInventory?template:bodyweightTemplateFor(template),[hasInventory,template])
  const prescriptions = useMemo(()=>previewTemplate.items.map((item)=>({item,exercise:exerciseById[item.exerciseId],prescription:adaptivePrescription(data,item,highestWeight,assessmentMode,hasInventory,day)})),[data,previewTemplate,highestWeight,assessmentMode,hasInventory,day])
  const bodyweightPreview = useMemo(()=>bodyweightTemplateFor(templateForMode(template.id,recommendation.mode,day)),[template.id,recommendation.mode,day])
  const resume = useMemo(()=>resumeInfo(data,day),[data,day])
  const personalRecords = useMemo(() => {
    if (!existing) return []
    const earlier = data.sessions.filter((session) => session.day < existing.day).flatMap((session) => session.sets)
    return existing.sets.filter((set) => { const comparable=earlier.filter((prior) => prior.completed&&setComparisonKey(prior)===setComparisonKey(set)); return set.completed&&exerciseById[set.exerciseId]?.pattern!=='recovery'&&comparable.length>0&&(set.reps??set.seconds??0)>Math.max(...comparable.map((prior)=>prior.reps??prior.seconds??0)) }).map((set) => exerciseById[set.exerciseId]?.name ?? set.exerciseId)
  },[data.sessions,existing])
  const nextPlan = programForDay(day+1)
  const habitAnchor = data.profile.habitAnchor.trim()||'When your daily cue happens'
  const cueDue = cueCheckDue(data,day)&&!existing
  const equipmentQuestion = template.kind!=='recovery'&&hasInventory
  const reentryLine = reentryNote(data,day)
  const effortLabel = effortLabelFor(day,template.kind)

  // D10: at most ONE explanation/notice block above the preview. Priority: load failure (rendered
  // by the Layout banner, so Today stays quiet) > tier explanation > re-entry note > backup nudge.
  const notice = loadFailure ? null
    : templateDecision.explanation ? <div className="notice">{templateDecision.explanation}</div>
    : reentryLine ? <div className="notice"><strong>Welcome back.</strong> {reentryLine}</div>
    : backupNudgeDue(data) ? <div className="notice quiet">Your history lives only on this phone — <Link to="/settings">take a 10-second backup</Link>.</div>
    : null

  useEffect(() => {
    if (!open) return
    const trigger=ctaRef.current
    sheetRef.current?.focus()
    document.body.style.overflow='hidden'
    return () => { document.body.style.overflow=''; trigger?.focus() }
  },[open])

  function onSheetKeyDown(event: KeyboardEvent) {
    if (event.key==='Escape') { event.stopPropagation(); setOpen(false); return }
    if (event.key!=='Tab'||!sheetRef.current) return
    const focusables=Array.from(sheetRef.current.querySelectorAll<HTMLElement>('button, select, a[href], input, [tabindex]:not([tabindex="-1"])')).filter((element)=>!element.hasAttribute('disabled'))
    if (!focusables.length) return
    const first=focusables[0], last=focusables[focusables.length-1], active=document.activeElement
    if (event.shiftKey&&(active===first||active===sheetRef.current)) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey&&active===last) { event.preventDefault(); first.focus() }
  }

  function confirmCue() { const until=new Date(); until.setDate(until.getDate()+6); updateProfile({cueConfirmedThrough:formatISODate(until)}) }
  function start() { navigate(`/workout/${day}`,{state:{readiness,recommendation}}) }

  const completionLine = !existing ? '' :
    day===90 ? (backedUpRecently(data)?'Ninety days of useful practice—logged, backed up, and ready to continue.':'Ninety days, all logged. Take a 10-second backup in Settings to keep a permanent copy.')
    : existing.status==='safety' ? 'Nothing to make up. Tomorrow starts fresh.'
    : existing.status==='recovery' ? 'Easy movement counts all the same. Tomorrow will meet you ready.'
    : 'You showed up. Tomorrow will meet you where you are.'
  const sheetStartLabel = recommendation.mode==='stop'?'View safety guidance':daysUntilStart?'Start Day 1 early':template.kind==='assessment'?'Start the assessment':`Start ${recommendation.title}`

  return <div className="page today-page">
    <section className="today-hero"><div>
      <div className="eyebrow">{day>90?`Continue Strong · Week ${Math.floor((day-91)/7)+1}`:daysUntilStart?`Starts ${daysUntilStart===1?'tomorrow':`in ${daysUntilStart} days`}`:`Day ${day} of 90 · Phase ${phase.id}`}</div>
      <h1>{existing?completionHeadline(existing.status,day):template.title}</h1>
      <p>{existing?completionLine:daysUntilStart?'Day 1 is ready below — preview it now, or start early if today works.':template.focus}</p>
      {!existing&&<small className="cue-line"><Clock3/> {habitAnchor} · {data.profile.preferredTime.toLowerCase()}</small>}
    </div><div className="day-orbit" aria-label={day>90?`Continuation day ${day-90}`:`${Math.round(day/90*100)} percent of challenge elapsed`}><strong>{day>90?day-90:day}</strong><span>{day>90?' onward':'/ 90'}</span></div></section>
    <div className="progress-track"><span style={{width:`${Math.min(100,day/90*100)}%`}}/></div>
    {existing ? <>
      <section className={`card success-card ${existing.status==='safety'?'safety-complete':''}`}><CheckCircle2/><div>
        <h2>{existing.status==='safety'?'Safety stop logged':existing.status==='recovery'?'Mobility complete':'Ten-minute practice complete'}</h2>
        <p>{existing.status==='safety'?'No training today, and nothing to make up.':`${Math.max(1,Math.round((existing.activitySeconds??existing.durationSeconds)/60))} active minutes · ${existing.sets.filter(s=>s.completed).length} movements logged`}</p>
        {existing.status!=='safety'&&streak.current>=2&&<small className="streak-line">{streak.current} days in a row</small>}
      </div></section>
      {existing.status!=='safety'&&personalRecords.length>0&&<section className="card pr-card"><Trophy/><div><strong>{personalRecords.length} personal {personalRecords.length===1?'best':'bests'}</strong><p>{[...new Set(personalRecords)].join(' · ')}</p></div></section>}
      {day!==90?<section className="card tomorrow-card"><div><div className="eyebrow">Tomorrow · {day<90?`Day ${day+1}`:`Continuation day ${day-89}`}</div><h2>{templateById[nextPlan.templateId].title}</h2><p>{templateById[nextPlan.templateId].focus}</p></div><span className={`kind ${nextPlan.kind}`}>{nextPlan.kind==='recovery'?'mobility':nextPlan.kind}</span></section>:<section className="card completion-card"><div className="eyebrow">Continue Strong begins tomorrow</div><h2>Keep the ten-minute anchor.</h2><p>Your history and progression stay intact. Day 91 starts with mobility, then settles into a sustainable rhythm of four strength practices and three mobility days each week—no reset or re-onboarding.</p><button className="button secondary" onClick={()=>navigate('/plan')}>Preview continuation</button></section>}
    </> : <>
      {resume
        ? <button ref={ctaRef} className="button primary start-button" onClick={()=>navigate(`/workout/${day}`)}>Resume {resume.kind==='recovery'?'mobility':'workout'} · {resume.done} of {resume.total} done <ArrowRight/></button>
        : <button ref={ctaRef} className="button primary start-button" onClick={()=>setOpen(true)}>{daysUntilStart?'Preview Day 1':`Start today's ${template.kind==='recovery'?'mobility':'workout'}`} <ArrowRight/></button>}
      {notice}
      <section className="workout-summary card"><div className="summary-top"><span className={`kind ${template.kind}`}>{template.kind==='recovery'?'mobility':template.kind}</span><span><Clock3/> 10 min</span></div>
        <div className="exercise-preview-list">{prescriptions.map(({item,exercise,prescription},index)=>{
          const count=recommendation.mode==='stop'||(recommendation.mode==='recovery'&&template.kind!=='recovery')?item.sets:adjustedSetCount(item,recommendation)
          const delta=previewDelta(prescription)
          return <div className="preview-row" key={item.exerciseId}><span className="number">0{index+1}</span><div><strong>{exercise.name}</strong><small>{count} × {prescription.repMin?`${prescription.repMin}${prescription.repMax!==prescription.repMin?`–${prescription.repMax}`:''} reps`:`${prescription.seconds} sec`} · {prescription.tempo}</small><small className="adaptive-preview">{prescription.weight?`${prescription.weight} lb · `:''}{prescription.variation}{delta&&<span className="preview-delta"> · {delta}</span>}</small></div></div>})}
        </div>
        <div className="meta-row"><span><Dumbbell/> {previewTemplate.equipment.join(' · ')}</span><span><Gauge/> {effortLabel}</span></div></section>
      {cueDue&&<section className="habit-review card"><div><div className="eyebrow">Weekly cue check</div><strong>Is “{habitAnchor}” still bringing you here?</strong></div><div><button className="button secondary" onClick={confirmCue}>This cue works</button><button className="button ghost" onClick={()=>navigate('/settings')}>Adjust cue</button></div></section>}
      {data.profile.photoReminder&&(day===1||day===90)&&<aside className="photo-reminder"><strong>Optional progress photo reminder</strong><span>Use the same location, lighting, distance, and relaxed pose. Photos stay in your own camera roll; Ten Strong never accesses them.</span></aside>}
    </>}
    {data.sessions.length?<section className="quiet-stats"><div><strong>{streak.current}</strong><span>day streak</span></div><div><strong>{streak.best}</strong><span>best streak</span></div><div><strong>{rate}%</strong><span>consistency</span></div></section>:<section className="ready-state"><strong>Ready to begin.</strong><span>Your only job is today’s ten active minutes.</span></section>}
    {open && <div className="modal-backdrop" role="presentation" onKeyDown={onSheetKeyDown} onClick={(event)=>{if(event.target===event.currentTarget)setOpen(false)}}><section className="sheet" role="dialog" aria-modal="true" aria-labelledby="readiness-title" ref={sheetRef} tabIndex={-1}><button className="icon-button close" onClick={()=>setOpen(false)} aria-label="Close readiness check"><X/></button><div className="eyebrow">Ten-second check-in</div><h2 id="readiness-title">How are you arriving?</h2>
      <Choice label="Energy" options={[{value:'low',label:'Low'},{value:'normal',label:'Normal'},{value:'high',label:'High'}]} value={readiness.energy} onSelect={(energy)=>setReadiness({...readiness,energy})}/>
      <Choice label="Soreness" options={[{value:'none',label:'None'},{value:'mild',label:'Mild'},{value:'significant',label:'Significant'}]} value={readiness.soreness} onSelect={(soreness)=>setReadiness({...readiness,soreness})}/>
      <Choice label="Pain beyond normal muscle effort?" two options={[{value:'none',label:'No'},{value:'present',label:'Yes'}]} value={readiness.pain} onSelect={(pain)=>setReadiness({...readiness,pain})}/>
      {equipmentQuestion&&<>
        <Choice label="Dumbbells today?" two options={[{value:'yes',label:'Yes'},{value:'no',label:'Not today'}]} value={readiness.hasDumbbells?'yes':'no'} onSelect={(answer)=>setReadiness(answer==='yes'?{...readiness,hasDumbbells:true,availableWeight:readiness.availableWeight??highestWeight}:{...readiness,hasDumbbells:false,availableWeight:null})}/>
        {readiness.hasDumbbells?<label>Heaviest dumbbell available today<select value={readiness.availableWeight ?? ''} onChange={(e)=>setReadiness({...readiness,availableWeight:e.target.value?Number(e.target.value):null})}><option value="">Weight not listed / not sure</option>{inventory.map(w=><option key={w} value={w}>{w} lb</option>)}</select></label>
        :recommendation.mode!=='stop'&&<section className="bodyweight-queue" aria-live="polite"><strong>Bodyweight session queued — your dumbbell progression stays saved.</strong><div>{bodyweightPreview.items.map((item)=><span key={item.exerciseId}>{exerciseById[item.exerciseId].name}</span>)}</div>{template.kind==='assessment'&&<small>Repeat the test with the same setup later for a true comparison.</small>}</section>}
      </>}
      <div className={`readiness-result ${recommendation.mode}`}><strong>{recommendation.title}</strong><p>{recommendation.explanation}</p><small>{template.kind==='recovery'&&recommendation.mode!=='stop'?effortLabel:targetRirForDay(day,recommendation.mode)}</small></div>
      <div className="sheet-footer"><button className="button primary wide" onClick={start}>{sheetStartLabel}</button></div></section></div>}
  </div>
}
