// oxlint-disable react/only-export-components -- pure calendar/protein/library helpers are exported alongside the pages for regression tests
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight, ClipboardList, Database, Download, Dumbbell, FileText, HeartPulse, RotateCcw, Scale, Settings, Upload } from 'lucide-react'
import { useAppState } from '../AppState'
import { exercises, exerciseById } from '../data/exercises'
import { fullProgram, phases, programForDay, templateById } from '../data/program'
import { designPrinciples, sources } from '../data/methodology'
import { consistencyRate, getChallengeDay, getProgramDay, setComparisonKey, streakInfo, totalMinutes } from '../lib/engine'
import { appDataSchema, clearData, downloadFile, exportBackup, habitReminderToIcs, parseImport, sessionsToCsv, summaryToHtml } from '../lib/storage'
import { formatDumbbells, parseDumbbellInput } from '../lib/parse'
import { MovementGuide } from '../components/MovementGuide'
import { formatISODate } from '../lib/date'
import type { AppData, Exercise, MovementPattern, SessionKind, SessionLog } from '../types'

// --- Pure helpers, exported for regression tests ---

export type CalendarStatus = 'completed' | 'practiced' | 'partial' | 'recovery' | 'safety' | 'missed' | 'today' | 'upcoming'

export function calendarDayStatus(log: SessionLog | undefined, day: number, currentDay: number): CalendarStatus {
  if (log) return log.status === 'partial' && (log.activitySeconds ?? log.durationSeconds) >= 600 ? 'practiced' : log.status
  return day < currentDay ? 'missed' : day === currentDay ? 'today' : 'upcoming'
}

/** Status and kind classes are namespaced ("is-" / "kind-") so a future mobility day can never pick up completed-day styling. */
export function calendarCellClass(status: CalendarStatus, kind: SessionKind): string { return `day-cell is-${status} kind-${kind}` }

export function calendarGlyph(status: CalendarStatus, kind: SessionKind): string {
  if (status === 'completed' || status === 'practiced') return '✓'
  if (status === 'recovery') return '○'
  if (status === 'partial') return '½'
  if (status === 'safety') return '!'
  if (status === 'missed') return '—'
  if (status === 'today') return '•'
  return kind === 'assessment' ? 'A' : kind === 'recovery' ? '○' : ''
}

export function calendarStatusLabel(status: CalendarStatus): string {
  return { completed:'done', practiced:'ten active minutes done, strength plan partial', recovery:'mobility done', partial:'partial', safety:'safety stop', missed:'missed', today:'today', upcoming:'upcoming' }[status]
}

export function latestWeightLb(data: AppData): number { return data.bodyWeights.at(-1)?.weightLb ?? data.profile.weightLb }

/** Protein guidance from actual body weight: 1.4–1.7 g/kg (kg = lb × 0.4536). */
export function proteinRange(weightLb: number): { kg:number; low:number; high:number } { const kg = weightLb * 0.4536; return { kg:Math.round(kg), low:Math.round(kg * 1.4), high:Math.round(kg * 1.7) } }

/** Rounds to 0.1 lb so imported float noise never renders as '142.45000000000002'. */
export function formatWeightLb(value: number): string { return String(Math.round(value * 10) / 10) }

export function searchExercises(list: Exercise[], pattern: string, query: string): Exercise[] {
  const q = query.trim().toLowerCase()
  return list.filter((exercise) => (pattern === 'all' || exercise.pattern === pattern) && (!q || exercise.name.toLowerCase().includes(q)))
}

export const patternLabel: Record<MovementPattern, string> = { push:'Push', pull:'Pull', squat:'Squat', hinge:'Hinge', unilateral:'Single-side', trunk:'Trunk', carry:'Carry', recovery:'Mobility' }

const CALENDAR_LEGEND: [string, string][] = [['✓','done'],['○','mobility'],['½','partial'],['!','safety stop'],['—','missed'],['•','today']]

