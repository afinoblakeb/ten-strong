import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronRight, CircleAlert, Minus, Pause, Play, Plus, SkipForward, TimerReset } from 'lucide-react'
import { useAppState } from '../AppState'
import { exerciseById } from '../data/exercises'
import { bodyweightTemplateFor, templateById } from '../data/program'
import { activeSecondsForSet, adaptivePrescription, adjustedSetCount, buildSessionId, previousExerciseLogs, recommendationForDay, sessionStatus, setComparisonKey, targetRirForDay, templateForMode, trainingTemplateForDay } from '../lib/engine'
import { ExerciseVisual } from '../components/ExerciseVisual'
import type { Readiness, Recommendation, SetLog, WorkoutItem } from '../types'
import { formatISODate } from '../lib/date'

interface LocationState { readiness?: Readiness; recommendation?: Recommendation }
interface Draft { logs:SetLog[]; index:number; readiness:Readiness; recommendation:Recommendation; startedAt:number; elapsed:number; finishing:boolean; activeSeconds:number; finisherRemaining:number }
const fallbackReadiness: Readiness = { energy:'normal', soreness:'none', pain:'none', hasDumbbells:true, availableWeight:null, minutes:10 }

function readDraft(key:string): Draft | null {
  try { const parsed=JSON.parse(localStorage.getItem(key)??'null'); return parsed && Array.isArray(parsed.logs) ? { finishing:false,activeSeconds:0,finisherRemaining:0,...parsed,readiness:{hasDumbbells:true,...parsed.readiness} } : null } catch { return null }
}

