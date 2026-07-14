import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { clearData, clearDrafts, clearLoadFailure, createDefaultData, exportBackup, getLoadFailure, getRecoveryBlob, habitReminderToIcs, loadData, markBackedUp, parseImport, saveData, sessionsToCsv, STORAGE_KEY, summaryToHtml } from '../lib/storage'
import { AppStateProvider, useAppState } from '../AppState'
import { formatISODate } from '../lib/date'
import type { SessionLog } from '../types'

const RECOVERY_KEY = 'ten-strong-data-v1-recovery'

function makeSession(day: number, overrides: Record<string, unknown> = {}) {
  return { id:`session-${day}`, day, date:`2026-06-${String(day).padStart(2,'0')}`, templateId:'strength-foundation', mode:'normal', status:'completed', durationSeconds:700, activitySeconds:640, readiness:{ energy:'normal', soreness:'none', pain:'none', hasDumbbells:true, availableWeight:15 }, sets:[{ id:`session-${day}-set-1`, exerciseId:'goblet-squat', setNumber:1, reps:8, weight:15, rir:2, completed:true }], ...overrides }
}

function seedBlob(sessionCount: number) {
  const data = JSON.parse(JSON.stringify(createDefaultData())) as Record<string, unknown>
  ;(data.profile as Record<string, unknown>).onboardingComplete = true
  ;(data.profile as Record<string, unknown>).dumbbells = [10,15,25]
  data.sessions = Array.from({ length:sessionCount }, (_, index) => makeSession(index + 1))
  return data as { profile:Record<string, unknown>; sessions:ReturnType<typeof makeSession>[] } & Record<string, unknown>
}

describe('local data and import', () => {
  beforeEach(() => { localStorage.clear(); clearLoadFailure() })
  it('round trips valid challenge data', () => {
    const data=createDefaultData(); data.profile.onboardingComplete=true; data.profile.label='Test challenge'; saveData(data)
    expect(loadData()).toEqual(data)
    expect(parseImport(JSON.stringify(data))).toEqual(data)
  })
  it('defaults older saved readiness records to having dumbbells', () => {
    const data=createDefaultData()
    const legacy=JSON.parse(JSON.stringify(data))
    legacy.sessions=[{id:'legacy',day:1,date:'2026-07-12',templateId:'assessment',mode:'normal',status:'completed',durationSeconds:600,readiness:{energy:'normal',soreness:'none',pain:'none',availableWeight:10,minutes:10},sets:[]}]
    expect(parseImport(JSON.stringify(legacy)).sessions[0].readiness.hasDumbbells).toBe(true)
  })
  it('repairs the one-session stale Day 1 resume without requiring a manual import', () => {
    const data=createDefaultData(); data.profile.onboardingComplete=true; data.profile.startDate='2026-07-12'; data.bodyWeights=[{date:'2026-07-12',weightLb:140}]
    const sunday=new Date(2026,6,12,19,24).getTime(), monday=new Date(2026,6,13,19,8).getTime()
    data.sessions=[makeSession(1,{id:`2026-07-13-d1-${monday}`,date:'2026-07-12',templateId:'assessment',activitySeconds:600,sets:[
      {...makeSession(1).sets[0],id:`strength-primer-1-${sunday}`,exerciseId:'strength-primer'},
      {...makeSession(1).sets[0],id:`incline-pushup-1-${monday}`,exerciseId:'incline-pushup'},
    ]}) as unknown as SessionLog]
    data.assessments=[{id:'a1',date:'2026-07-12',day:1,metric:'clean repetitions',value:10,unit:'reps',exerciseId:'incline-pushup'}]
    saveData(data)
    const repaired=loadData()
    expect(repaired.profile.startDate).toBe('2026-07-13')
    expect(repaired.sessions[0].date).toBe('2026-07-13')
    expect(repaired.assessments[0].date).toBe('2026-07-13')
    expect(repaired.bodyWeights[0].date).toBe('2026-07-13')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).profile.startDate).toBe('2026-07-13')
  })
  it('does not rewrite an ordinary short workout that crosses midnight', () => {
    const data=createDefaultData(); data.profile.onboardingComplete=true; data.profile.startDate='2026-07-12'
    const beforeMidnight=new Date(2026,6,12,23,58).getTime(), afterMidnight=new Date(2026,6,13,0,5).getTime()
    data.sessions=[makeSession(1,{id:`2026-07-13-d1-${afterMidnight}`,date:'2026-07-12',templateId:'assessment',activitySeconds:600,sets:[
      {...makeSession(1).sets[0],id:`strength-primer-1-${beforeMidnight}`,exerciseId:'strength-primer'},
      {...makeSession(1).sets[0],id:`incline-pushup-1-${afterMidnight}`,exerciseId:'incline-pushup'},
    ]}) as unknown as SessionLog]
    saveData(data)
    expect(loadData().profile.startDate).toBe('2026-07-12')
    expect(loadData().sessions[0].date).toBe('2026-07-12')
  })
  it.each(['not json','{}','{"version":2}'])('rejects malformed or unsupported input without mutating storage', (raw) => {
    const original=createDefaultData(); saveData(original)
    expect(()=>parseImport(raw)).toThrow()
    expect(loadData()).toEqual(original)
  })
  it('explains that a newer-version backup needs an app update', () => {
    expect(()=>parseImport(JSON.stringify({version:2,sessions:[]}))).toThrow(/newer version of Ten Strong/)
  })
  it('points at the first broken field when a backup fails structurally', () => {
    const blob=seedBlob(1); blob.sessions[0].sets=[{...makeSession(1).sets[0],rir:9}]
    expect(()=>parseImport(JSON.stringify(blob))).toThrow(/rir/)
  })
  it('quotes CSV fields safely', () => {
    const data=createDefaultData()
    expect(sessionsToCsv(data)).toContain('"date","challenge_day"')
  })
  it('escapes profile text in the printable summary', () => {
    const data=createDefaultData(); data.profile.label='<script>alert(1)</script>'
    const html=summaryToHtml(data)
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
  it('creates an optional recurring calendar cue without trusting profile text', () => {
    const data=createDefaultData(); data.profile.startDate='2026-07-12'; data.profile.preferredTime='Morning'; data.profile.habitAnchor='After coffee;\nthen move'
    const reminder=habitReminderToIcs(data)
    expect(reminder).toContain('DTSTART:20260712T080000')
    expect(reminder).toContain('RRULE:FREQ=DAILY')
    expect(reminder).toContain('After coffee\\;\\nthen move')
  })
})

