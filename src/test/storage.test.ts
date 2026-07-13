import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultData, loadData, parseImport, saveData, sessionsToCsv, summaryToHtml } from '../lib/storage'

describe('local data and import', () => {
  beforeEach(() => localStorage.clear())
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
  it.each(['not json','{}','{"version":2}'])('rejects malformed or unsupported input without mutating storage', (raw) => {
    const original=createDefaultData(); saveData(original)
    expect(()=>parseImport(raw)).toThrow()
    expect(loadData()).toEqual(original)
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
})
