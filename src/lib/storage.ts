import { z } from 'zod'
import type { AppData } from '../types'
import { formatISODate } from './date'

export const STORAGE_KEY = 'ten-strong-data-v1'
const RECOVERY_KEY = 'ten-strong-data-v1-recovery'
const DRAFT_PREFIX = 'ten-strong-draft-'

const readinessSchema = z.object({ energy:z.enum(['low','normal','high']), soreness:z.enum(['none','mild','significant']), pain:z.enum(['none','present']), hasDumbbells:z.boolean().default(true), availableWeight:z.number().nullable(), minutes:z.union([z.literal(5),z.literal(10)]).optional() })
const setSchema = z.object({ id:z.string(), exerciseId:z.string(), setNumber:z.number(), reps:z.number().optional(), seconds:z.number().optional(), weight:z.number().optional(), rir:z.number().min(0).max(4), formQuality:z.enum(['good','degraded']).optional(), variation:z.string().optional(), targetReps:z.number().optional(), targetRepMax:z.number().optional(), targetSeconds:z.number().optional(), tempo:z.string().optional(), discomfort:z.boolean().optional(), mobilityComfort:z.enum(['comfortable','limited']).optional(), note:z.string().optional(), completed:z.boolean() })
const sessionSchema = z.object({ id:z.string(), day:z.number().min(1), date:z.string(), templateId:z.string(), mode:z.enum(['normal','reduced','recovery','minimum','stop']), status:z.enum(['completed','partial','recovery','safety','missed']), durationSeconds:z.number().nonnegative(), activitySeconds:z.number().nonnegative().optional(), readiness:readinessSchema, recommendationExplanation:z.string().optional(), sets:z.array(setSchema), note:z.string().optional() })

export const appDataSchema = z.object({
  version:z.literal(1),
  profile:z.object({ label:z.string(), ageRange:z.string(), height:z.string(), weightLb:z.number().positive(), trainingHistory:z.string(), activityLevel:z.string(), dumbbells:z.array(z.number().positive()), limitations:z.string(), preferredTime:z.string(), habitAnchor:z.string().default('After I get ready'), hasSturdyChair:z.boolean().default(true), startDate:z.string(), photoReminder:z.boolean(), onboardingComplete:z.boolean(), soundCues:z.boolean().default(true), cueConfirmedThrough:z.string().optional() }),
  sessions:z.array(sessionSchema),
  assessments:z.array(z.object({ id:z.string(), date:z.string(), day:z.number(), metric:z.string(), value:z.number(), unit:z.string(), exerciseId:z.string().optional(), weight:z.number().optional(), variation:z.string().optional(), tempo:z.string().optional() })),
  bodyWeights:z.array(z.object({ date:z.string(), weightLb:z.number().positive() })),
  lastOpenedDate:z.string(),
  lastBackupAt:z.string().optional(),
})

export function createDefaultData(): AppData {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  return { version:1, profile:{ label:'My 90-Day Challenge', ageRange:'30–39', height:`5'9"`, weightLb:140, trainingHistory:'Formerly athletic; detrained', activityLevel:'Mostly sedentary', dumbbells:[], limitations:'', preferredTime:'Morning', habitAnchor:'After I get ready', hasSturdyChair:true, startDate:formatISODate(tomorrow), photoReminder:false, onboardingComplete:false, soundCues:true }, sessions:[], assessments:[], bodyWeights:[], lastOpenedDate:formatISODate(new Date()) }
}

// --- Lenient recovery: clamp leaf values and drop only individually-invalid records so one bad set never discards 89 good days.
function clampNumber(value:unknown,min:number,max:number,fallback:number):number{return typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback}
const optionalNumber=z.preprocess((value)=>typeof value==='number'&&Number.isFinite(value)?value:undefined,z.number().optional())
const optionalString=z.preprocess((value)=>typeof value==='string'?value:undefined,z.string().optional())
function arrayOfValid<Schema extends z.ZodType>(schema:Schema){return z.preprocess((value)=>Array.isArray(value)?value:[],z.array(z.unknown())).transform((items)=>items.flatMap((item)=>{const result=schema.safeParse(item);return result.success?[result.data as z.output<Schema>]:[]}))}

