import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock3, Dumbbell, Gauge, Trophy, X } from 'lucide-react'
import { useAppState } from '../AppState'
import { phaseForDay, programForDay, templateById } from '../data/program'
import { exerciseById } from '../data/exercises'
import { adaptivePrescription, consistencyRate, getChallengeDay, recommendationForDay, reentryNote, targetRirForDay, todayPlan } from '../lib/engine'
import { differenceInCalendarDays, parseLocalDate } from '../lib/date'
import type { Readiness } from '../types'

const defaultReadiness: Readiness = { energy:'normal', soreness:'none', pain:'none', availableWeight:null, minutes:10 }

export function TodayPage() {
  const { data } = useAppState()
  const navigate = useNavigate()
  const highestWeight = data.profile.dumbbells.length ? Math.max(...data.profile.dumbbells) : null
  const [open,setOpen] = useState(false)
  const [readiness,setReadiness] = useState<Readiness>({...defaultReadiness,availableWeight:highestWeight})
  const day = getChallengeDay(data.profile.startDate)
  const plan = todayPlan(data)
  const template = templateById[plan.templateId]
  const phase = phaseForDay(day)
  const existing = data.sessions.find((session)=>session.day===day)
  const rate = consistencyRate(data)
  const daysUntilStart = Math.max(0,-differenceInCalendarDays(new Date(),parseLocalDate(data.profile.startDate)))
  const recommendation = recommendationForDay(data,day,readiness,template.kind)
  const prescriptions = useMemo(() => template.items.map((item) => ({ item, exercise:exerciseById[item.exerciseId], prescription:adaptivePrescription(data,item,highestWeight,template.id==='assessment'?'baseline':template.id==='final-assessment'?'final':undefined) })),[data,template,highestWeight])
  const personalRecords = useMemo(() => {
    if (!existing) return []
    const earlier = data.sessions.filter((session) => session.day < existing.day).flatMap((session) => session.sets)
    return existing.sets.filter((set) => { const comparable=earlier.filter((prior) => prior.exerciseId === set.exerciseId && prior.completed); return set.completed && comparable.length>0 && (set.reps ?? set.seconds ?? 0) > Math.max(...comparable.map((prior) => prior.reps ?? prior.seconds ?? 0)) }).map((set) => exerciseById[set.exerciseId]?.name ?? set.exerciseId)
  },[data.sessions,existing])
  const nextPlan = programForDay(Math.min(90,day+1))
  const recentWindow=Math.min(7,day)
  const recentPractice=new Set(data.sessions.filter((session)=>session.day>day-recentWindow&&session.day<=day).map((session)=>session.day)).size

  function start() { navigate(`/workout/${day}`,{state:{readiness,recommendation}}) }

  return <div className="page">
    {daysUntilStart>0&&<div className="notice prestart"><strong>Your challenge starts {daysUntilStart===1?'tomorrow':`in ${daysUntilStart} days`}.</strong> Day 1 is ready below. You can preview it now or start early if you choose.</div>}
    <section className="today-hero"><div><div className="eyebrow">Day {day} of 90 · Phase {phase.id}</div><h1>{existing ? (day===90?'You finished Ten Strong.':'Today is in the books.') : template.title}</h1><p>{existing ? (day===90?'Ninety days of useful practice—captured, backed up, and ready to continue.':'You showed up. Tomorrow will meet you where you are.') : template.focus}</p></div><div className="day-orbit" aria-label={`${Math.round(day/90*100)} percent of challenge elapsed`}><strong>{day}</strong><span>/ 90</span></div></section>
    <div className="progress-track"><span style={{width:`${day/90*100}%`}}/></div>
    {existing ? <>
      <section className="card success-card"><CheckCircle2/><div><h2>{existing.status === 'recovery' ? 'Recovery complete' : 'Session complete'}</h2><p>{Math.max(1,Math.round(existing.durationSeconds/60))} minutes · {existing.sets.filter(s=>s.completed).length} sets logged</p></div></section>
      {personalRecords.length>0&&<section className="card pr-card"><Trophy/><div><strong>{personalRecords.length} personal {personalRecords.length===1?'best':'bests'}</strong><p>{[...new Set(personalRecords)].join(' · ')}</p></div></section>}
      {day<90?<section className="card tomorrow-card"><div><div className="eyebrow">Tomorrow · Day {day+1}</div><h2>{templateById[nextPlan.templateId].title}</h2><p>{templateById[nextPlan.templateId].focus}</p></div><span className={`kind ${nextPlan.kind}`}>{nextPlan.kind}</span></section>:<section className="card completion-card"><div className="eyebrow">Your continuation</div><h2>Keep the ten-minute anchor.</h2><p>Take one easy day, then repeat Phase 4’s weekly rhythm for four weeks. Keep the same progression rule: two clean top-of-range exposures before increasing difficulty. Export your 90-day backup from Settings before restarting.</p></section>}
    </> : <>
      <section className="workout-summary card"><div className="summary-top"><span className={`kind ${template.kind}`}>{template.kind}</span><span><Clock3/> {template.id==='minimum'?'≈5':'8–12'} min</span></div><div className="exercise-preview-list">{prescriptions.map(({item,exercise,prescription},index)=><div className="preview-row" key={item.exerciseId}><span className="number">0{index+1}</span><div><strong>{exercise.name}</strong><small>{item.sets} × {prescription.repMin ? `${prescription.repMin}${prescription.repMax!==prescription.repMin?`–${prescription.repMax}`:''} reps` : `${prescription.seconds} sec`} · {prescription.tempo}</small><small className="adaptive-preview">{prescription.weight ? `${prescription.weight} lb · `:''}{prescription.variation}</small></div></div>)}</div><div className="meta-row"><span><Dumbbell/> {template.equipment.join(' · ')}</span><span><Gauge/> {phase.effort}</span></div></section>
      {template.kind==='strength'&&reentryNote(data,day) && <div className="notice"><strong>Welcome back.</strong> {reentryNote(data,day)}</div>}
      {data.sessions.length>0&&<section className="card why-card"><div className="eyebrow">Why today looks like this</div>{prescriptions.slice(0,2).map(({exercise,prescription})=><p key={exercise.id}><strong>{exercise.name}:</strong> {prescription.explanation}</p>)}</section>}
      <button className="button primary start-button" onClick={()=>setOpen(true)}>{daysUntilStart?'Preview readiness':'Check readiness'} <ArrowRight/></button>
    </>}
    <section className="quiet-stats"><div><strong>{rate}%</strong><span>consistency</span></div><div><strong>{data.sessions.length}</strong><span>days practiced</span></div><div><strong>{recentPractice}/{recentWindow}</strong><span>recent days</span></div></section>
    {open && <div className="modal-backdrop" role="presentation"><section className="sheet" role="dialog" aria-modal="true" aria-labelledby="readiness-title"><button className="icon-button close" onClick={()=>setOpen(false)} aria-label="Close readiness check"><X/></button><div className="eyebrow">Ten-second check-in</div><h2 id="readiness-title">How are you arriving?</h2>
      <fieldset><legend>Energy</legend><div className="segmented">{(['low','normal','high'] as const).map(v=><button type="button" className={readiness.energy===v?'selected':''} onClick={()=>setReadiness({...readiness,energy:v})} key={v}>{v}</button>)}</div></fieldset>
      <fieldset><legend>Soreness</legend><div className="segmented">{(['none','mild','significant'] as const).map(v=><button type="button" className={readiness.soreness===v?'selected':''} onClick={()=>setReadiness({...readiness,soreness:v})} key={v}>{v}</button>)}</div></fieldset>
      <fieldset><legend>Pain beyond normal muscle effort?</legend><div className="segmented two">{(['none','present'] as const).map(v=><button type="button" className={readiness.pain===v?'selected':''} onClick={()=>setReadiness({...readiness,pain:v})} key={v}>{v}</button>)}</div></fieldset>
      <fieldset><legend>Time available</legend><div className="segmented two">{([5,10] as const).map(v=><button type="button" className={readiness.minutes===v?'selected':''} onClick={()=>setReadiness({...readiness,minutes:v})} key={v}>{v} minutes</button>)}</div></fieldset>
      <label>Heaviest dumbbell available today<select value={readiness.availableWeight ?? ''} onChange={(e)=>setReadiness({...readiness,availableWeight:e.target.value ? Number(e.target.value):null})}><option value="">No dumbbell / not sure</option>{data.profile.dumbbells.map(w=><option key={w} value={w}>{w} lb</option>)}</select></label>
      <div className={`readiness-result ${recommendation.mode}`}><strong>{recommendation.title}</strong><p>{recommendation.explanation}</p><small>{targetRirForDay(day,recommendation.mode)}</small></div>
      <button className="button primary wide" onClick={start}>{recommendation.mode==='stop'?'View safety guidance':daysUntilStart?'Start Day 1 early':`Start ${recommendation.title}`}</button></section></div>}
  </div>
}