export function CalendarPage() {
  const {data}=useAppState(); const current=getChallengeDay(data.profile.startDate); const byDay=new Map(data.sessions.map(s=>[s.day,s]));
  return <div className="page"><div className="eyebrow">The whole arc</div><h1>90-day calendar</h1><p className="lede small">Tap any day to preview the session. Looking never changes your progress.</p><div className="calendar-legend">{CALENDAR_LEGEND.map(([glyph,label])=><span key={label}><b aria-hidden>{glyph}</b> {label}</span>)}</div>{phases.map(phase=><section className="calendar-phase" key={phase.id}><div><span>Phase {phase.id} · Days {phase.start}–{phase.end}</span><h2>{phase.name}</h2></div><ul className="day-grid" aria-label={`Phase ${phase.id}: ${phase.name}`}>{fullProgram.filter(d=>d.phaseId===phase.id).map(day=>{const status=calendarDayStatus(byDay.get(day.day),day.day,current);return <li className="day-cell-wrap" key={day.day}><Link to={`/day/${day.day}`} className={calendarCellClass(status,day.kind)} aria-current={day.day===current?'date':undefined} aria-label={`Day ${day.day}, ${day.title}, ${calendarStatusLabel(status)}. Preview session.`}><strong aria-hidden>{day.day}</strong><span aria-hidden>{calendarGlyph(status,day.kind)}</span></Link></li>})}</ul></section>)}</div>
}