export function WorkoutPage() {
  const { day:dayParam }=useParams()
  const day=Number(dayParam)||1
  const {data,addSession}=useAppState()
  const navigate=useNavigate()
  const location=useLocation()
  const state=(location.state??{}) as LocationState
  const dumbbellDraftKey=`ten-strong-draft-d${day}-db`
  const bodyweightDraftKey=`ten-strong-draft-d${day}-bw`
  const legacyDraftKey=`ten-strong-draft-d${day}`
  const requestedEquipment=state.readiness?.hasDumbbells
  const savedDraft=useMemo(()=>requestedEquipment===true?readDraft(dumbbellDraftKey):requestedEquipment===false?readDraft(bodyweightDraftKey):readDraft(dumbbellDraftKey)??readDraft(bodyweightDraftKey)??readDraft(legacyDraftKey),[requestedEquipment,dumbbellDraftKey,bodyweightDraftKey,legacyDraftKey])
  const templateDecision=trainingTemplateForDay(data,day)
  const base=templateById[templateDecision.templateId]
  const readiness=state.readiness??savedDraft?.readiness??fallbackReadiness
  const draftKey=readiness.hasDumbbells?dumbbellDraftKey:bodyweightDraftKey
  const recommendation=state.recommendation??savedDraft?.recommendation??recommendationForDay(data,day,readiness,base.kind)
  const modeTemplate=templateForMode(base.id,recommendation.mode)
  const template=useMemo(()=>readiness.hasDumbbells?modeTemplate:bodyweightTemplateFor(modeTemplate),[readiness.hasDumbbells,modeTemplate])
  const queue=useMemo(()=>{
    const primer:WorkoutItem[] = template.kind!=='recovery'&&modeTemplate.id!=='minimum' ? [{exerciseId:'strength-primer',sets:1,seconds:60,tempo:'easy rehearsal',restSeconds:10}] : []
    const assessmentMode=modeTemplate.id===base.id?(base.id==='assessment'?'baseline':base.id==='final-assessment'?'final':undefined):undefined
    const prepared=[...primer,...template.items].map((item)=>({item,count:adjustedSetCount(item,recommendation),prescription:adaptivePrescription(data,item,readiness.availableWeight,assessmentMode,readiness.hasDumbbells)}))
    const rounds=Math.max(0,...prepared.map((entry)=>entry.count))
    return Array.from({length:rounds},(_,round)=>prepared.filter((entry)=>entry.count>round).map((entry)=>({...entry,setNumber:round+1}))).flat()
  },[template,modeTemplate.id,recommendation,data,readiness.availableWeight,readiness.hasDumbbells,base.id])

  const [index,setIndex]=useState(savedDraft?.index??0)
  const [logs,setLogs]=useState<SetLog[]>(savedDraft?.logs??[])
  const [finishing,setFinishing]=useState(savedDraft?.finishing??false)
  const [activeSeconds,setActiveSeconds]=useState(savedDraft?.activeSeconds??0)
  const [elapsed,setElapsed]=useState(savedDraft?.elapsed??0)
  const [running,setRunning]=useState(true)
  const elapsedBase=useRef(savedDraft?.elapsed??0)
  const runBegan=useRef(Date.now())
  const startedAt=useRef(savedDraft?.startedAt??Date.now())
  const [rest,setRest]=useState(0)
  const restDeadline=useRef(0)
  const [workRemaining,setWorkRemaining]=useState(savedDraft?.finishing?savedDraft.finisherRemaining:0)
  const [workRunning,setWorkRunning]=useState(false)
  const [workStarted,setWorkStarted]=useState(false)
  const workDeadline=useRef(0)
  const current=queue[Math.min(index,Math.max(0,queue.length-1))]
  const exercise=current ? exerciseById[current.item.exerciseId] : null
  const targetRir = recommendation.mode==='reduced'||day<=14 ? 3 : 2
  const [reps,setReps]=useState(current?.prescription.repMin ?? 8)
  const [weight,setWeight]=useState(current?.prescription.weight ?? 0)
  const [rir,setRir]=useState(targetRir)
  const [note,setNote]=useState('')
  const [discomfort,setDiscomfort]=useState(false)
  const [formQuality,setFormQuality]=useState<'good'|'degraded'>('good')
  const [mobilityComfort,setMobilityComfort]=useState<'comfortable'|'limited'>('comfortable')
  const [variation,setVariation]=useState(current?.prescription.variation??'')

  useEffect(()=>{
    const timer=window.setInterval(()=>{
      if(running)setElapsed(elapsedBase.current+Math.floor((Date.now()-runBegan.current)/1000))
      if(restDeadline.current)setRest(Math.max(0,Math.ceil((restDeadline.current-Date.now())/1000)))
      if(workDeadline.current){const remaining=Math.max(0,Math.ceil((workDeadline.current-Date.now())/1000));setWorkRemaining(remaining);if(remaining===0){workDeadline.current=0;setWorkRunning(false)}}
    },250)
    return()=>clearInterval(timer)
  },[running])

  useEffect(()=>{
    if(!current||finishing)return
    setReps(current.prescription.repMin??8)
    setWeight(current.prescription.weight??0)
    setRir(targetRir)
    setNote('')
    setDiscomfort(false)
    setFormQuality('good')
    setMobilityComfort('comfortable')
    setVariation(current.prescription.variation)
    setWorkRemaining((current.prescription.seconds??0)*(exerciseById[current.item.exerciseId]?.perSide?2:1))
    setWorkRunning(false)
    setWorkStarted(false)
    workDeadline.current=0
  },[index,current,targetRir,finishing])

  useEffect(()=>{
    if(recommendation.mode==='stop')return
    const draft:Draft={logs,index,readiness,recommendation,startedAt:startedAt.current,elapsed,finishing,activeSeconds,finisherRemaining:finishing?workRemaining:0}
    try { localStorage.setItem(draftKey,JSON.stringify(draft)) } catch { /* in-memory workout still works */ }
  },[logs,index,readiness,recommendation,draftKey,elapsed,finishing,activeSeconds,workRemaining])

  function currentElapsed(){return running?elapsedBase.current+Math.floor((Date.now()-runBegan.current)/1000):elapsedBase.current}

  function toggleElapsed(){
    if(running){const value=elapsedBase.current+Math.floor((Date.now()-runBegan.current)/1000);elapsedBase.current=value;setElapsed(value);setRunning(false);if(workRunning){setWorkRemaining(Math.max(0,Math.ceil((workDeadline.current-Date.now())/1000)));workDeadline.current=0;setWorkRunning(false)}}
    else{runBegan.current=Date.now();setRunning(true)}
  }
  function toggleWorkTimer(){
    if(workRunning){const remaining=Math.max(0,Math.ceil((workDeadline.current-Date.now())/1000));setWorkRemaining(remaining);workDeadline.current=0;setWorkRunning(false)}
    else{setWorkStarted(true);workDeadline.current=Date.now()+workRemaining*1000;setWorkRunning(true)}
  }
  function logCurrent(skipped=false) {
    if(!current)return
    const sideMultiplier=exerciseById[current.item.exerciseId]?.perSide?2:1
    const totalTarget=(current.prescription.seconds??0)*sideMultiplier
    const actualSeconds=current.prescription.seconds ? (workStarted ? Math.floor(Math.max(0,totalTarget-workRemaining)/sideMultiplier) : 0) : undefined
    const log:SetLog={id:`${current.item.exerciseId}-${current.setNumber}-${Date.now()}`,exerciseId:current.item.exerciseId,setNumber:current.setNumber,reps:current.item.repMin?reps:undefined,seconds:actualSeconds,weight:weight||undefined,rir,formQuality,variation,targetReps:current.prescription.repMax,targetSeconds:current.prescription.seconds,tempo:current.prescription.tempo,discomfort,mobilityComfort:template.kind==='recovery'?mobilityComfort:undefined,note,completed:!skipped}
    const next=[...logs,log]
    const estimatedActive=Math.min(totalTarget||Infinity,activeSecondsForSet({completed:!skipped,reps:current.prescription.seconds?undefined:reps,seconds:current.prescription.seconds?actualSeconds:undefined,tempo:current.prescription.tempo,perSide:Boolean(exerciseById[current.item.exerciseId]?.perSide)}))
    const nextActive=Math.min(600,activeSeconds+estimatedActive)
    setLogs(next)
    setActiveSeconds(nextActive)
    if(index<queue.length-1){restDeadline.current=Date.now()+current.item.restSeconds*1000;setRest(current.item.restSeconds);setIndex(index+1)}
    else if(nextActive<600){setWorkRemaining(600-nextActive);setWorkStarted(false);setWorkRunning(false);workDeadline.current=0;setFinishing(true)}
    else finish(next,nextActive)
  }
  function finish(finalLogs=logs,finalActivity=activeSeconds){
    const duration=currentElapsed()
    if(finalActivity<600){setWorkRemaining(600-finalActivity);setWorkStarted(false);setWorkRunning(false);workDeadline.current=0;setFinishing(true);return}
    addSession({id:buildSessionId(day),day,date:formatISODate(new Date()),templateId:template.id,mode:recommendation.mode,status:sessionStatus(finalLogs,recommendation.mode),durationSeconds:Math.max(60,duration),activitySeconds:finalActivity,readiness,recommendationExplanation:recommendation.explanation,sets:finalLogs})
    localStorage.removeItem(dumbbellDraftKey)
    localStorage.removeItem(bodyweightDraftKey)
    localStorage.removeItem(legacyDraftKey)
    navigate('/today',{state:{completed:true}})
  }
  function logSafetyStop(){
    addSession({id:buildSessionId(day),day,date:formatISODate(new Date()),templateId:base.id,mode:'stop',status:'safety',durationSeconds:0,activitySeconds:0,readiness,recommendationExplanation:recommendation.explanation,sets:[],note:'Safety stop logged from readiness check.'})
    localStorage.removeItem(dumbbellDraftKey);localStorage.removeItem(bodyweightDraftKey);localStorage.removeItem(legacyDraftKey)
    navigate('/today',{state:{completed:true}})
  }

  if(recommendation.mode==='stop') return <div className="workout-page stop-screen"><CircleAlert/><div className="eyebrow">Safety comes first</div><h1>Stop and check the symptom.</h1><p>{recommendation.explanation}</p><div className="safety-box"><strong>Seek urgent medical help</strong><p>for chest pain or pressure, fainting, sudden neurological symptoms, severe or unusual shortness of breath, or loss of coordination. Persistent or worsening joint pain should be assessed by a qualified healthcare professional.</p></div><button className="button primary" onClick={logSafetyStop}>Log safety stop for today</button><button className="button ghost" onClick={()=>navigate('/today')}>Go back — I selected this by mistake</button></div>
  if(finishing){const remaining=Math.max(0,workRemaining);const practiced=600-remaining;const finishExercise=exerciseById['ten-minute-finish'];return <div className="workout-page"><header className="workout-header"><button className="icon-button" aria-label="Exit workout; progress is saved" onClick={()=>navigate('/today')}><ArrowLeft/></button><div><span>Day {day} · Complete the daily practice</span><strong>{Math.floor(practiced/60)}:{String(practiced%60).padStart(2,'0')} active</strong></div><button className="icon-button" aria-label={running?'Pause elapsed timer':'Resume elapsed timer'} onClick={toggleElapsed}>{running?<Pause/>:<Play/>}</button></header><div className="workout-progress"><span style={{width:`${Math.min(100,practiced/6)}%`}}/></div><main className="active-set finish-practice"><div className="eyebrow">Primary work complete</div><h1>Keep moving for {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</h1><ExerciseVisual exercise={finishExercise}/><div className="target"><span>Active mobility remaining</span><strong>{remaining}</strong><small>seconds · easy continuous movement</small>{remaining>0&&<button className={`timer-button ${workRunning?'running':''}`} onClick={toggleWorkTimer}>{workRunning?<><Pause/> Pause mobility</>:workStarted?<><Play/> Resume mobility</>:<><Play/> Start mobility</>}</button>}</div><section className="prescription-card"><strong>Ten active minutes means ten active minutes.</strong><p>Use easy marching, wall reaches, comfortable hip hinges, or relaxed supported squats. Reading and logging time do not reduce this movement block.</p><small>Keep the range comfortable and your breathing steady.</small></section><section className="cue-card"><strong>Easy mobility</strong><ul>{finishExercise.cues.map((cue)=><li key={cue}>{cue}</li>)}</ul><p className="warning">{finishExercise.warning}</p></section><button className="button ghost wide" onClick={()=>navigate('/today')}>Stop and exit without completion</button></main><footer className="workout-actions single"><button className="button primary" disabled={remaining>0} onClick={()=>finish(logs,600)}><Check/> {remaining>0?`${remaining}s active movement remaining`:'Complete today’s 10 minutes'}</button></footer></div>}
  if(!current||!exercise)return null
  const variations=[exercise.regression,exercise.standard,exercise.progression,exercise.noEquipment].filter((value,pos,array)=>array.indexOf(value)===pos)
  const timed=current.prescription.seconds!==undefined
  const usesLoad=exercise.equipment.some((equipment)=>/dumbbell|backpack|bottle/.test(equipment))||weight>0
  const liveTimedActive=timed&&workStarted?Math.max(0,(current.prescription.seconds??0)*(exercise.perSide?2:1)-workRemaining):0
  const displayedActive=Math.min(600,activeSeconds+liveTimedActive)
  const currentComparisonKey=setComparisonKey({exerciseId:exercise.id,weight:weight||undefined,variation,tempo:current.prescription.tempo,reps:timed?undefined:reps,seconds:timed?current.prescription.seconds:undefined})
  const previous=template.kind==='recovery'?[]:previousExerciseLogs(data,exercise.id).filter((set)=>set.completed&&setComparisonKey(set)===currentComparisonKey)
  const priorBest=previous.length?Math.max(...previous.map((set)=>set.reps??set.seconds??0)):null
  return <div className="workout-page"><header className="workout-header"><button className="icon-button" aria-label="Exit workout; progress is saved" onClick={()=>navigate('/today')}><ArrowLeft/></button><div><span>Day {day} · {readiness.hasDumbbells?recommendation.title:'Bodyweight travel session'}</span><strong>{Math.floor(displayedActive/60)}:{String(displayedActive%60).padStart(2,'0')} active</strong></div><button className="icon-button" aria-label={running?'Pause elapsed timer':'Resume elapsed timer'} onClick={toggleElapsed}>{running?<Pause/>:<Play/>}</button></header>
    <div className="workout-progress"><span style={{width:`${(index+1)/queue.length*100}%`}}/></div>
    <main className="active-set"><div className="set-meta"><span>{index+1} of {queue.length}</span><span>Round {current.setNumber} of {current.count}</span></div><h1>{exercise.name}</h1><ExerciseVisual exercise={exercise}/><div className="target"><span>Target</span><strong>{timed ? workRemaining : `${current.prescription.repMin}${current.prescription.repMax!==current.prescription.repMin?`–${current.prescription.repMax}`:''}`}</strong><small>{timed?`total seconds${exercise.perSide?` · ${current.prescription.seconds} per side`:''}`:`reps${exercise.perSide?' per side':''}`} · {current.prescription.tempo} tempo</small>{exercise.perSide&&<small className="side-note">{timed&&workStarted&&workRemaining<=(current.prescription.seconds??0)?'Switch sides now. ':'Complete both sides; '}Log the weaker side.</small>}{timed&&<button className={`timer-button ${workRunning?'running':''}`} onClick={toggleWorkTimer}>{workRunning?<><Pause/> Pause timer</>:workStarted&&workRemaining>0?<><Play/> Resume timer</>:workRemaining===0?<><TimerReset/> Reset complete</>:<><Play/> Start timer</>}</button>}</div>
      {rest>0&&<div className="rest-banner" role="status"><span>Transition / rest</span><strong>{rest}s</strong><button onClick={()=>{restDeadline.current=0;setRest(0)}}>Skip rest</button></div>}
      {activeSeconds>=600&&index<queue.length-1&&<section className="time-cap" role="status"><strong>Ten active minutes reached.</strong><p>Finish the current set if it feels good, or end here. No remaining work needs to be made up.</p><button className="button secondary" onClick={()=>finish(logs,activeSeconds)}>Finish here</button></section>}
      <section className="prescription-card"><strong>Today’s adjustment</strong><p>{!readiness.hasDumbbells?'No dumbbells today, so this movement comes from your separate bodyweight queue. ':''}{current.prescription.explanation}</p><small>{targetRirForDay(day,recommendation.mode)}</small>{priorBest!==null&&<div className="previous-performance">Previous best: <b>{priorBest} {previous[0]?.reps!==undefined?'reps':'seconds'}</b>{previous[0]?.weight?` at ${previous[0].weight} lb`:''} · {previous[0]?.rir} RIR</div>}</section>
      <section className="cue-card"><strong>Move well</strong>{current.item.note&&<p className="item-note">{current.item.note}</p>}<ul>{exercise.cues.slice(0,3).map(cue=><li key={cue}>{cue}</li>)}</ul><details><summary>Common mistakes & stop conditions</summary><p><b>Avoid:</b> {exercise.mistakes.join(' · ')}</p><p className="warning">{exercise.warning}</p></details></section>
      {(!timed||usesLoad)&&<section className="log-card">{!timed&&<div className="log-field"><label>Reps completed{exercise.perSide&&<small> weaker side</small>}</label><div className="stepper"><button aria-label="Decrease repetitions" onClick={()=>setReps(Math.max(0,reps-1))}><Minus/></button><strong>{reps}</strong><button aria-label="Increase repetitions" onClick={()=>setReps(reps+1)}><Plus/></button></div></div>}{usesLoad&&<div className="log-field"><label>Weight <small>lb</small></label><input type="number" min="0" step="0.5" value={weight||''} placeholder="0" onChange={(e)=>setWeight(Number(e.target.value))}/></div>}</section>}
      {template.kind==='recovery'&&<fieldset className="mobility-comfort"><legend>How does today’s comfortable range feel?</legend><div className="segmented two"><button type="button" className={mobilityComfort==='comfortable'?'selected':''} onClick={()=>setMobilityComfort('comfortable')}>Comfortable</button><button type="button" className={mobilityComfort==='limited'?'selected':''} onClick={()=>setMobilityComfort('limited')}>Limited today</button></div></fieldset>}<label className="check discomfort"><input type="checkbox" checked={discomfort} onChange={(e)=>setDiscomfort(e.target.checked)}/><span>I felt discomfort beyond normal muscular effort</span></label>{discomfort&&<div className="warning discomfort-action" role="alert"><strong>Stop this movement.</strong> Do not push through it. Log the set, then use a symptom-free substitute or end the session.</div>}{template.kind!=='recovery'&&<details className="advanced-log"><summary>Adjust effort, form, version, or note</summary><section className="modify-card"><label>Version used<select value={variation} onChange={(event)=>setVariation(event.target.value)}>{variations.map(value=><option key={value}>{value}</option>)}</select></label></section><fieldset className="rir"><legend>{timed?'Effort left with good form':'Reps left with good form'}</legend><div className="segmented five">{[0,1,2,3,4].map(v=><button type="button" key={v} className={rir===v?'selected':''} onClick={()=>setRir(v)}>{v===4?'4+':v}</button>)}</div><small>{rir===0?'At limit':rir===1?'Very hard':rir<=3?'Productive effort':'Easy / plenty left'}</small></fieldset><fieldset className="form-quality"><legend>How was the movement?</legend><div className="segmented two"><button type="button" className={formQuality==='good'?'selected':''} onClick={()=>setFormQuality('good')}>Clean form</button><button type="button" className={formQuality==='degraded'?'selected':''} onClick={()=>setFormQuality('degraded')}>Form faded</button></div></fieldset><label className="note-label">Optional note<input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Setup, form, or adjustment"/></label></details>}
    </main><footer className="workout-actions"><button className="button ghost" onClick={()=>logCurrent(true)}><SkipForward/> Skip</button>{timed&&!workStarted?<button className="button primary" onClick={toggleWorkTimer}><Play/> Start timer</button>:<button className="button primary" onClick={()=>logCurrent(false)}><Check/> {index===queue.length-1?'Finish':'Complete set'} <ChevronRight/></button>}</footer>
  </div>
}
