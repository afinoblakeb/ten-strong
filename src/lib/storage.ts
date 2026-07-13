import { z } from 'zod'
import type { AppData } from '../types'
import { formatISODate } from './date'

const STORAGE_KEY = 'ten-strong-data-v1'

const readinessSchema = z.object({ energy:z.enum(['low','normal','high']), soreness:z.enum(['none','mild','significant']), pain:z.enum(['none','present']), hasDumbbells:z.boolean().default(true), availableWeight:z.number().nullable(), minutes:z.union([z.literal(5),z.literal(10)]) })
const setSchema = z.object({ id:z.string(), exerciseId:z.string(), setNumber:z.number(), reps:z.number().optional(), seconds:z.number().optional(), weight:z.number().optional(), rir:z.number().min(0).max(4), formQuality:z.enum(['good','degraded']).optional(), variation:z.string().optional(), targetReps:z.number().optional(), targetSeconds:z.number().optional(), tempo:z.string().optional(), discomfort:z.boolean().optional(), note:z.string().optional(), completed:z.boolean() })
const sessionSchema = z.object({ id:z.string(), day:z.number().min(1).max(90), date:z.string(), templateId:z.string(), mode:z.enum(['normal','reduced','recovery','minimum','stop']), status:z.enum(['completed','partial','recovery','missed']), durationSeconds:z.number().nonnegative(), readiness:readinessSchema, recommendationExplanation:z.string().optional(), sets:z.array(setSchema), note:z.string().optional() })

export const appDataSchema = z.object({
  version:z.literal(1),
  profile:z.object({ label:z.string(), ageRange:z.string(), height:z.string(), weightLb:z.number().positive(), trainingHistory:z.string(), activityLevel:z.string(), dumbbells:z.array(z.number().positive()), limitations:z.string(), preferredTime:z.string(), habitAnchor:z.string().default('After I get ready'), hasSturdyChair:z.boolean().default(true), startDate:z.string(), photoReminder:z.boolean(), onboardingComplete:z.boolean() }),
  sessions:z.array(sessionSchema),
  assessments:z.array(z.object({ id:z.string(), date:z.string(), day:z.number(), metric:z.string(), value:z.number(), unit:z.string(), exerciseId:z.string().optional(), weight:z.number().optional(), variation:z.string().optional() })),
  bodyWeights:z.array(z.object({ date:z.string(), weightLb:z.number().positive() })),
  lastOpenedDate:z.string(),
})

export function createDefaultData(): AppData {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  return { version:1, profile:{ label:'My 90-Day Challenge', ageRange:'30–39', height:`5'9"`, weightLb:140, trainingHistory:'Formerly athletic; detrained', activityLevel:'Mostly sedentary', dumbbells:[], limitations:'', preferredTime:'Morning', habitAnchor:'After I get ready', hasSturdyChair:true, startDate:formatISODate(tomorrow), photoReminder:false, onboardingComplete:false }, sessions:[], assessments:[], bodyWeights:[], lastOpenedDate:formatISODate(new Date()) }
}

export function loadData(): AppData {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return createDefaultData(); return appDataSchema.parse(JSON.parse(raw)) }
  catch { return createDefaultData() }
}

export function saveData(data: AppData) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
export function clearData() { localStorage.removeItem(STORAGE_KEY) }

export function parseImport(raw: string): AppData {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw new Error('This file is not valid JSON.') }
  const result = appDataSchema.safeParse(parsed)
  if (!result.success) throw new Error('This backup does not match the Ten Strong data format.')
  return result.data
}

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href=url; anchor.download=name; anchor.click(); URL.revokeObjectURL(url)
}

export function sessionsToCsv(data: AppData): string {
  const rows = [['date','challenge_day','status','workout','minutes','exercise','set','reps','seconds','weight_lb','rir','discomfort']]
  data.sessions.forEach((session) => session.sets.forEach((set) => rows.push([session.date,String(session.day),session.status,session.templateId,(session.durationSeconds/60).toFixed(1),set.exerciseId,String(set.setNumber),String(set.reps ?? ''),String(set.seconds ?? ''),String(set.weight ?? ''),String(set.rir),String(Boolean(set.discomfort))])))
  return rows.map((row) => row.map((cell) => `"${cell.replaceAll('"','""')}"`).join(',')).join('\n')
}

function escapeHtml(value: string | number): string { return String(value).replace(/[&<>"']/g,(character)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' })[character]!) }

export function summaryToHtml(data: AppData): string {
  const completed=data.sessions.filter((session)=>['completed','recovery'].includes(session.status)).length
  const minutes=Math.round(data.sessions.reduce((sum,session)=>sum+session.durationSeconds,0)/60)
  const sessionRows=[...data.sessions].sort((a,b)=>a.day-b.day).map((session)=>`<tr><td>${session.day}</td><td>${escapeHtml(session.date)}</td><td>${escapeHtml(session.status)}</td><td>${escapeHtml(session.templateId)}</td><td>${Math.max(1,Math.round(session.durationSeconds/60))}</td></tr>`).join('')
  const assessmentRows=data.assessments.map((result)=>`<tr><td>${result.day}</td><td>${escapeHtml(result.exerciseId??result.metric)}</td><td>${result.value} ${escapeHtml(result.unit)}</td><td>${result.weight?`${result.weight} lb`:''}</td><td>${escapeHtml(result.variation??'')}</td></tr>`).join('')
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ten Strong summary</title><style>body{font:16px system-ui;max-width:850px;margin:40px auto;padding:0 20px;color:#17221f}h1{font-size:42px}h2{margin-top:38px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:9px;border-bottom:1px solid #ddd}.metrics{display:flex;gap:30px}.metrics strong{display:block;font-size:28px}@media print{body{margin:0}}</style><h1>Ten Strong</h1><p>${escapeHtml(data.profile.label)} · Started ${escapeHtml(data.profile.startDate)}</p><div class="metrics"><div><strong>${completed}</strong>days completed</div><div><strong>${minutes}</strong>training minutes</div><div><strong>${data.sessions.length}</strong>days practiced</div></div><h2>Assessments</h2><table><thead><tr><th>Day</th><th>Exercise</th><th>Result</th><th>Load</th><th>Version</th></tr></thead><tbody>${assessmentRows||'<tr><td colspan="5">No assessments logged yet.</td></tr>'}</tbody></table><h2>Session history</h2><table><thead><tr><th>Day</th><th>Date</th><th>Status</th><th>Workout</th><th>Minutes</th></tr></thead><tbody>${sessionRows||'<tr><td colspan="5">No sessions logged yet.</td></tr>'}</tbody></table><p><small>Generated locally by Ten Strong. This file contains personal workout data.</small></p></html>`
}