describe('load never destroys history', () => {
  beforeEach(() => { localStorage.clear(); clearLoadFailure() })
  it('recovers every valid session when one set has an out-of-range value', () => {
    const blob=seedBlob(59); blob.sessions[10].sets[0].rir=5
    const raw=JSON.stringify(blob); localStorage.setItem(STORAGE_KEY,raw)
    const loaded=loadData()
    expect(loaded.sessions).toHaveLength(59)
    expect(loaded.sessions[10].sets[0].rir).toBe(4)
    expect(loaded.profile.onboardingComplete).toBe(true)
    expect(loaded.profile.dumbbells).toEqual([10,15,25])
    expect(getLoadFailure()).toBeNull()
    expect(getRecoveryBlob()).toBe(raw)
  })
  it('drops only an individually-invalid session and keeps the rest', () => {
    const blob=seedBlob(5); (blob.sessions[2] as Record<string, unknown>).date=42
    localStorage.setItem(STORAGE_KEY,JSON.stringify(blob))
    const loaded=loadData()
    expect(loaded.sessions).toHaveLength(4)
    expect(loaded.sessions.map((session)=>session.id)).not.toContain('session-3')
    expect(getLoadFailure()).toBeNull()
  })
  it('drops only an individually-invalid set inside a session', () => {
    const blob=seedBlob(3); blob.sessions[1].sets=[makeSession(2).sets[0],{...makeSession(2).sets[0],id:undefined as unknown as string}]
    localStorage.setItem(STORAGE_KEY,JSON.stringify(blob))
    const loaded=loadData()
    expect(loaded.sessions).toHaveLength(3)
    expect(loaded.sessions[1].sets).toHaveLength(1)
  })
  it('recovers when the profile has an invalid leaf value', () => {
    const blob=seedBlob(4); blob.profile.weightLb=0
    localStorage.setItem(STORAGE_KEY,JSON.stringify(blob))
    const loaded=loadData()
    expect(loaded.sessions).toHaveLength(4)
    expect(loaded.profile.weightLb).toBeGreaterThan(0)
    expect(loaded.profile.onboardingComplete).toBe(true)
    expect(getLoadFailure()).toBeNull()
  })
  it('quarantines a truncated blob before returning defaults and exposes the failure', () => {
    const raw=JSON.stringify(seedBlob(20)).slice(0,-40)
    localStorage.setItem(STORAGE_KEY,raw)
    const loaded=loadData()
    expect(loaded.sessions).toEqual([])
    expect(loaded.profile.onboardingComplete).toBe(false)
    expect(getRecoveryBlob()).toBe(raw)
    expect(getLoadFailure()).toEqual({ message:'Your saved data could not be read.', hasRecoveryCopy:true })
  })
  it('never overwrites an existing recovery copy with an emptier one', () => {
    const bigRaw=JSON.stringify(seedBlob(40))
    localStorage.setItem(RECOVERY_KEY,bigRaw)
    localStorage.setItem(STORAGE_KEY,'x{')
    loadData()
    expect(getRecoveryBlob()).toBe(bigRaw)
  })
  it('replaces an older smaller quarantine with a newer larger blob', () => {
    localStorage.setItem(RECOVERY_KEY,'x{')
    const raw=JSON.stringify(seedBlob(10)).slice(0,-5)
    localStorage.setItem(STORAGE_KEY,raw)
    loadData()
    expect(getRecoveryBlob()).toBe(raw)
  })
})

