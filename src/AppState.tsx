import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, BodyWeightEntry, SessionLog, UserProfile } from './types'
import { appDataSchema, clearDrafts, clearLoadFailure, clearRecoveryBlob, createDefaultData, getLoadFailure, loadData, saveData, STORAGE_KEY, type LoadFailure } from './lib/storage'
import { formatISODate } from './lib/date'
import { resolveTemplateById } from './data/program'

interface AppStateValue {
  data: AppData
  storageError: string | null
  loadFailure: LoadFailure | null
  dismissLoadFailure: () => void
  markBackedUp: () => void
  updateProfile: (profile: Partial<UserProfile>) => void
  completeOnboarding: (profile: UserProfile) => void
  addSession: (session: SessionLog) => void
  addBodyWeight: (entry: BodyWeightEntry) => void
  restartChallenge: (startDate: string) => void
  replaceData: (data: AppData) => void
  resetData: () => void
}

const AppStateContext = createContext<AppStateValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())
  const [loadFailure, setLoadFailure] = useState<LoadFailure | null>(() => getLoadFailure())
  const [storageError,setStorageError]=useState<string|null>(null)
  const pristine=useRef(data)

  useEffect(() => {
    if (loadFailure) return // never clobber an unread blob until the user acknowledges the failure
    const today=formatISODate(new Date())
    if (data === pristine.current && data.lastOpenedDate === today) return // avoid a churn write on mount when nothing actually changed
    try { saveData({ ...data, lastOpenedDate:today }); setStorageError(null) }
    catch { setStorageError('This browser could not save locally. Keep this tab open and export a JSON backup from Settings before closing it.') }
  }, [data,loadFailure])

  useEffect(() => {
    // Multi-tab: adopt what another tab just wrote so a stale tab never zombie-overwrites newer data.
    const onStorage=(event:StorageEvent)=>{
      if (event.key !== STORAGE_KEY || event.newValue === null) return
      try { const next=appDataSchema.parse(JSON.parse(event.newValue)); setData(next); setLoadFailure(null); clearLoadFailure() } catch { /* ignore writes that do not validate */ }
    }
    window.addEventListener('storage',onStorage)
    return () => window.removeEventListener('storage',onStorage)
  }, [])

  const value = useMemo<AppStateValue>(() => ({
    data,
    storageError,
    loadFailure,
    dismissLoadFailure:() => { clearLoadFailure(); clearRecoveryBlob(); setLoadFailure(null); try { saveData({ ...data, lastOpenedDate:formatISODate(new Date()) }) } catch { setStorageError('This browser could not save locally. Keep this tab open and export a JSON backup from Settings before closing it.') } },
    markBackedUp:() => setData((current) => ({ ...current, lastBackupAt:formatISODate(new Date()) })),
    updateProfile:(profile) => setData((current) => ({ ...current, profile:{ ...current.profile, ...profile } })),
    completeOnboarding:(profile) => setData((current) => ({ ...current, profile:{ ...profile, onboardingComplete:true }, bodyWeights:current.bodyWeights.length ? current.bodyWeights : (profile.weightLb ? [{ date:profile.startDate, weightLb:profile.weightLb }] : []) })),
    addSession:(session) => setData((current) => {
      if (current.sessions.some((item) => item.id === session.id)) return current
      const assessmentSets = resolveTemplateById(session.templateId)?.kind === 'assessment' ? session.sets.filter((set) => set.completed).map((set) => ({ id:`${session.id}-${set.exerciseId}`, date:session.date, day:session.day, metric:set.reps !== undefined ? 'clean repetitions' : 'clean hold', value:set.reps ?? set.seconds ?? 0, unit:set.reps !== undefined ? 'reps' : 'seconds', exerciseId:set.exerciseId, weight:set.weight, variation:set.variation, tempo:set.tempo })) : []
      const profile = session.date < current.profile.startDate ? { ...current.profile, startDate:session.date } : current.profile // started early: pull the challenge start back to lived reality
      return { ...current, profile, sessions:[...current.sessions.filter((item) => item.day !== session.day), session], assessments:[...current.assessments.filter((item) => item.day !== session.day), ...assessmentSets] }
    }),
    addBodyWeight:(entry) => setData((current) => { const bodyWeights=[...current.bodyWeights.filter((item) => item.date !== entry.date), entry].sort((a,b) => a.date.localeCompare(b.date)); const latest=bodyWeights.at(-1)!; return { ...current, bodyWeights, profile:current.profile.weightLb === latest.weightLb ? current.profile : { ...current.profile, weightLb:latest.weightLb } } }),
    restartChallenge:(startDate) => { clearDrafts(); setData((current) => { const weightLb=current.bodyWeights.at(-1)?.weightLb ?? current.profile.weightLb; return { ...createDefaultData(), profile:{ ...current.profile, weightLb, startDate, onboardingComplete:true, cueConfirmedThrough:undefined }, bodyWeights:weightLb ? [{ date:startDate, weightLb }] : [] } }) },
    replaceData:(next) => { clearLoadFailure(); setLoadFailure(null); setData(next) },
    resetData:() => { clearDrafts(); const next=loadData(); setLoadFailure(getLoadFailure()); setData(next) },
  }), [data,storageError,loadFailure])
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- provider and hook intentionally share this small module
export function useAppState() {
  const value = useContext(AppStateContext)
  if (!value) throw new Error('useAppState must be used inside AppStateProvider')
  return value
}