export function ProgressPage() {
  const {data,addBodyWeight}=useAppState()
  const [weightInput,setWeightInput]=useState(formatWeightLb(data.bodyWeights.at(-1)?.weightLb??data.profile.weightLb))
  const [weightMessage,setWeightMessage]=useState('')
  const rate=consistencyRate(data)
  const minutes=totalMinutes(data)
  const streak=streakInfo(data)
  const chart=useMemo(()=>data.sessions.filter((session)=>session.status!=='safety').slice(-12).map(s=>({day:`D${s.day}`,minutes:Math.max(1,Math.round((s.activitySeconds??s.durationSeconds)/60))})),[data.sessions])
  const chartMax=Math.max(12,...chart.map(point=>point.minutes))
  const mobilitySets=data.sessions.flatMap((session)=>session.sets.filter((set)=>set.completed&&set.mobilityComfort))
  const mobilityDays=new Set(data.sessions.filter((session)=>session.sets.some((set)=>set.completed&&set.mobilityComfort)).map((session)=>session.day)).size
  const comfortableMobility=mobilitySets.filter((set)=>set.mobilityComfort==='comfortable').length
  const limitedMobility=mobilitySets.length-comfortableMobility
  const exerciseStats=useMemo(()=>{
    const sets=[...data.sessions].sort((a,b)=>a.day-b.day).flatMap((session)=>session.sets.filter((set)=>set.completed&&exerciseById[set.exerciseId]?.pattern!=='recovery'))
    const latestByExercise=new Map<string,(typeof sets)[number]>()
    sets.forEach((set)=>latestByExercise.set(set.exerciseId,set))
    return [...latestByExercise.values()].map((latest)=>{
      const comparable=sets.filter((set)=>setComparisonKey(set)===setComparisonKey(latest))
      const first=comparable[0]
      return {name:exerciseById[latest.exerciseId]?.name??latest.exerciseId,first:first.reps??first.seconds??0,latest:latest.reps??latest.seconds??0,best:Math.max(...comparable.map((set)=>set.reps??set.seconds??0)),unit:latest.reps!==undefined?'reps':'sec',setup:`${latest.variation??'Recorded version'}${latest.weight?` · ${latest.weight} lb`:''}`}
    }).slice(0,5)
  },[data.sessions])
  const assessmentComparisons=useMemo(()=>{
    const exerciseIds=[...new Set(data.assessments.map((result)=>result.exerciseId).filter(Boolean))] as string[]
    return exerciseIds.map((exerciseId)=>{
      const results=data.assessments.filter((result)=>result.exerciseId===exerciseId).sort((a,b)=>a.day-b.day)
      const baseline=results.find((result)=>result.day===1)
      const latest=results.at(-1)
      const comparable=Boolean(baseline&&latest&&baseline.id!==latest.id&&baseline.metric===latest.metric&&baseline.unit===latest.unit&&(baseline.weight??0)===(latest.weight??0)&&(baseline.variation??'')===(latest.variation??'')&&(baseline.tempo??'')===(latest.tempo??''))
      const change=baseline&&latest?latest.value-baseline.value:0
      return {exerciseId,name:exerciseById[exerciseId]?.name??exerciseId,baseline,latest,comparable,change,percentage:comparable&&baseline&&baseline.value>0?Math.round(change/baseline.value*100):null}
    })
  },[data.assessments])
  const bodyWeightMin=Math.min(...data.bodyWeights.map((entry)=>entry.weightLb),data.profile.weightLb)-1
  const bodyWeightMax=Math.max(...data.bodyWeights.map((entry)=>entry.weightLb),data.profile.weightLb)+1
  function logWeight(){const raw=Number(weightInput);if(!Number.isFinite(raw)||raw<80||raw>500){setWeightMessage('Enter a body weight between 80 and 500 lb.');return}const value=Math.round(raw*10)/10;addBodyWeight({date:formatISODate(new Date()),weightLb:value});setWeightInput(String(value));setWeightMessage('Saved for today.')}
  return <div className="page">
    <div className="eyebrow">Evidence of practice</div><h1>Progress</h1>
    <div className="metric-grid"><article><strong>{streak.current}</strong><span>day streak{streak.best>streak.current?` · best ${streak.best}`:''}</span></article><article><strong>{rate}%</strong><span>consistency</span></article><article><strong>{minutes}</strong><span>active minutes</span></article></div>
    {mobilitySets.length>0&&<section className="card mobility-summary"><div><div className="eyebrow">Mobility days</div><h2>Mobility practice</h2></div><div><strong>{mobilityDays}</strong><span>mobility days</span><strong>{comfortableMobility}</strong><span>comfortable blocks</span><strong>{limitedMobility}</strong><span>limited-today blocks</span></div></section>}
    <section className="card chart-card"><div><h2>Training rhythm</h2><p>Active minutes per session — the daily target is 10</p></div>{chart.length?<><div className="spark-bars" aria-hidden="true"><div className="spark-target" style={{bottom:`${10/chartMax*100}%`}}><small>10 min</small></div>{chart.map(point=><div className="spark-column" key={point.day}><span style={{height:`${Math.max(8,point.minutes/chartMax*100)}%`}}/><small>{point.day}</small></div>)}</div><table className="sr-only"><caption>Active minutes by session, against a 10-minute daily target</caption><tbody>{chart.map(d=><tr key={d.day}><th>{d.day}</th><td>{d.minutes} minutes</td></tr>)}</tbody></table></>:<div className="empty-state">Complete your first session to start the chart.</div>}</section>
    <section><div className="section-heading"><div><div className="eyebrow">Comparable work</div><h2>Exercise trends</h2></div></div><div className="trend-list">{exerciseStats.length?exerciseStats.map(stat=>{const change=stat.latest-stat.first;const percentage=stat.first>0?Math.round(change/stat.first*100):null;return <div className="trend-row" key={stat.name}><div><strong>{stat.name}</strong><span>{stat.setup}</span><span>Start: {stat.first} · Latest: {stat.latest} · Best: {stat.best} {stat.unit}</span></div><div><strong>{change>=0?'+':''}{change}</strong><span>{percentage===null?'No % baseline':`${percentage>=0?'+':''}${percentage}%`}</span></div></div>}):<p className="empty-state">Your clean repetitions and timed holds will appear here.</p>}</div><p className="micro">Only the same exercise, version, load, tempo, and metric are compared.</p></section>
    {assessmentComparisons.length>0&&<section><div className="section-heading"><div><div className="eyebrow">Day 1 → final</div><h2>Assessment changes</h2></div></div><div className="trend-list">{assessmentComparisons.map(result=><div className="trend-row" key={result.exerciseId}><div><strong>{result.name}</strong><span>{result.baseline?`Start: ${result.baseline.value} ${result.baseline.unit}`:'No Day 1 baseline'}{result.latest&&result.latest.id!==result.baseline?.id?` · Latest: ${result.latest.value} ${result.latest.unit}`:''}</span></div><div>{result.comparable?<><strong>{result.change>=0?'+':''}{result.change}</strong><span>{result.percentage!==null?`${result.percentage>=0?'+':''}${result.percentage}%`:'No percentage'}</span></>:<span>Awaiting same-setup final</span>}</div></div>)}</div></section>}
    <section className="card weight-card"><Scale/><div><h2>Optional body weight</h2><p>One to three entries per week is plenty. Daily fluctuations are normal.</p><div className="inline-entry"><input aria-label="Body weight in pounds" type="number" min="80" max="500" step="0.1" value={weightInput} onChange={(event)=>setWeightInput(event.target.value)}/><button className="button secondary" onClick={logWeight}>Save today</button></div>{weightMessage&&<small role="status">{weightMessage}</small>}{data.bodyWeights.length>1&&<><div className="weight-spark" aria-hidden="true">{data.bodyWeights.slice(-12).map((entry)=><span key={entry.date} style={{height:`${20+((entry.weightLb-bodyWeightMin)/(bodyWeightMax-bodyWeightMin))*70}%`}} title={`${entry.date}: ${formatWeightLb(entry.weightLb)} lb`}/>)}</div><table className="sr-only"><caption>Body weight entries</caption><tbody>{data.bodyWeights.map(entry=><tr key={entry.date}><th>{entry.date}</th><td>{formatWeightLb(entry.weightLb)} lb</td></tr>)}</tbody></table></>}</div></section>
  </div>
}