const lenientReadinessSchema=z.object({
  energy:z.enum(['low','normal','high']).catch('normal'), soreness:z.enum(['none','mild','significant']).catch('none'), pain:z.enum(['none','present']).catch('none'),
  hasDumbbells:z.boolean().catch(true), availableWeight:z.preprocess((value)=>typeof value==='number'&&Number.isFinite(value)?value:null,z.number().nullable()),
  minutes:z.union([z.literal(5),z.literal(10)]).optional().catch(undefined),
}).catch({energy:'normal',soreness:'none',pain:'none',hasDumbbells:true,availableWeight:null})
const lenientSetSchema=z.object({
  id:z.string(), exerciseId:z.string(), setNumber:z.preprocess((value)=>clampNumber(value,1,999,1),z.number()),
  reps:optionalNumber, seconds:optionalNumber, weight:optionalNumber, rir:z.preprocess((value)=>clampNumber(value,0,4,0),z.number()),
  formQuality:z.enum(['good','degraded']).optional().catch(undefined), variation:optionalString,
  targetReps:optionalNumber, targetRepMax:optionalNumber, targetSeconds:optionalNumber, tempo:optionalString,
  discomfort:z.boolean().optional().catch(undefined), mobilityComfort:z.enum(['comfortable','limited']).optional().catch(undefined),
  note:optionalString, completed:z.boolean().catch(true),
})
const lenientSessionSchema=z.object({
  id:z.string(), day:z.number().min(1), date:z.string(), templateId:z.string(),
  mode:z.enum(['normal','reduced','recovery','minimum','stop']).catch('normal'), status:z.enum(['completed','partial','recovery','safety','missed']).catch('completed'),
  durationSeconds:z.preprocess((value)=>clampNumber(value,0,Number.MAX_SAFE_INTEGER,0),z.number()),
  activitySeconds:z.preprocess((value)=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:undefined,z.number().optional()),
  readiness:lenientReadinessSchema, recommendationExplanation:optionalString, sets:arrayOfValid(lenientSetSchema), note:optionalString,
})
const lenientAssessmentSchema=z.object({ id:z.string(), date:z.string(), day:z.number(), metric:z.string(), value:z.number(), unit:z.string(), exerciseId:optionalString, weight:optionalNumber, variation:optionalString, tempo:optionalString })
const lenientBodyWeightSchema=z.object({ date:z.string(), weightLb:z.number().positive() })

function lenientRecover(parsed:unknown):AppData|null{
  if(typeof parsed!=='object'||parsed===null||Array.isArray(parsed))return null
  const defaults=createDefaultData()
  const lenientSchema=z.object({
    version:z.literal(1).catch(1),
    profile:z.object({
      label:z.string().catch(defaults.profile.label), ageRange:z.string().catch(defaults.profile.ageRange), height:z.string().catch(defaults.profile.height),
      weightLb:z.preprocess((value)=>typeof value==='number'&&Number.isFinite(value)&&value>0?value:defaults.profile.weightLb,z.number()),
      trainingHistory:z.string().catch(defaults.profile.trainingHistory), activityLevel:z.string().catch(defaults.profile.activityLevel),
      dumbbells:z.preprocess((value)=>Array.isArray(value)?value.filter((item)=>typeof item==='number'&&Number.isFinite(item)&&item>0):[],z.array(z.number())),
      limitations:z.string().catch(''), preferredTime:z.string().catch(defaults.profile.preferredTime), habitAnchor:z.string().catch(defaults.profile.habitAnchor),
      hasSturdyChair:z.boolean().catch(true), startDate:z.string().catch(defaults.profile.startDate), photoReminder:z.boolean().catch(false),
      onboardingComplete:z.boolean().catch(false), soundCues:z.boolean().catch(true), cueConfirmedThrough:optionalString,
    }).catch(defaults.profile),
    sessions:arrayOfValid(lenientSessionSchema), assessments:arrayOfValid(lenientAssessmentSchema), bodyWeights:arrayOfValid(lenientBodyWeightSchema),
    lastOpenedDate:z.string().catch(defaults.lastOpenedDate), lastBackupAt:optionalString,
  })
  const recovered=lenientSchema.safeParse(parsed)
  if(!recovered.success)return null
  const strict=appDataSchema.safeParse(recovered.data)
  return strict.success?strict.data:null
}

export interface LoadFailure { message:string; hasRecoveryCopy:boolean }
let loadFailureState: LoadFailure | null = null
export function getLoadFailure(): LoadFailure | null { return loadFailureState }
export function clearLoadFailure() { loadFailureState = null }
export function getRecoveryBlob(): string | null { try { return localStorage.getItem(RECOVERY_KEY) } catch { return null } }
export function clearRecoveryBlob() { try { localStorage.removeItem(RECOVERY_KEY) } catch { /* storage unavailable */ } }

