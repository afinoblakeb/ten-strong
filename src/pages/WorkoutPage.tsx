import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronRight, CircleAlert, Minus, Pause, Play, Plus, RotateCcw, SkipForward } from 'lucide-react'
import { useAppState } from '../AppState'
import { exerciseById } from '../data/exercises'
import { bodyweightTemplateFor, templateById } from '../data/program'
import { activeSecondsForSet, adaptivePrescription, adjustedSetCount, buildSessionId, previousExerciseLogs, recommendationForDay, sessionStatus, setComparisonKey, targetRirForDay, templateForMode, trainingTemplateForDay } from '../lib/engine'
import { fireCue, unlockAudio, type CueKind } from '../lib/cues'
import { MovementGuide } from '../components/MovementGuide'
import type { Readiness, Recommendation, SetLog, WorkoutItem } from '../types'
import { formatISODate } from '../lib/date'

interface LocationState { readiness?: Readiness; recommendation?: Recommendation }
interface Draft { logs:SetLog[]; index:number; readiness:Readiness; recommendation:Recommendation; startedAt:number; elapsed:number; finishing:boolean; activeSeconds:number; finisherRemaining:number; signature?:string; updatedAt?:number }
interface UndoSnapshot { logId:string; index:number; activeSeconds:number; reps:number; weight:number; rir:number; note:string; discomfort:boolean; formQuality:'good'|'degraded'; mobilityComfort:'comfortable'|'limited'; variation:string; workRemaining:number; workStarted:boolean }
const fallbackReadiness: Readiness = { energy:'normal', soreness:'none', pain:'none', hasDumbbells:true, availableWeight:null, minutes:10 }
const finisherMoves=['Easy marching in place','Slow wall reaches overhead','Comfortable hip hinges','Relaxed supported squats','Gentle side-to-side weight shifts']

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
  const savedDraft=useMemo(()=>{
    if(requestedEquipment===true)return readDraft(dumbbellDraftKey)
    if(requestedEquipment===false)return readDraft(bodyweightDraftKey)
    const dumbbell=readDraft(dumbbellDraftKey), bodyweight=readDraft(bodyweightDraftKey)
    if(dumbbell&&bodyweight)return (bodyweight.updatedAt??bodyweight.startedAt??0)>(dumbbell.updatedAt??dumbbell.startedAt??0)?bodyweight:dumbbell // resume the most recently touched session, never dumbbell-first
    return dumbbell??bodyweight??readDraft(legacyDraftKey)
  },[requestedEquipment,dumbbellDraftKey,bodyweightDraftKey,legacyDraftKey])
  const templateDecision=trainingTemplateForDay(data,day)
  const base=templateById[templateDecision.templateId]
  const readiness=state.readiness??savedDraft?.readiness??fallbackReadiness
  const draftKey=readiness.hasDumbbells?dumbbellDraftKey:bodyweightDraftKey
  // P1 fix: the fallback recommendation is memoized so entering /workout/:day without router state
  // no longer rebuilds the queue (and clobbers every input) on each render.
  const recommendation=useMemo(()=>state.recommendation??savedDraft?.recommendation??recommendationForDay(data,day,readiness,base.kind),[state.recommendation,savedDraft,data,day,readiness,base.kind])
  const modeTemplate=templateForMode(base.id,recommendation.mode,day)
  const template=useMemo(()=>readiness.hasDumbbells?modeTemplate:bodyweightTemplateFor(modeTemplate),[readiness.hasDumbbells,modeTemplate])
  const queue=useMemo(()=>{
    const primer:WorkoutItem[] = template.kind!=='recovery'&&modeTemplate.id!=='minimum' ? [{exerciseId:'strength-primer',sets:1,seconds:60,tempo:'easy rehearsal',restSeconds:10}] : []
    const assessmentMode=modeTemplate.id===base.id?(base.id==='assessment'?'baseline':base.id==='final-assessment'?'final':undefined):undefined
    const prepared=[...primer,...template.items].map((item)=>({item,count:adjustedSetCount(item,recommendation),prescription:adaptivePrescription(data,item,readiness.availableWeight,assessmentMode,readiness.hasDumbbells,day)}))
    const rounds=Math.max(0,...prepared.map((entry)=>entry.count))
    return Array.from({length:rounds},(_,round)=>prepared.filter((entry)=>entry.count>round).map((entry)=>({...entry,setNumber:round+1}))).flat()
  },[template,modeTemplate.id,recommendation,data,readiness.availableWeight,readiness.hasDumbbells,base.id,day])
  const queueSignature=`${template.id}|${recommendation.mode}|${queue.length}`
  // P1 fix: a draft written against a different queue (readiness re-answered mid-day) is reconciled
  // by matching its logs to the new queue instead of replaying a stale index — no "5 of 4" meta,
  // no duplicate sets, no lost work.
  const draft=useMemo(()=>{
    if(!savedDraft)return null
    if(savedDraft.finishing||savedDraft.signature===queueSignature)return {...savedDraft,index:Math.min(savedDraft.index,Math.max(0,queue.length-1))}
    const logged=new Set(savedDraft.logs.map((log)=>`${log.exerciseId}#${log.setNumber}`))
    const nextIndex=queue.findIndex((entry)=>!logged.has(`${entry.item.exerciseId}#${entry.setNumber}`))
    if(nextIndex===-1)return {...savedDraft,index:Math.max(0,queue.length-1),finishing:true,finisherRemaining:Math.max(0,600-savedDraft.activeSeconds)}
    return {...savedDraft,index:nextIndex}
  },[savedDraft,queueSignature,queue])

  const [index,setIndex]=useState(draft?.index??0)
  const [logs,setLogs]=useState<SetLog[]>(draft?.logs??[])
  const [finishing,setFinishing]=useState(draft?.finishing??false)
  const [activeSeconds,setActiveSeconds]=useState(draft?.activeSeconds??0)
  const [elapsed,setElapsed]=useState(draft?.elapsed??0)
  const [running,setRunning]=useState(true)
  const elapsedBase=useRef(draft?.elapsed??0)
  const runBegan=useRef(Date.now())
  const startedAt=useRef(draft?.startedAt??Date.now()) // pins the session's day + date at workout start (midnight-safe)
  const [rest,setRest]=useState(0)
  const restDeadline=useRef(0)
  const restPausedRemaining=useRef(0)
  const restCreditDuration=useRef(0) // D4: prescribed rest after a COMPLETED set is creditable active transition time
  const restWaitedBase=useRef(0)
  const restRunStart=useRef(0)
  const restTenAnnounced=useRef(false)
  const [workRemaining,setWorkRemaining]=useState(draft?.finishing?draft.finisherRemaining:0)
  const [workRunning,setWorkRunning]=useState(false)
  const [workStarted,setWorkStarted]=useState(false)
  const workDeadline=useRef(0)
  const workAutoPaused=useRef(false) // header pause stopped a running hold — resume must restart it
  const halfwayFired=useRef(false)
  const finisherAutoStarted=useRef(false)
  const skipReset=useRef(false)
  const undoRef=useRef<UndoSnapshot|null>(null)
  const [announcement,setAnnouncement]=useState('')
  const [flashing,setFlashing]=useState(false)
  const flashTimer=useRef(0)
  const [prNote,setPrNote]=useState<string|null>(null)
  const soundOn=data.profile.soundCues
  const current=queue[Math.min(index,Math.max(0,queue.length-1))]
  const displayIndex=Math.min(index,Math.max(0,queue.length-1))
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
  const timed=current?.prescription.seconds!==undefined
  const usesLoad=Boolean(exercise?.equipment.some((equipment)=>/dumbbell|backpack|bottle/.test(equipment)))
  const seenBefore=Boolean(exercise&&(data.sessions.some((session)=>session.sets.some((set)=>set.exerciseId===exercise.id))||logs.some((log)=>log.exerciseId===exercise.id)))
  const currentComparisonKey=exercise?setComparisonKey({exerciseId:exercise.id,weight:weight||undefined,variation,tempo:current?.prescription.tempo,reps:timed?undefined:reps,seconds:timed?current?.prescription.seconds:undefined}):''
  const previous=!exercise||template.kind==='recovery'?[]:previousExerciseLogs(data,exercise.id).filter((set)=>set.completed&&setComparisonKey(set)===currentComparisonKey)
  const priorBest=previous.length?Math.max(...previous.map((set)=>set.reps??set.seconds??0)):null
  const undoAvailable=undoRef.current!==null&&logs.at(-1)?.id===undoRef.current.logId

  function pulse(){setFlashing(true);window.clearTimeout(flashTimer.current);flashTimer.current=window.setTimeout(()=>setFlashing(false),750)}
  function cue(kind:CueKind,message:string){fireCue(kind,soundOn);pulse();setAnnouncement(message)}
  function collectRestCredit(){
    if(!restCreditDuration.current)return 0
    const run=restRunStart.current?(Date.now()-restRunStart.current)/1000:0
    const credit=Math.max(0,Math.min(restCreditDuration.current,Math.round(restWaitedBase.current+run)))
    restCreditDuration.current=0;restWaitedBase.current=0;restRunStart.current=0
    return credit
  }

  useEffect(()=>{ // iOS requires a user gesture before WebAudio may play — unlock on the first tap
    const unlock=()=>unlockAudio()
    window.addEventListener('pointerdown',unlock,{once:true})
    return()=>window.removeEventListener('pointerdown',unlock)
  },[])

  useEffect(()=>{
    const perSideSeconds=current?.prescription.seconds!==undefined&&exerciseById[current.item.exerciseId]?.perSide?current.prescription.seconds:0
    const timer=window.setInterval(()=>{
      if(running)setElapsed(elapsedBase.current+Math.floor((Date.now()-runBegan.current)/1000))
      if(restDeadline.current){
        const remaining=Math.max(0,Math.ceil((restDeadline.current-Date.now())/1000))
        setRest(remaining)
        if(remaining>0&&remaining<=10&&!restTenAnnounced.current){restTenAnnounced.current=true;setAnnouncement('10 seconds of rest left')}
        if(remaining===0){restDeadline.current=0;const credit=collectRestCredit();if(credit)setActiveSeconds((value)=>Math.min(600,value+credit));cue('rest-end','Rest over — next set')}
      }
      if(workDeadline.current){
        const remaining=Math.max(0,Math.ceil((workDeadline.current-Date.now())/1000))
        setWorkRemaining(remaining)
        if(!finishing&&perSideSeconds&&remaining>0&&remaining<=perSideSeconds&&!halfwayFired.current){halfwayFired.current=true;cue('switch-sides','Switch sides now')}
        if(remaining===0){workDeadline.current=0;setWorkRunning(false);cue(finishing?'finisher-done':'hold-end',finishing?'Ten active minutes complete':'Hold complete — log it')}
      }
    },250)
    return()=>clearInterval(timer)
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- cue is re-created per render; its inputs (soundOn) are already deps
  },[running,finishing,current,soundOn])

  // P1 fix: keyed on stable identity (index + exerciseId + setNumber), never the queue-entry object.
  const currentKey=current?`${current.item.exerciseId}#${current.setNumber}`:'none'
  useEffect(()=>{
    if(!current||finishing)return
    if(skipReset.current){skipReset.current=false;return}
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
    workAutoPaused.current=false
    halfwayFired.current=false
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed on currentKey by design: the queue-entry OBJECT identity must never retrigger this reset (P1 input-clobber fix)
  },[index,currentKey,targetRir,finishing])

  // D13/finisher reframe: the wind-down countdown starts itself — no dead screen, no extra tap.
  useEffect(()=>{
    if(!finishing){finisherAutoStarted.current=false;return}
    if(finisherAutoStarted.current)return
    finisherAutoStarted.current=true
    if(workRemaining>0&&!workRunning){workDeadline.current=Date.now()+workRemaining*1000;setWorkStarted(true);setWorkRunning(true)}
  },[finishing,workRemaining,workRunning])

  useEffect(()=>{
    if(recommendation.mode==='stop')return
    const draftPayload:Draft={logs,index,readiness,recommendation,startedAt:startedAt.current,elapsed,finishing,activeSeconds,finisherRemaining:finishing?workRemaining:0,signature:queueSignature,updatedAt:Date.now()}
    try { localStorage.setItem(draftKey,JSON.stringify(draftPayload)) } catch { /* in-memory workout still works */ }
  },[logs,index,readiness,recommendation,draftKey,elapsed,finishing,activeSeconds,workRemaining,queueSignature])

  function currentElapsed(){return running?elapsedBase.current+Math.floor((Date.now()-runBegan.current)/1000):elapsedBase.current}

  function toggleElapsed(){
    if(running){
      const value=elapsedBase.current+Math.floor((Date.now()-runBegan.current)/1000);elapsedBase.current=value;setElapsed(value);setRunning(false)
      if(workRunning){setWorkRemaining(Math.max(0,Math.ceil((workDeadline.current-Date.now())/1000)));workDeadline.current=0;setWorkRunning(false);workAutoPaused.current=true}
      if(restDeadline.current){restPausedRemaining.current=Math.max(0,restDeadline.current-Date.now());if(restRunStart.current){restWaitedBase.current+=(Date.now()-restRunStart.current)/1000;restRunStart.current=0}restDeadline.current=0}
    } else {
      runBegan.current=Date.now();setRunning(true)
      if(workAutoPaused.current){workAutoPaused.current=false;if(workRemaining>0){workDeadline.current=Date.now()+workRemaining*1000;setWorkRunning(true)}}
      if(restPausedRemaining.current>0){restDeadline.current=Date.now()+restPausedRemaining.current;restPausedRemaining.current=0;if(restCreditDuration.current)restRunStart.current=Date.now()}
    }
  }
  function toggleWorkTimer(){
    if(workRunning){const remaining=Math.max(0,Math.ceil((workDeadline.current-Date.now())/1000));setWorkRemaining(remaining);workDeadline.current=0;setWorkRunning(false);workAutoPaused.current=false}
    else if(workRemaining>0){setWorkStarted(true);workDeadline.current=Date.now()+workRemaining*1000;setWorkRunning(true)}
  }
  function skipRest(){
    restDeadline.current=0;restPausedRemaining.current=0;setRest(0)
    const credit=collectRestCredit()
    if(credit)setActiveSeconds((value)=>Math.min(600,value+credit))
  }
  function logCurrent(skipped=false) {
    if(!current)return
    const sideMultiplier=exerciseById[current.item.exerciseId]?.perSide?2:1
    const totalTarget=(current.prescription.seconds??0)*sideMultiplier
    const actualSeconds=current.prescription.seconds ? (workStarted ? Math.floor(Math.max(0,totalTarget-workRemaining)/sideMultiplier) : 0) : undefined
    // D1: targetReps records the FLOOR the user was asked for; targetRepMax the top of the range.
    const log:SetLog={id:`${current.item.exerciseId}-${current.setNumber}-${Date.now()}`,exerciseId:current.item.exerciseId,setNumber:current.setNumber,reps:current.item.repMin?reps:undefined,seconds:actualSeconds,weight:usesLoad&&weight?weight:undefined,rir,formQuality,variation,targetReps:current.prescription.repMin,targetRepMax:current.prescription.repMax,targetSeconds:current.prescription.seconds,tempo:current.prescription.tempo,discomfort,mobilityComfort:template.kind==='recovery'?mobilityComfort:undefined,note,completed:!skipped}
    const next=[...logs,log]
    // D4 honest crediting: a skipped/aborted running hold keeps its actually-elapsed seconds.
    const holdElapsed=current.prescription.seconds&&workStarted?Math.max(0,totalTarget-workRemaining):0
    const estimatedActive=skipped?holdElapsed:Math.min(totalTarget||Infinity,activeSecondsForSet({completed:true,reps:current.prescription.seconds?undefined:reps,seconds:current.prescription.seconds?actualSeconds:undefined,tempo:current.prescription.tempo,perSide:Boolean(exerciseById[current.item.exerciseId]?.perSide)}))
    const restCredit=collectRestCredit() // rest still counting from the previous set
    restDeadline.current=0;restPausedRemaining.current=0
    const baseActive=Math.min(600,activeSeconds+restCredit)
    const nextActive=Math.min(600,baseActive+estimatedActive)
    let nextPr:string|null=null
    if(!skipped&&template.kind!=='recovery'&&priorBest!==null){const value=timed?(actualSeconds??0):reps;if(value>priorBest)nextPr=`New best: ${value} ${timed?'seconds':'reps'}`}
    setPrNote(nextPr)
    undoRef.current={logId:log.id,index,activeSeconds:baseActive,reps,weight,rir,note,discomfort,formQuality,mobilityComfort,variation,workRemaining,workStarted}
    setLogs(next)
    setActiveSeconds(nextActive)
    if(index<queue.length-1){
      // D4: only a COMPLETED set's prescribed rest counts as active transition time.
      restCreditDuration.current=skipped?0:current.item.restSeconds
      restWaitedBase.current=0
      restRunStart.current=skipped?0:Date.now()
      restTenAnnounced.current=false
      restDeadline.current=Date.now()+current.item.restSeconds*1000
      setRest(current.item.restSeconds)
      setAnnouncement(`Rest started, ${current.item.restSeconds} seconds`)
      setIndex(index+1)
    }
    else if(nextActive<600){setWorkRemaining(600-nextActive);setWorkStarted(false);setWorkRunning(false);workDeadline.current=0;setFinishing(true)}
    else finish(next,nextActive)
  }
  function undoLast(){
    const snapshot=undoRef.current
    if(!snapshot||logs.at(-1)?.id!==snapshot.logId)return
    skipReset.current=true
    restDeadline.current=0;restPausedRemaining.current=0;restCreditDuration.current=0;restWaitedBase.current=0;restRunStart.current=0
    setRest(0)
    setLogs(logs.slice(0,-1))
    setIndex(snapshot.index)
    setActiveSeconds(snapshot.activeSeconds)
    setFinishing(false)
    setReps(snapshot.reps);setWeight(snapshot.weight);setRir(snapshot.rir);setNote(snapshot.note);setDiscomfort(snapshot.discomfort);setFormQuality(snapshot.formQuality);setMobilityComfort(snapshot.mobilityComfort);setVariation(snapshot.variation)
    setWorkRemaining(snapshot.workRemaining);setWorkStarted(snapshot.workStarted);setWorkRunning(false);workDeadline.current=0;workAutoPaused.current=false
    undoRef.current=null
    setPrNote(null)
    setAnnouncement('Last set undone')
  }
  function finish(finalLogs=logs,finalActivity=activeSeconds){
    const duration=currentElapsed()
    if(finalActivity<600){setWorkRemaining(600-finalActivity);setWorkStarted(false);setWorkRunning(false);workDeadline.current=0;setFinishing(true);return}
    // Midnight-safe: the session is dated from when it STARTED, so day and date always agree.
    addSession({id:buildSessionId(day),day,date:formatISODate(new Date(startedAt.current)),templateId:template.id,mode:recommendation.mode,status:sessionStatus(finalLogs,recommendation.mode),durationSeconds:Math.max(60,duration),activitySeconds:finalActivity,readiness,recommendationExplanation:recommendation.explanation,sets:finalLogs})
    localStorage.removeItem(dumbbellDraftKey)
    localStorage.removeItem(bodyweightDraftKey)
    localStorage.removeItem(legacyDraftKey)
    navigate('/today',{state:{completed:true}})
  }
  function logSafetyStop(){
    addSession({id:buildSessionId(day),day,date:formatISODate(new Date(startedAt.current)),templateId:base.id,mode:'stop',status:'safety',durationSeconds:0,activitySeconds:0,readiness,recommendationExplanation:recommendation.explanation,sets:[],note:'Safety stop logged from readiness check.'})
    localStorage.removeItem(dumbbellDraftKey);localStorage.removeItem(bodyweightDraftKey);localStorage.removeItem(legacyDraftKey)
    navigate('/today',{state:{completed:true}})
  }

  if(recommendation.mode==='stop') return <div className="workout-page stop-screen"><CircleAlert/><div className="eyebrow">Safety comes first</div><h1>Stop and check the symptom.</h1><p>{recommendation.explanation}</p><div className="safety-box"><strong>Seek urgent medical help</strong><p>for chest pain or pressure, fainting, sudden neurological symptoms, severe or unusual shortness of breath, or loss of coordination. Persistent or worsening joint pain should be assessed by a qualified healthcare professional.</p></div><button className="button primary" onClick={logSafetyStop}>Log safety stop for today</button><button className="button ghost" onClick={()=>navigate('/today')}>Go back — I selected this by mistake</button></div>
  if(finishing){
    const remaining=Math.max(0,workRemaining)
    const practiced=600-remaining
    const clock=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`
    const finishExercise=exerciseById['ten-minute-finish']
    const suggestion=finisherMoves[Math.floor(practiced/45)%finisherMoves.length]
    return <div className={`workout-page${flashing?' cue-pulse':''}`}><span className="sr-status" role="status">{announcement}</span><header className="workout-header"><button className="icon-button" aria-label="Exit workout; progress is saved" onClick={()=>navigate('/today')}><ArrowLeft/></button><div><span>Day {day} · Victory lap</span><strong>{Math.floor(practiced/60)}:{String(practiced%60).padStart(2,'0')} active</strong></div><button className="icon-button" aria-label={running?'Pause elapsed timer':'Resume elapsed timer'} onClick={toggleElapsed}>{running?<Pause/>:<Play/>}</button></header><div className="workout-progress"><span style={{width:`${Math.min(100,practiced/6)}%`}}/></div><main className="active-set finish-practice"><div className="eyebrow">Day {day} · wind-down</div><h1>{template.kind==='recovery'?'Movement done — cruise it home':'Strength work done — cruise it home'}</h1><div className="target"><span>Easy movement left</span><strong>{clock}</strong><small>keep moving gently — a chime marks the end</small>{remaining>0&&<button className={`timer-button ${workRunning?'running':''}`} onClick={toggleWorkTimer}>{workRunning?<><Pause/> Pause</>:<><Play/> Resume</>}</button>}</div>{undoAvailable&&<div className="post-log-row">{prNote&&<span className="pr-tag">{prNote}</span>}<button className="undo-chip" onClick={undoLast}><RotateCcw/> Undo last set</button></div>}<section className="prescription-card"><strong>Right now: {suggestion.toLowerCase()}</strong><p>Rotate through easy marching, reaches, hinges, and relaxed supported squats. Comfortable range, steady breathing.</p></section><MovementGuide exercise={finishExercise} tempo="easy" variation={finishExercise.standard} compact/><button className="button ghost wide" onClick={()=>navigate('/today')}>Save progress and exit</button></main><footer className="workout-actions single"><button className="button primary" disabled={remaining>0} onClick={()=>finish(logs,600)}><Check/> {remaining>0?`${clock} remaining`:'Complete today’s 10 minutes'}</button></footer></div>
  }
  if(!current||!exercise)return null
  const variations=[exercise.regression,exercise.standard,exercise.progression,exercise.noEquipment].filter((value,pos,array)=>array.indexOf(value)===pos)
  const holdDone=timed&&workStarted&&workRemaining===0
  const liveTimedActive=timed&&workStarted?Math.max(0,(current.prescription.seconds??0)*(exercise.perSide?2:1)-workRemaining):0
  const displayedActive=Math.min(600,activeSeconds+liveTimedActive)
  return <div className={`workout-page${flashing?' cue-pulse':''}`}><span className="sr-status" role="status">{announcement}</span><header className="workout-header"><button className="icon-button" aria-label="Exit workout; progress is saved" onClick={()=>navigate('/today')}><ArrowLeft/></button><div><span>Day {day} · {readiness.hasDumbbells?recommendation.title:'Bodyweight travel session'}</span><strong>{Math.floor(displayedActive/60)}:{String(displayedActive%60).padStart(2,'0')} active</strong></div><button className="icon-button" aria-label={running?'Pause elapsed timer':'Resume elapsed timer'} onClick={toggleElapsed}>{running?<Pause/>:<Play/>}</button></header>
    <div className="workout-progress"><span style={{width:`${(displayIndex+1)/queue.length*100}%`}}/></div>
    <main className="active-set"><div className="set-meta"><span>{displayIndex+1} of {queue.length}</span><span>Round {current.setNumber} of {current.count}</span></div><h1>{exercise.name}</h1><div className="target"><span>Target</span><strong>{timed ? workRemaining : `${current.prescription.repMin}${current.prescription.repMax!==current.prescription.repMin?`–${current.prescription.repMax}`:''}`}</strong><small>{timed?`total seconds${exercise.perSide?` · ${current.prescription.seconds} per side`:''}`:`reps${exercise.perSide?' per side':''}`} · {current.prescription.tempo} tempo</small>{exercise.perSide&&<small className="side-note">{holdDone?'Hold complete. ':timed&&workStarted&&workRemaining<=(current.prescription.seconds??0)?'Switch sides now. ':'Complete both sides; '}Log the weaker side.</small>}{timed&&<button className={`timer-button ${workRunning?'running':''}`} disabled={holdDone} onClick={toggleWorkTimer}>{workRunning?<><Pause/> Pause timer</>:holdDone?<><Check/> Hold complete</>:workStarted?<><Play/> Resume timer</>:<><Play/> Start timer</>}</button>}</div>
      {rest>0&&<div className="rest-banner"><span>Transition / rest</span><strong aria-hidden="true">{rest}s</strong><button onClick={skipRest}>Skip rest</button></div>}
      {(undoAvailable||prNote)&&<div className="post-log-row">{prNote&&<span className="pr-tag">{prNote}</span>}{undoAvailable&&<button className="undo-chip" onClick={undoLast}><RotateCcw/> Undo last set</button>}</div>}
      {activeSeconds>=600&&index<queue.length-1&&<section className="time-cap" role="status"><strong>Ten active minutes reached.</strong><p>Finish the current set if it feels good, or end here. No remaining work needs to be made up.</p><button className="button secondary" onClick={()=>finish(logs,activeSeconds)}>Finish here</button></section>}
      {(!timed||usesLoad)&&<section className="log-card">{!timed&&<div className="log-field"><label id="reps-label">Reps completed{exercise.perSide&&<small> weaker side</small>}</label><div className="stepper" role="group" aria-labelledby="reps-label"><button aria-label="Decrease repetitions" onClick={()=>setReps(Math.max(0,reps-1))}><Minus/></button><strong aria-live="polite">{reps}</strong><button aria-label="Increase repetitions" onClick={()=>setReps(reps+1)}><Plus/></button></div></div>}{usesLoad&&<div className="log-field"><label htmlFor="log-weight">Weight <small>lb</small></label><input id="log-weight" type="number" inputMode="decimal" min="0" step="0.5" value={weight||''} placeholder="0" onChange={(e)=>setWeight(Number(e.target.value))}/></div>}</section>}
      <section className="prescription-card"><strong>Today’s adjustment</strong><p>{!readiness.hasDumbbells?'No dumbbells today, so this movement comes from your separate bodyweight queue. ':''}{current.prescription.explanation}</p>{current.item.note&&<p><strong>Today:</strong> {current.item.note}</p>}<small>{targetRirForDay(day,recommendation.mode)}</small>{priorBest!==null&&<div className="previous-performance">Previous best: <b>{priorBest} {previous[0]?.reps!==undefined?'reps':'seconds'}</b>{previous[0]?.weight?` at ${previous[0].weight} lb`:''} · {previous[0]?.rir} reps in reserve</div>}</section>
      <MovementGuide exercise={exercise} tempo={current.prescription.tempo} variation={variation} compact={seenBefore}/>
      {template.kind==='recovery'&&<fieldset className="mobility-comfort"><legend id="comfort-legend">How does today’s comfortable range feel?</legend><div className="segmented two" role="radiogroup" aria-labelledby="comfort-legend"><button type="button" role="radio" aria-checked={mobilityComfort==='comfortable'} className={mobilityComfort==='comfortable'?'selected':''} onClick={()=>setMobilityComfort('comfortable')}>Comfortable</button><button type="button" role="radio" aria-checked={mobilityComfort==='limited'} className={mobilityComfort==='limited'?'selected':''} onClick={()=>setMobilityComfort('limited')}>Limited today</button></div></fieldset>}<label className="check discomfort"><input type="checkbox" checked={discomfort} onChange={(e)=>setDiscomfort(e.target.checked)}/><span>I felt discomfort beyond normal muscular effort</span></label>{discomfort&&<div className="warning discomfort-action" role="alert"><strong>Stop this movement.</strong> Do not push through it. Log the set, then use a symptom-free substitute or end the session.</div>}{template.kind!=='recovery'&&<details className="advanced-log"><summary>Adjust effort, form, version, or note</summary><section className="modify-card"><label>Version used<select value={variation} onChange={(event)=>setVariation(event.target.value)}>{variations.map(value=><option key={value}>{value}</option>)}</select></label></section><fieldset className="rir"><legend id="rir-legend">Reps left in the tank (RIR)</legend><div className="segmented five" role="radiogroup" aria-labelledby="rir-legend">{[0,1,2,3,4].map(v=><button type="button" role="radio" aria-checked={rir===v} key={v} className={rir===v?'selected':''} onClick={()=>setRir(v)}>{v===4?'4+':v}</button>)}</div><small>{rir===0?'At limit':rir===1?'Very hard':rir<=3?'Productive effort':'Easy / plenty left'}</small></fieldset><fieldset className="form-quality"><legend id="form-legend">How was the movement?</legend><div className="segmented two" role="radiogroup" aria-labelledby="form-legend"><button type="button" role="radio" aria-checked={formQuality==='good'} className={formQuality==='good'?'selected':''} onClick={()=>setFormQuality('good')}>Clean form</button><button type="button" role="radio" aria-checked={formQuality==='degraded'} className={formQuality==='degraded'?'selected':''} onClick={()=>setFormQuality('degraded')}>Form faded</button></div></fieldset><label className="note-label">Optional note<input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Setup, form, or adjustment"/></label></details>}
    </main><footer className="workout-actions"><button className="button ghost" onClick={()=>logCurrent(true)}><SkipForward/> Skip</button>{timed&&!workStarted?<button className="button primary" onClick={toggleWorkTimer}><Play/> Start timer</button>:<button className="button primary" onClick={()=>logCurrent(false)}><Check/> {holdDone?'Done — log it':index===queue.length-1?'Finish':'Complete set'} <ChevronRight/></button>}</footer>
  </div>
}