const LIBRARY_PATTERNS: MovementPattern[] = ['push','pull','squat','hinge','unilateral','trunk','carry','recovery']

export function ExerciseLibraryPage(){
  const [filter,setFilter]=useState('all')
  const [query,setQuery]=useState('')
  const visible=searchExercises(exercises,filter,query)
  const groups=LIBRARY_PATTERNS.map((pattern)=>({pattern,items:visible.filter((exercise)=>exercise.pattern===pattern)})).filter((group)=>group.items.length>0)
  return <div className="page"><div className="eyebrow">Every movement, step by step</div><h1>Exercise library</h1><p className="lede small">Setup, cues, and safe swaps for every movement in the plan.</p>
    <input className="library-search" type="search" aria-label="Search exercises by name" placeholder="Search by name" value={query} onChange={(event)=>setQuery(event.target.value)}/>
    <div className="filter-row"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>All</button>{LIBRARY_PATTERNS.map(p=><button className={filter===p?'active':''} onClick={()=>setFilter(p)} key={p}>{patternLabel[p]}</button>)}</div>
    {groups.length===0&&<p className="empty-state">No movements match “{query.trim()}”.</p>}
    {groups.map((group)=><section className="exercise-section" key={group.pattern}><h2>{patternLabel[group.pattern]} <small>{group.items.length}</small></h2><div className="exercise-grid">{group.items.map(exercise=><article className="exercise-card card" key={exercise.id}><span className="kind">{patternLabel[exercise.pattern]}</span><h3>{exercise.name}</h3><MovementGuide exercise={exercise} compact/></article>)}</div></section>)}
  </div>
}

export function PlanPage(){const current=getProgramDay(useAppState().data.profile.startDate);const upcoming=Array.from({length:7},(_,index)=>programForDay(current+index));return <div className="page"><div className="eyebrow">The 90-day arc</div><h1>{current>90?'Continue Strong':'Your plan'}</h1><p className="lede small">{current>90?'A sustainable weekly rhythm that keeps your history, progression, and ten-minute daily cue alive.':'Five progressive phases, alternating workouts and mobility so each ten-minute day has a job. Tap a challenge day to preview it.'}</p>{current<=90&&<div className="timeline">{phases.map(phase=><section className={`phase-card ${current>=phase.start&&current<=phase.end?'current':''}`} key={phase.id}><div className="phase-number">{phase.id}</div><div><span>Days {phase.start}–{phase.end}</span><h2>{phase.name}</h2><p>{phase.intent}</p><small>{phase.effort}</small></div></section>)}</div>}<section className="card week-card"><h2>{current>90?'Your continuation week':'A normal week covers'}</h2><div className="coverage"><span>Horizontal push</span><span>Vertical push</span><span>Horizontal pull</span><span>Squat</span><span>Hinge</span><span>Unilateral legs</span><span>Trunk</span><span>Carry</span><span>3 mobility days</span></div></section><section><div className="section-heading"><div><div className="eyebrow">Coming up</div><h2>Next seven days</h2></div></div>{upcoming.map(day=>{const content=<><span>{day.day<=90?`Day ${day.day}`:`C${day.day-90}`}</span><div><strong>{templateById[day.templateId].title}</strong><small>{templateById[day.templateId].focus}</small></div><span className={`kind ${day.kind}`}>{day.kind==='recovery'?'mobility':day.kind==='strength'?'workout':day.kind}</span></>;return day.day<=90?<Link className="plan-row" to={`/day/${day.day}`} aria-label={`Preview Day ${day.day}, ${templateById[day.templateId].title}`} key={day.day}>{content}</Link>:<div className="plan-row" key={day.day}>{content}</div>})}</section></div>}