describe('reset and backup plumbing', () => {
  beforeEach(() => { localStorage.clear(); clearLoadFailure() })
  it('clearDrafts removes every draft key and nothing else', () => {
    localStorage.setItem('ten-strong-draft-d5-db','{}'); localStorage.setItem('ten-strong-draft-d20-bw','{}'); localStorage.setItem('ten-strong-draft-d3','{}'); localStorage.setItem('unrelated-key','keep')
    clearDrafts()
    expect(localStorage.getItem('ten-strong-draft-d5-db')).toBeNull()
    expect(localStorage.getItem('ten-strong-draft-d20-bw')).toBeNull()
    expect(localStorage.getItem('ten-strong-draft-d3')).toBeNull()
    expect(localStorage.getItem('unrelated-key')).toBe('keep')
  })
  it('clearData removes the challenge data and all draft keys', () => {
    saveData(createDefaultData()); localStorage.setItem('ten-strong-draft-d5-db','{}')
    clearData()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem('ten-strong-draft-d5-db')).toBeNull()
  })
  it('exportBackup stamps lastBackupAt in both the file content and the returned data', () => {
    const today=formatISODate(new Date())
    const {content,data}=exportBackup(createDefaultData())
    expect(data.lastBackupAt).toBe(today)
    expect(JSON.parse(content).lastBackupAt).toBe(today)
    expect(markBackedUp(createDefaultData()).lastBackupAt).toBe(today)
    expect(parseImport(content).lastBackupAt).toBe(today)
  })
})

