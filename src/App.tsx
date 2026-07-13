import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppState } from './AppState'
import { Layout } from './components/Layout'
import { OnboardingPage } from './pages/OnboardingPage'
import { TodayPage } from './pages/TodayPage'
import { WorkoutPage } from './pages/WorkoutPage'
import { CalendarPage, ExerciseLibraryPage, MethodologyPage, MorePage, PlanPage, ProgressPage, RecoveryPage, SettingsPage } from './pages/ExplorePages'
import './App.css'

function TitleManager() {
  const { pathname } = useLocation()
  useEffect(() => { const label=pathname.split('/')[1] || 'today'; document.title=`${label[0]?.toUpperCase()}${label.slice(1)} · Ten Strong`; window.scrollTo(0,0) },[pathname])
  return null
}

function HomeRedirect() { const {data}=useAppState(); return <Navigate to={data.profile.onboardingComplete?'/today':'/onboarding'} replace/> }

export default function App() {
  return <><TitleManager/><Routes><Route path="/onboarding" element={<OnboardingPage/>}/><Route path="/workout/:day" element={<WorkoutPage/>}/><Route element={<Layout/>}><Route path="/" element={<HomeRedirect/>}/><Route path="/today" element={<TodayPage/>}/><Route path="/calendar" element={<CalendarPage/>}/><Route path="/progress" element={<ProgressPage/>}/><Route path="/plan" element={<PlanPage/>}/><Route path="/exercises" element={<ExerciseLibraryPage/>}/><Route path="/recovery" element={<RecoveryPage/>}/><Route path="/methodology" element={<MethodologyPage/>}/><Route path="/settings" element={<SettingsPage/>}/><Route path="/more" element={<MorePage/>}/><Route path="*" element={<HomeRedirect/>}/></Route></Routes></>
}
