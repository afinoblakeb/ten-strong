import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock3, Dumbbell, Gauge, Trophy, X } from 'lucide-react'
import { useAppState } from '../AppState'
import { bodyweightTemplateFor, phaseForDay, programForDay, templateById } from '../data/program'
import { exerciseById } from '../data/exercises'
import { adaptivePrescription, consistencyRate, getProgramDay, recommendationForDay, reentryNote, setComparisonKey, targetRirForDay, templateForMode, trainingTemplateForDay } from '../lib/engine'
import { differenceInCalendarDays, parseLocalDate } from '../lib/date'
import type { Readiness } from '../types'

const defaultReadiness: Readiness = { energy:'normal', soreness:'none', pain:'none', hasDumbbells:true, availableWeight:null, minutes:10 }

export function TodayPage() {
  const { data } = useAppState()
  const navigate = useNavigate()
  const highestWeight = data.profile.dumbbells.length ? Math.max(...data.profile.dumbbells) : null
  const [open,setOpen] = useState(false)
  const [habitConfirmed,setHabitConfirmed] = useState(false)
  const [readiness,setReadiness] = useState<Readiness>({...defaultReadiness,availableWeight:highestWeight})
  const day = getProgramDay(data.profile.startDate)
  const templateDecision = trainingTemplateForDay(data,day)
  const template = templateById[templateDecision.templateId]
  const phase = phaseForDay(day)
  const effortLabel=day>90?(template.kind==='recovery'?'Easy · comfortable range and steady breathing':'Moderate–hard · 1–3 reps in reserve'):phase.effort
  const existing = data.sessions.find((session)=>session.day===day)
  const rate = consistencyRate(data)
  const daysUntilStart = Math.max(0,-differenceInCalendarDays(new Date(),parseLocalDate(data.profile.startDate)))
  const recommendation = recommendationForDay(data,day,readiness,template.kind)
  const bodyweightPreview = bodyweightTemplateFor(templateForMode(template.id,recommendation.mode))
  const prescriptions = useMemo(() => template.items.map((item) => ({ item, exercise:exerciseById[item.exerciseId], prescription:adaptivePrescription(data,item,highestWeight,template.id==='assessment'?'baseline':template.id==='final-assessment'?'final':undefined) })),[data,template,highestWeight])
  const personalRecords = useMemo(() => {
    if (!existing) return []
    const earlier = data.sessions.filter((session) => session.day < existing.day).flatMap((session) => session.sets)
    return existing.sets.filter((set) => { const comparable=earlier.filter((prior) => prior.completed&&setComparisonKey(prior)===setComparisonKey(set)); return set.completed&&exerciseById[set.exerciseId]?.pattern!=='recovery'&&comparable.length>0&&(set.reps??set.seconds??0)>Math.max(...comparable.map((prior)=>prior.reps??prior.seconds??0)) }).map((set) => exerciseById[set.exerciseId]?.name ?? set.exerciseId)
  },[data.sessions,existing])
  const nextPlan = programForDay(day+1)
  const recentWindow=Math.min(7,day)
  const recentPractice=new Set(data.sessions.filter((session)=>session.day>day-recentWindow&&session.day<=day).map((session)=>session.day)).size
  const habitAnchor=data.profile.habitAnchor.trim()||'When your chosen daily cue happens'

  function start() { navigate(`/workout/${day}`,{state:{readiness,recommendation}}) }

  return <div className="page">
    {daysUntilStart>0&&<div className="notice prestart"><strong>Your challenge starts {daysUntilStart===1?'tomorrow':`in ${daysUntilStart} days`}.</strong> Day 1 is ready below. You can preview it now or start early if you choose.</div>}
    <section className="today-hero"><div><div className="eyebrow">{day>90?`Continue Strong · Week ${Math.floor((day-91)/7)+1}`:`Day ${day} of 90 · Phase ${phase.id}`}</div><h1>{existing ? (day===90?'You finished Ten Strong.':'Today is in the books.') : template.title}</h1><p>{existing ? (day===90?'Ninety days of useful practice—captured, backed up, and ready to continue.':'You showed up. Tomorrow will meet you where you are.') : template.focus}</p></div><div className="day-orbit" aria-label={day>90?`Continuation day ${day-90}`:`${Math.round(day/90*100)} percent of challenge elapsed`}><strong>{day>90?day-90:day}</strong><span>{day>90?' onward':'/ 90'}</span></div></section>
    <div className="progress-track"><span style={{width:`${Math.min(100,day/90*100)}%`}}/></div>
    <section className="habit-anchor-card"><Clock3/><div><span>Your daily cue · {data.profile.preferredTime}</span><strong>{habitAnchor} → open Ten Strong</strong></div></section>
    {day%7===0&&!existing&&<section className="habit-review card"><div><div className="eyebrow">Weekly cue check</div><strong>{habitConfirmed?'Cue confirmed for another week.':'Did this cue reliably bring you here?'}</strong><p>{habitConfirmed?'Keep the same context stable. You can still change it whenever life changes.':'Plans work better when they are reinforced and adjusted instead of silently abandoned.'}</p></div><div>{!habitConfirmed&&<button className="button secondary" onClick={()=>setHabitConfirmed(true)}>This cue works</button>}<button className="button ghost" onClick={()=>navigate('/settings')}>Adjust cue</button></div></section>}
    {data.profile.photoReminder&&(day===1||day===90)&&!existing&&<aside className="photo-reminder"><strong>Optional progress photo reminder</strong><span>Use the same location, lighting, distance, and relaxed pose. Photos stay in your own camera roll; Ten Strong never accesses them.</span></aside>}
    {existing ? <>
      <section className={`card success-card ${existing.status==='safety'?'safety-complete':''}`}><CheckCircle2/><div><h2>{existing.status==='safety'?'Safety stop logged':existing.status === 'recovery' ? 'Mobility complete' : 'Ten-minute practice complete'}</h2><p>{existing.status==='safety'?'No training is required today, and there is nothing to make up.':`${Math.max(1,Math.round((existing.activitySeconds??existing.durationSeconds)/60))} active minutes · ${existing.sets.filter(s=>s.completed).length} movements logged`}</p></div></section>
      {existing.status!=='safety'&&personalRecords.length>0&&<section className="card pr-card"><Trophy/><div><strong>{personalRecords.length} personal {personalRecords.length===1?'best':'bests'}</strong><p>{[...new Set(personalRecords)].join(' · ')}</p></div></section>}
      {day!==90?<section className="card tomorrow-card"><div><div className="eyebrow">Tomorrow · {day<90?`Day ${day+1}`:`Continuation day ${day-89}`}</div><h2>{templateById[nextPlan.templateId].title}</h2><p>{templateById[nextPlan.templateId].focus}</p></div><span className={`kind ${nextPlan.kind}`}>{nextPlan.kind==='recovery'?'mobility':nextPlan.kind}</span></section>:<section className="card completion-card"><div className="eyebrow">Continue Strong begins tomorrow</div><h2>Keep the ten-minute anchor.</h2><p>Your history and progression stay intact. Day 91 starts with mobility, then settles into a sustainable rhythm of four strength practices and three mobility days each week—no reset or re-onboarding.</p><button className="button secondary" onClick={()=>navigate('/plan')}>Preview continuation</button></section>}
    </> : <>
      <section className="workout-summary card"><div className="summary-top"><span className={`kind ${template.kind}`}>{template.kind==='recovery'?'mobility':template.kind}</span><span><Clock3/> 10 min</span></div><div className="exercise-preview-list">{prescriptions.map(({item,exercise,prescription},index)=><div className="preview-row" key={item.exerciseId}><span className="number">0{index+1}</span><div><strong>{exercise.name}</strong><small>{item.sets} × {prescription.repMin ? `${prescription.repMin}${prescription.repMax!==prescription.repMin?`–${prescription.repMax}`:''} reps` : `${prescription.seconds} sec`} · {prescription.tempo}</small><small className="adaptive-preview">{prescription.weight ? `${prescription.weight} lb · `:''}{prescription.variation}</small></div></div>)}</div><div className="meta-row"><span><Dumbbell/> {template.equipment.join(' · ')}</span><span><Gauge/> {effortLabel}</span></div></section>
      {templateDecision.explanation&&<div className="notice"><strong>Progress follows practice.</strong> {templateDecision.explanation}</div>}
      {template.kind==='strength'&&reentryNote(data,day) && <div className="notice"><strong>Welcome back.</strong> {reentryNote(data,day)}</div>}
      {data.sessions.length>0&&<section className="card why-card"><div className="eyebrow">Why today looks like this</div>{prescriptions.slice(0,2).map(({exercise,prescription})=><p key={exercise.id}><strong>{exercise.name}:</strong> {prescription.explanation}</p>)}</section>}
      <button className="button primary start-button" onClick={()=>setOpen(true)}>{daysUntilStart?'Preview readiness':'Check readiness'} <ArrowRight/></button>
    </>}
    {data.sessions.length?<section className="quiet-stats"><div><strong>{rate}%</strong><span>consistency</span></div><div><strong>{data.sessions.length}</strong><span>days recorded</span></div><div><strong>{recentPractice}/{recentWindow}</strong><span>recent days</span></div></section>:<section className="ready-state"><strong>Ready to begin.</strong><span>Your only job is today’s ten active minutes.</span></section>}
    {open && <div className="modal-backdrop" role="presentation"><section className="sheet" role="dialog" aria-modal="true" aria-labelledby="readiness-title"><button className="icon-button close" onClick={()=>setOpen(false)} aria-label="Close readiness check"><X/></button><div className="eyebrow">Ten-second check-in</div><h2 id="readiness-title">How are you arriving?</h2>
      <fieldset><legend>Energy</legend><div className="segmented">{(['low','normal','high'] as const).map(v=><button type="button" className={readiness.energy===v?'selected':''} onClick={()=>setReadiness({...readiness,energy:v})} key={v}>{v}</button>)}</div></fieldset>
      <fieldset><legend>Soreness</legend><div className="segmented">{(['none','mild','significant'] as const).map(v=><button type="button" className={readiness.soreness===v?'selected':''} onClick={()=>setReadiness({...readiness,soreness:v})} key={v}>{v}</button>)}</div></fieldset>
      <fieldset><legend>Pain beyond normal muscle effort?</legend><div className="segmented two">{(['none','present'] as const).map(v=><button type="button" className={readiness.pain===v?'selected':''} onClick={()=>setReadiness({...readiness,pain:v})} key={v}>{v}</button>)}</div></fieldset>
      <fieldset><legend>Dumbbells today?</legend><div className="segmented two"><button type="button" className={readiness.hasDumbbells?'selected':''} onClick={()=>setReadiness({...readiness,hasDumbbells:true,availableWeight:readiness.availableWeight??highestWeight})}>Yes, I have them</button><button type="button" className={!readiness.hasDumbbells?'selected':''} onClick={()=>setReadiness({...readiness,hasDumbbells:false,availableWeight:null})}>No dumbbells</button></div></fieldset>
      {readiness.hasDumbbells?<label>Heaviest dumbbell available today<select value={readiness.availableWeight ?? ''} onChange={(e)=>setReadiness({...readiness,availableWeight:e.target.value ? Number(e.target.value):null})}><option value="">Weight not listed / not sure</option>{data.profile.dumbbells.map(w=><option key={w} value={w}>{w} lb</option>)}</select></label>:recommendation.mode!=='stop'&&<section className="bodyweight-queue" aria-live="polite"><strong>Bodyweight travel session queued</strong><p>Today swaps to a zero-equipment circuit. Your normal dumbbell queue and loaded progression stay ready for the next day you have them.</p><div>{bodyweightPreview.items.map((item)=><span key={item.exerciseId}>{exerciseById[item.exerciseId].name}</span>)}</div>{template.kind==='assessment'&&<small>For a true Day 1 / Day 90 comparison, repeat the final test later with the same equipment setup when practical.</small>}</section>}
      <div className={`readiness-result ${recommendation.mode}`}><strong>{recommendation.title}</strong><p>{recommendation.explanation}</p><small>{targetRirForDay(day,recommendation.mode)}</small></div>
      <button className="button primary wide" onClick={start}>{recommendation.mode==='stop'?'View safety guidance':daysUntilStart?'Start Day 1 early':`Start ${recommendation.title}`}</button></section></div>}
  </div>
}