describe('AppStateProvider durability behavior', () => {
  beforeEach(() => { localStorage.clear(); clearLoadFailure() })
  afterEach(() => cleanup())
  const mount=()=>renderHook(()=>useAppState(),{wrapper:AppStateProvider})

  it('does not overwrite an unreadable blob until the user continues fresh', () => {
    const raw=JSON.stringify(seedBlob(20)).slice(0,-40)
    localStorage.setItem(STORAGE_KEY,raw)
    const {result}=mount()
    expect(result.current.loadFailure).not.toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
    expect(getRecoveryBlob()).toBe(raw)
    act(()=>result.current.dismissLoadFailure())
    expect(result.current.loadFailure).toBeNull()
    expect(getRecoveryBlob()).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).profile.onboardingComplete).toBe(false)
  })
  it('skips the mount write when nothing changed, but bumps a stale lastOpenedDate', () => {
    const data=createDefaultData(); saveData(data)
    const setItem=vi.spyOn(Storage.prototype,'setItem')
    const first=mount()
    expect(setItem).not.toHaveBeenCalled()
    first.unmount(); setItem.mockRestore()
    const stale={...createDefaultData(),lastOpenedDate:'2026-06-01'}; saveData(stale)
    mount()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).lastOpenedDate).toBe(formatISODate(new Date()))
  })
  it('merges body weights on re-onboarding instead of wiping history', () => {
    const data=createDefaultData(); data.profile.onboardingComplete=true; data.bodyWeights=[{date:'2026-06-01',weightLb:185},{date:'2026-06-20',weightLb:180}]; saveData(data)
    const {result}=mount()
    act(()=>result.current.completeOnboarding({...result.current.data.profile,dumbbells:[10,15]}))
    expect(result.current.data.bodyWeights).toEqual([{date:'2026-06-01',weightLb:185},{date:'2026-06-20',weightLb:180}])
    expect(result.current.data.profile.dumbbells).toEqual([10,15])
  })
  it('seeds a single body weight on first onboarding when history is empty', () => {
    const {result}=mount()
    act(()=>result.current.completeOnboarding({...result.current.data.profile,weightLb:172,startDate:'2026-07-12'}))
    expect(result.current.data.bodyWeights).toEqual([{date:'2026-07-12',weightLb:172}])
  })
  it('restartChallenge seeds body weight from the latest logged entry, keeps equipment, clears cue confirmations and drafts', () => {
    const data=createDefaultData(); data.profile.onboardingComplete=true; data.profile.weightLb=142; data.profile.dumbbells=[10,15,25]; data.profile.cueConfirmedThrough='2026-06-30'; data.bodyWeights=[{date:'2026-04-01',weightLb:142},{date:'2026-06-20',weightLb:140}]; data.sessions=[makeSession(5) as unknown as SessionLog]; saveData(data)
    localStorage.setItem('ten-strong-draft-d5-db','{}')
    const {result}=mount()
    act(()=>result.current.restartChallenge('2026-07-12'))
    expect(result.current.data.sessions).toEqual([])
    expect(result.current.data.bodyWeights).toEqual([{date:'2026-07-12',weightLb:140}])
    expect(result.current.data.profile.weightLb).toBe(140)
    expect(result.current.data.profile.dumbbells).toEqual([10,15,25])
    expect(result.current.data.profile.cueConfirmedThrough).toBeUndefined()
    expect(result.current.data.profile.onboardingComplete).toBe(true)
    expect(localStorage.getItem('ten-strong-draft-d5-db')).toBeNull()
  })
  it('logging a body weight also updates the profile weight', () => {
    const data=createDefaultData(); data.profile.onboardingComplete=true; saveData(data)
    const {result}=mount()
    act(()=>result.current.addBodyWeight({date:'2026-07-12',weightLb:151}))
    expect(result.current.data.profile.weightLb).toBe(151)
  })
  it('completing a session before the start date pulls the start date back', () => {
    const data=createDefaultData(); data.profile.onboardingComplete=true; data.profile.startDate='2026-07-13'; saveData(data)
    const {result}=mount()
    act(()=>result.current.addSession(makeSession(1,{date:'2026-07-12'}) as unknown as SessionLog))
    expect(result.current.data.profile.startDate).toBe('2026-07-12')
    act(()=>result.current.addSession(makeSession(2,{date:'2026-07-13'}) as unknown as SessionLog))
    expect(result.current.data.profile.startDate).toBe('2026-07-12')
  })
  it('uses the first completed Day 1 as the lived challenge start', () => {
    const data=createDefaultData(); data.profile.onboardingComplete=true; data.profile.startDate='2026-07-12'; saveData(data)
    const {result}=mount()
    act(()=>result.current.addSession(makeSession(1,{date:'2026-07-13',templateId:'assessment'}) as unknown as SessionLog))
    expect(result.current.data.profile.startDate).toBe('2026-07-13')
    expect(result.current.data.sessions[0].date).toBe('2026-07-13')
  })
  it('adopts a newer valid write from another tab and ignores invalid ones', () => {
    saveData(createDefaultData())
    const {result}=mount()
    const other=createDefaultData(); other.profile.onboardingComplete=true; other.profile.label='From another tab'
    act(()=>{window.dispatchEvent(new StorageEvent('storage',{key:STORAGE_KEY,newValue:JSON.stringify(other)}))})
    expect(result.current.data.profile.label).toBe('From another tab')
    act(()=>{window.dispatchEvent(new StorageEvent('storage',{key:STORAGE_KEY,newValue:'garbage'}))})
    expect(result.current.data.profile.label).toBe('From another tab')
  })
})
