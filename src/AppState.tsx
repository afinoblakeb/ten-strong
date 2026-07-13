import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppData, BodyWeightEntry, SessionLog, UserProfile } from './types'
import { createDefaultData, loadData, saveData } from './lib/storage'
import { formatISODate } from './lib/date'

interface AppStateValue {
  data: AppData
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

  useEffect(() => {
    try { saveData({ ...data, lastOpenedDate:formatISODate(new Date()) }) }
    catch { /* The current in-memory session remains usable if storage is unavailable. */ }
  }, [data])

  const value = useMemo<AppStateValue>(() => ({
    data,
    updateProfile:(profile) => setData((current) => ({ ...current, profile:{ ...current.profile, ...profile } })),
    completeOnboarding:(profile) => setData((current) => ({ ...current, profile:{ ...profile, onboardingComplete:true }, bodyWeights:profile.weightLb ? [{ date:profile.startDate, weightLb:profile.weightLb }] : [] })),
    addSession:(session) => setData((current) => {
      if (current.sessions.some((item) => item.id === session.id)) return current
      const assessmentSets = ['assessment','final-assessment'].includes(session.templateId) ? session.sets.filter((set) => set.completed).map((set) => ({ id:`${session.id}-${set.exerciseId}`, date:session.date, day:session.day, metric:set.reps !== undefined ? 'clean repetitions' : 'clean hold', value:set.reps ?? set.seconds ?? 0, unit:set.reps !== undefined ? 'reps' : 'seconds', exerciseId:set.exerciseId, weight:set.weight, variation:set.variation })) : []
      return { ...current, sessions:[...current.sessions.filter((item) => item.day !== session.day), session], assessments:[...current.assessments.filter((item) => item.day !== session.day), ...assessmentSets] }
    }),
    addBodyWeight:(entry) => setData((current) => ({ ...current, bodyWeights:[...current.bodyWeights.filter((item) => item.date !== entry.date), entry].sort((a,b) => a.date.localeCompare(b.date)) })),
    restartChallenge:(startDate) => setData((current) => ({ ...createDefaultData(), profile:{ ...current.profile, startDate, onboardingComplete:true }, bodyWeights:[{ date:startDate, weightLb:current.profile.weightLb }] })),
    replaceData:(next) => setData(next),
    resetData:() => setData(loadData()),
  }), [data])
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- provider and hook intentionally share this small module
export function useAppState() {
  const value = useContext(AppStateContext)
  if (!value) throw new Error('useAppState must be used inside AppStateProvider')
  return value
}