// Keep the newest quarantine, but never overwrite an existing recovery copy with an emptier one.
function quarantineRaw(raw:string){ try { const existing=localStorage.getItem(RECOVERY_KEY); if(existing!==null&&existing.length>raw.length)return; localStorage.setItem(RECOVERY_KEY,raw) } catch { /* quota exhausted — the original blob stays under STORAGE_KEY until the user acts */ } }

function timestampFromSetId(id:string):number|null{
  const match=id.match(/-(\d{13})$/)
  if(!match)return null
  const value=Number(match[1])
  return Number.isFinite(value)?value:null
}

/**
 * Repairs the narrowly identifiable v1 edge case where Day 1 was opened on the
 * selected start date, abandoned overnight, and mostly completed the next day.
 * The session id records its real completion date and set ids prove the long gap.
 * Multiple-session histories and ordinary short workouts crossing midnight are untouched.
 */
export function repairStaleFirstDayResume(data:AppData):AppData{
  if(data.sessions.length!==1)return data
  const session=data.sessions[0]
  const completionDate=session.id.match(/^(\d{4}-\d{2}-\d{2})-d1-/)?.[1]
  if(!completionDate||session.day!==1||session.templateId.replace('--bodyweight','')!=='assessment'||session.status==='safety'||(session.activitySeconds??session.durationSeconds)<600)return data
  if(data.profile.startDate!==session.date||completionDate<=session.date)return data
  const timestamps=session.sets.filter((set)=>set.completed).map((set)=>timestampFromSetId(set.id)).filter((value):value is number=>value!==null)
  if(!timestamps.length)return data
  const setDates=timestamps.map((value)=>formatISODate(new Date(value)))
  const longGap=Math.max(...timestamps)-Math.min(...timestamps)>2*60*60*1000
  if(!setDates.includes(completionDate)||!longGap)return data
  const bodyWeights=data.bodyWeights.length===1&&data.bodyWeights[0].date===session.date?[{...data.bodyWeights[0],date:completionDate}]:data.bodyWeights
  return {...data,profile:{...data.profile,startDate:completionDate},sessions:[{...session,date:completionDate}],assessments:data.assessments.map((result)=>result.day===1&&result.date===session.date?{...result,date:completionDate}:result),bodyWeights}
}

function adoptRepair(data:AppData):AppData{
  const repaired=repairStaleFirstDayResume(data)
  if(repaired!==data)try{localStorage.setItem(STORAGE_KEY,JSON.stringify(repaired))}catch{/* keep the repaired in-memory copy; AppState will retry persistence */}
  return repaired
}

export function loadData(): AppData {
  loadFailureState=null
  let raw:string|null=null
  try { raw=localStorage.getItem(STORAGE_KEY) } catch { raw=null }
  if (!raw) return createDefaultData()
  let parsed:unknown; let parseable=true
  try { parsed=JSON.parse(raw) } catch { parseable=false }
  if (parseable) { const strict=appDataSchema.safeParse(parsed); if (strict.success) return adoptRepair(strict.data) }
  quarantineRaw(raw)
  if (parseable) { const recovered=lenientRecover(parsed); if (recovered) return adoptRepair(recovered) }
  loadFailureState={ message:'Your saved data could not be read.', hasRecoveryCopy:getRecoveryBlob()!==null }
  return createDefaultData()
}

export function saveData(data: AppData) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
export function clearDrafts() { try { const keys:string[]=[]; for(let index=0;index<localStorage.length;index+=1){const key=localStorage.key(index); if(key?.startsWith(DRAFT_PREFIX))keys.push(key)} keys.forEach((key)=>localStorage.removeItem(key)) } catch { /* storage unavailable */ } }
export function clearData() { localStorage.removeItem(STORAGE_KEY); clearDrafts() }

export function markBackedUp(data: AppData): AppData { return { ...data, lastBackupAt:formatISODate(new Date()) } }
export function exportBackup(data: AppData): { content:string; data:AppData } { const stamped=markBackedUp(data); return { content:JSON.stringify(stamped,null,2), data:stamped } }

export function parseImport(raw: string): AppData {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw new Error('This file is not valid JSON.') }
  if (typeof parsed==='object'&&parsed!==null&&'version' in parsed&&typeof (parsed as {version:unknown}).version==='number'&&(parsed as {version:number}).version>1) throw new Error('This backup is from a newer version of Ten Strong. Update the app on this device, then import it again.')
  const result = appDataSchema.safeParse(parsed)
  if (!result.success) { const issue=result.error.issues[0]; throw new Error(`This backup does not match the Ten Strong data format${issue?` (${issue.path.join('.')||'root'}: ${issue.message})`:'.'}`) }
  return repairStaleFirstDayResume(result.data)
}

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href=url; anchor.download=name; document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}