export function MethodologyPage(){
  const {data}=useAppState()
  const lb=latestWeightLb(data)
  const protein=proteinRange(lb)
  return <div className="page article-page"><div className="eyebrow">How this plan was designed</div><h1>Useful evidence,<br/>translated into ten minutes.</h1><p className="lede">Ten Strong is an educational program for a detrained adult—not a medical service, maximal-strength protocol, or promise of a particular physique.</p><div className="principle-grid">{designPrinciples.map((p,i)=><article key={p.title}><span>0{i+1}</span><h2>{p.title}</h2><p>{p.text}</p></article>)}</div><section><h2>The honest constraint</h2><p>Ten minutes per day cannot simultaneously maximize strength, muscle gain, conditioning, and mobility. Most studies use longer sessions, so this plan extrapolates by distributing a modest weekly training dose across short sessions. It emphasizes practical strength, movement quality, and adherence.</p><p>Reps in reserve are self-reported and imprecise at first. Home dumbbell jumps may also be larger than ideal. The app uses transparent rules rather than pretending those limits do not exist.</p></section><section><h2>Recovery & food, kept practical</h2><p>At your logged ~{Math.round(lb)} lb ({protein.kg} kg), a flexible daily protein range of <strong>{protein.low}–{protein.high} g</strong> is reasonable for a healthy adult training for strength. In ordinary terms: include a palm-sized protein food at three or four meals. If you have kidney disease, a prescribed diet, or related medical concerns, discuss protein intake with a clinician.</p><div className="guidance-grid"><div><strong>Sleep</strong><span>A consistent window and at least seven hours when possible.</span></div><div><strong>Walking</strong><span>An optional easy 10–20 minutes, accumulated any way you like.</span></div><div><strong>Hydration</strong><span>Drink to thirst, keep water nearby, and increase fluids in heat.</span></div><div><strong>Food</strong><span>No calorie counting required. Eat enough to support stable energy and recovery.</span></div></div></section><section><h2>Sources</h2><ol className="sources">{sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><p>{source.note}</p></li>)}</ol></section></div>
}

export function MorePage(){return <div className="page"><div className="eyebrow">Reference & control</div><h1>More</h1><div className="menu-list"><Link to="/plan"><ClipboardList/><div><strong>Plan</strong><span>Phases, weekly rhythm, and what’s ahead</span></div><ChevronRight/></Link><Link to="/exercises"><Dumbbell/><div><strong>Exercise library</strong><span>Cues, regressions, and substitutions</span></div><ChevronRight/></Link><Link to="/recovery"><HeartPulse/><div><strong>Recovery guide</strong><span>Sleep, walking, food, soreness, and stress</span></div><ChevronRight/></Link><Link to="/methodology"><BookOpen/><div><strong>Methodology</strong><span>Evidence, assumptions, and limitations</span></div><ChevronRight/></Link><Link to="/settings"><Settings/><div><strong>Settings & data</strong><span>Equipment, backup, restore, and reset</span></div><ChevronRight/></Link><Link to="/settings"><Download/><div><strong>Backup</strong><span>Your data lives only on this device — export a copy</span></div><ChevronRight/></Link></div></div>}

export function RecoveryPage(){
  const {data}=useAppState()
  const lb=latestWeightLb(data)
  const protein=proteinRange(lb)
  return <div className="page article-page"><div className="eyebrow">Adaptation happens between sessions</div><h1>Recovery, without turning life into a spreadsheet.</h1><p className="lede small">Five habits that do the adaptation work between your ten-minute days.</p><div className="recovery-list"><article><span>01</span><div><h2>Protect a sleep window</h2><p>Aim for consistency and at least seven hours when possible. A poor night does not erase progress; choose reduced volume when energy is unusually low.</p></div></article><article><span>02</span><div><h2>Eat enough protein and total food</h2><p>At your logged ~{Math.round(lb)} lb, roughly {protein.low}–{protein.high} g of protein per day is a flexible range—not a pass/fail target. Add protein-containing food to each meal.</p></div></article><article><span>03</span><div><h2>Walk because it helps</h2><p>An easy 10–20 minute daily walk can support health and recovery. Break it into smaller pieces if that fits better.</p></div></article><article><span>04</span><div><h2>Read soreness honestly</h2><p>Mild, improving muscular soreness can support a reduced session. Significant, worsening, or joint-centered pain calls for recovery and, when concerning, professional assessment.</p></div></article><article><span>05</span><div><h2>Alcohol and stress count</h2><p>Less alcohol generally supports sleep and recovery. High stress is a valid reason to reduce the training dose.</p></div></article></div></div>
}

