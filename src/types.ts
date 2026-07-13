export type Energy = 'low' | 'normal' | 'high'
export type Soreness = 'none' | 'mild' | 'significant'
export type Pain = 'none' | 'present'
export type SessionStatus = 'completed' | 'partial' | 'recovery' | 'missed'
export type SessionKind = 'strength' | 'recovery' | 'assessment'
export type MovementPattern = 'push' | 'pull' | 'squat' | 'hinge' | 'unilateral' | 'trunk' | 'carry' | 'recovery'

export interface UserProfile {
  label: string
  ageRange: string
  height: string
  weightLb: number
  trainingHistory: string
  activityLevel: string
  dumbbells: number[]
  limitations: string
  preferredTime: string
  habitAnchor: string
  hasSturdyChair: boolean
  startDate: string
  photoReminder: boolean
  onboardingComplete: boolean
}

export interface Exercise {
  id: string
  name: string
  pattern: MovementPattern
  equipment: string[]
  visual: 'push' | 'squat' | 'row' | 'hinge' | 'press' | 'lunge' | 'core' | 'carry' | 'mobility'
  cues: string[]
  mistakes: string[]
  warning: string
  regression: string
  standard: string
  progression: string
  noEquipment: string
  perSide?: boolean
}

export interface WorkoutItem {
  exerciseId: string
  sets: number
  repMin?: number
  repMax?: number
  seconds?: number
  tempo: string
  restSeconds: number
  note?: string
}

export interface WorkoutTemplate {
  id: string
  title: string
  focus: string
  kind: SessionKind
  equipment: string[]
  items: WorkoutItem[]
}

export interface Phase {
  id: number
  name: string
  start: number
  end: number
  intent: string
  effort: string
}

export interface ProgramDay {
  day: number
  phaseId: number
  templateId: string
  kind: SessionKind
  title: string
}

export interface Readiness {
  energy: Energy
  soreness: Soreness
  pain: Pain
  hasDumbbells: boolean
  availableWeight: number | null
  minutes: 5 | 10
}

export type RecommendationMode = 'normal' | 'reduced' | 'recovery' | 'minimum' | 'stop'

export interface Recommendation {
  mode: RecommendationMode
  title: string
  explanation: string
  setMultiplier: number
}

export interface SetLog {
  id: string
  exerciseId: string
  setNumber: number
  reps?: number
  seconds?: number
  weight?: number
  rir: number
  formQuality?: 'good' | 'degraded'
  variation?: string
  targetReps?: number
  targetSeconds?: number
  tempo?: string
  discomfort?: boolean
  note?: string
  completed: boolean
}

export interface SessionLog {
  id: string
  day: number
  date: string
  templateId: string
  mode: RecommendationMode
  status: SessionStatus
  durationSeconds: number
  readiness: Readiness
  recommendationExplanation?: string
  sets: SetLog[]
  note?: string
}

export interface AssessmentResult {
  id: string
  date: string
  day: number
  metric: string
  value: number
  unit: string
  exerciseId?: string
  weight?: number
  variation?: string
}

export interface BodyWeightEntry {
  date: string
  weightLb: number
}

export interface AppData {
  version: 1
  profile: UserProfile
  sessions: SessionLog[]
  assessments: AssessmentResult[]
  bodyWeights: BodyWeightEntry[]
  lastOpenedDate: string
}