function escapeIcs(value:string):string{return value.replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;')}

export function habitReminderToIcs(data:AppData):string {
  const timeByPreference:Record<string,string>={Morning:'080000',Midday:'120000',Evening:'180000',Flexible:'090000'}
  const date=data.profile.startDate.replaceAll('-','')
  const time=timeByPreference[data.profile.preferredTime]??'080000'
  const cue=data.profile.habitAnchor.trim()||'Open Ten Strong'
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Ten Strong//Daily Practice//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:ten-strong-${date}@local`,`DTSTART:${date}T${time}`,'RRULE:FREQ=DAILY',`SUMMARY:${escapeIcs('Ten Strong — 10 active minutes')}`,`DESCRIPTION:${escapeIcs(`${cue} → open Ten Strong`)}`,'END:VEVENT','END:VCALENDAR',''].join('\r\n')
}

export function sessionsToCsv(data: AppData): string {
  const rows = [['date','challenge_day','status','workout','active_minutes','elapsed_minutes','exercise','set','reps','seconds','weight_lb','rir','discomfort','mobility_comfort']]
  data.sessions.forEach((session) => {const prefix=[session.date,String(session.day),session.status,session.templateId,((session.activitySeconds??session.durationSeconds)/60).toFixed(1),(session.durationSeconds/60).toFixed(1)];if(!session.sets.length)rows.push([...prefix,'','','','','','','','']);else session.sets.forEach((set)=>rows.push([...prefix,set.exerciseId,String(set.setNumber),String(set.reps??''),String(set.seconds??''),String(set.weight??''),String(set.rir),String(Boolean(set.discomfort)),String(set.mobilityComfort??'')]))})
  return rows.map((row) => row.map((cell) => `"${cell.replaceAll('"','""')}"`).join(',')).join('\n')
}

function escapeHtml(value: string | number): string { return String(value).replace(/[&<>"']/g,(character)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' })[character]!) }

export function summaryToHtml(data: AppData): string {
  const completed=data.sessions.filter((session)=>(session.activitySeconds??session.durationSeconds)>=600&&['completed','partial','recovery'].includes(session.status)).length
  const minutes=Math.round(data.sessions.reduce((sum,session)=>sum+(session.activitySeconds??session.durationSeconds),0)/60)
  const sessionRows=[...data.sessions].sort((a,b)=>a.day-b.day).map((session)=>`<tr><td>${session.day}</td><td>${escapeHtml(session.date)}</td><td>${escapeHtml(session.status)}</td><td>${escapeHtml(session.templateId)}</td><td>${Math.round((session.activitySeconds??session.durationSeconds)/60)}</td></tr>`).join('')
  const assessmentRows=data.assessments.map((result)=>`<tr><td>${result.day}</td><td>${escapeHtml(result.exerciseId??result.metric)}</td><td>${result.value} ${escapeHtml(result.unit)}</td><td>${result.weight?`${result.weight} lb`:''}</td><td>${escapeHtml(result.variation??'')}</td></tr>`).join('')
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ten Strong summary</title><style>body{font:16px system-ui;max-width:850px;margin:40px auto;padding:0 20px;color:#17221f}h1{font-size:42px}h2{margin-top:38px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:9px;border-bottom:1px solid #ddd}.metrics{display:flex;gap:30px}.metrics strong{display:block;font-size:28px}@media print{body{margin:0}}</style><h1>Ten Strong</h1><p>${escapeHtml(data.profile.label)} · Started ${escapeHtml(data.profile.startDate)}</p><div class="metrics"><div><strong>${completed}</strong>days completed</div><div><strong>${minutes}</strong>active minutes</div><div><strong>${data.sessions.length}</strong>days recorded</div></div><h2>Assessments</h2><table><thead><tr><th>Day</th><th>Exercise</th><th>Result</th><th>Load</th><th>Version</th></tr></thead><tbody>${assessmentRows||'<tr><td colspan="5">No assessments logged yet.</td></tr>'}</tbody></table><h2>Session history</h2><table><thead><tr><th>Day</th><th>Date</th><th>Status</th><th>Workout</th><th>Active minutes</th></tr></thead><tbody>${sessionRows||'<tr><td colspan="5">No sessions logged yet.</td></tr>'}</tbody></table><p><small>Generated locally by Ten Strong. This file contains personal workout data.</small></p></html>`
}