export function SettingsPage(){
  const {data,updateProfile,replaceData,resetData,restartChallenge,markBackedUp}=useAppState()
  const [weights,setWeights]=useState(formatDumbbells(data.profile.dumbbells))
  const [preferredTime,setPreferredTime]=useState(data.profile.preferredTime)
  const [habitAnchor,setHabitAnchor]=useState(data.profile.habitAnchor)
  const [hasSturdyChair,setHasSturdyChair]=useState(data.profile.hasSturdyChair)
  const [photoReminder,setPhotoReminder]=useState(data.profile.photoReminder)
  const [restartDate,setRestartDate]=useState(formatISODate(new Date()))
  const [message,setMessage]=useState('')
  const [pendingImport,setPendingImport]=useState<AppData|null>(null)
  const [confirmAction,setConfirmAction]=useState<'reset'|'restart'|null>(null)
  const parsedWeights=parseDumbbellInput(weights)
  const sessionCount=data.sessions.length
  const sessionsWord=(count:number)=>`${count} session${count===1?'':'s'}`
  function savePreferences(){updateProfile({dumbbells:parsedWeights.weights,preferredTime,habitAnchor,hasSturdyChair,photoReminder});setMessage('Preferences saved. Future recommendations will use your equipment.')}
  function exportJson(){const {content}=exportBackup(data);downloadFile('ten-strong-backup.json',content,'application/json');markBackedUp();setMessage('Backup exported.')}
  async function stageImport(file?:File){
    if(!file)return
    if(file.size>2_000_000){setMessage('That file is too large. Ten Strong backups must be under 2 MB.');return}
    try{const parsed=parseImport(await file.text());setPendingImport(parsed);setMessage('')}
    catch(error){setPendingImport(null);setMessage(error instanceof Error?error.message:'Import failed. Your existing data was not changed.')}
  }
  function confirmImport(){
    if(!pendingImport)return
    replaceData(pendingImport);setWeights(formatDumbbells(pendingImport.profile.dumbbells));setPreferredTime(pendingImport.profile.preferredTime);setHabitAnchor(pendingImport.profile.habitAnchor);setHasSturdyChair(pendingImport.profile.hasSturdyChair);setPhotoReminder(pendingImport.profile.photoReminder)
    setMessage(`Restored ${sessionsWord(pendingImport.sessions.length)} from the backup.`);setPendingImport(null)
  }
  function reset(){setConfirmAction(null);clearData();resetData();window.location.hash='#/onboarding'}
  function restart(){setConfirmAction(null);restartChallenge(restartDate);window.location.hash='#/today'}
  return <div className="page"><div className="eyebrow">Local-first control</div><h1>Settings & data</h1>{message&&<div className="notice" role="status">{message}</div>}
    <section className="card settings-section"><Dumbbell/><div><h2>Training setup</h2><label htmlFor="settings-dumbbells">Dumbbell weights in pounds</label><input id="settings-dumbbells" inputMode="text" autoComplete="off" value={weights} onChange={e=>setWeights(e.target.value)} placeholder="e.g. 10 15 25"/><p className="parse-feedback" aria-live="polite">{parsedWeights.weights.length>0&&<span className="parse-preview">We read: {parsedWeights.weights.join(', ')} lb.</span>}{parsedWeights.dropped.length>0&&<span className="parse-warn"> Skipping “{parsedWeights.dropped.join('”, “')}” — we couldn’t read {parsedWeights.dropped.length>1?'those':'that'} as a weight.</span>}</p><div className="two-col"><label>Preferred time<select value={preferredTime} onChange={e=>setPreferredTime(e.target.value)}><option>Morning</option><option>Midday</option><option>Evening</option><option>Flexible</option></select></label><label>Habit anchor<input value={habitAnchor} onChange={e=>setHabitAnchor(e.target.value)}/></label></div><label className="check"><input type="checkbox" checked={data.profile.soundCues} onChange={e=>updateProfile({soundCues:e.target.checked})}/><span>Timer sound &amp; vibration — chime when a rest or timed hold ends.</span></label><label className="check"><input type="checkbox" checked={hasSturdyChair} onChange={e=>setHasSturdyChair(e.target.checked)}/><span>I have a sturdy chair, couch, or counter for support.</span></label><label className="check"><input type="checkbox" checked={photoReminder} onChange={e=>setPhotoReminder(e.target.checked)}/><span>Show optional progress-photo reminders on Days 1 and 90.</span></label><button className="button secondary" onClick={savePreferences}>Save preferences</button></div></section>
    <section className="card settings-section"><Database/><div><h2>Backup and restore</h2><p>Personal data stays in this browser, so export a backup weekly.</p><div className="button-stack"><button className="button secondary" onClick={exportJson}><Download/> Export JSON backup</button><button className="button secondary" onClick={()=>downloadFile('ten-strong-summary.csv',sessionsToCsv(data),'text/csv')}><FileText/> Download CSV summary</button><button className="button secondary" onClick={()=>downloadFile('ten-strong-summary.html',summaryToHtml(data),'text/html')}><FileText/> Download printable summary</button><label className="button secondary file-button"><Upload/> Import JSON<input type="file" accept="application/json,.json" onChange={e=>{const file=e.target.files?.[0];e.target.value='';void stageImport(file)}}/></label></div><p className="micro">{data.lastBackupAt?`Last backup exported ${data.lastBackupAt}.`:'No backup exported yet.'}</p>
    {pendingImport&&<div className="confirm-panel" role="group" aria-label="Confirm import"><p>Replace current data — {sessionsWord(sessionCount)} — with this backup ({sessionsWord(pendingImport.sessions.length)})? Download current data first.</p><div className="button-stack"><button className="button secondary" onClick={exportJson}><Download/> Download current data</button><button className="button danger" onClick={confirmImport}>Replace data</button><button className="button ghost" onClick={()=>setPendingImport(null)}>Cancel</button></div></div>}</div></section>
    <section className="card install-section"><div className="app-icon">10</div><div><h2>Keep the cue on your iPhone</h2><ol><li>Open the deployed site in Safari.</li><li>Tap Share, then <strong>Add to Home Screen</strong>.</li><li>Optionally add the recurring calendar cue below.</li></ol><p>Ten Strong cannot silently schedule notifications. The calendar file uses your preferred time and habit anchor; your iPhone asks before adding it.</p><button className="button secondary" onClick={()=>downloadFile('ten-strong-daily-reminder.ics',habitReminderToIcs(data),'text/calendar')}><Download/> Add daily calendar cue</button></div></section>
    <section className="danger-zone"><h2>Start another 90 days</h2><p>Keep your profile and equipment but clear this challenge’s history.</p><div className="inline-entry"><input aria-label="New challenge start date" type="date" value={restartDate} onChange={e=>setRestartDate(e.target.value)}/><button className="button secondary" onClick={()=>setConfirmAction(confirmAction==='restart'?null:'restart')}>Restart challenge</button></div>
    {confirmAction==='restart'&&<div className="confirm-panel" role="group" aria-label="Confirm restart"><p>Are you sure? This deletes {sessionsWord(sessionCount)} and starts a new challenge on {restartDate}.</p><div className="button-stack"><button className="button danger" onClick={restart}>Yes, restart</button><button className="button ghost" onClick={()=>setConfirmAction(null)}>Cancel</button></div></div>}
    <h2>Reset everything</h2><p>Remove this app’s profile and challenge history from the browser.</p><button className="button danger" onClick={()=>setConfirmAction(confirmAction==='reset'?null:'reset')}><RotateCcw/> Reset everything</button>
    {confirmAction==='reset'&&<div className="confirm-panel" role="group" aria-label="Confirm reset"><p>Are you sure? This deletes {sessionsWord(sessionCount)} and your profile from this browser.</p><div className="button-stack"><button className="button danger" onClick={reset}>Yes, delete everything</button><button className="button ghost" onClick={()=>setConfirmAction(null)}>Cancel</button></div></div>}</section><p className="micro">Schema version {appDataSchema.safeParse(data).success?'1 · valid':'unknown'} · No remote database · No analytics</p>
  </div>
}
