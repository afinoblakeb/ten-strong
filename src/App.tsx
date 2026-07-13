import { Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppState } from './AppState'
import { Layout } from './components/Layout'
import { OnboardingPage } from './pages/OnboardingPage'
import { TodayPage } from './pages/TodayPage'
import { WorkoutPage } from './pages/WorkoutPage'
import { CalendarPage, ExerciseLibraryPage, MethodologyPage, MorePage, PlanPage, ProgressPage, RecoveryPage, SettingsPage } from './pages/ExplorePages'
import './styles/base.css'
import './styles/onboarding.css'
import './styles/today.css'
import './styles/workout.css'
import './styles/explore.css'

export function TitleManager() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  // Scroll instantly (never animated) on forward navigations only; POP (back/forward,
  // initial load) keeps the browser's restored scroll position.
  useEffect(() => { const label=pathname.split('/')[1] || 'today'; document.title=`${label[0]?.toUpperCase()}${label.slice(1)} · Ten Strong`; if (navigationType!=='POP') window.scrollTo({top:0,left:0,behavior:'instant'}) },[pathname,navigationType])
  return null
}

// Plain href="#main-content" collides with HashRouter (it navigates to the catch-all
// route). Focus the landmark directly instead and keep the router hash untouched.
export function SkipLink() {
  return <a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); const main=document.getElementById('main-content'); if (main) { main.setAttribute('tabindex','-1'); main.focus() } }}>Skip to main content</a>
}

function HomeRedirect() { const {data}=useAppState(); return <Navigate to={data.profile.onboardingComplete?'/today':'/onboarding'} replace/> }

export default function App() {
  return <><SkipLink/><TitleManager/><Routes><Route path="/onboarding" element={<OnboardingPage/>}/><Route path="/workout/:day" element={<WorkoutPage/>}/><Route element={<Layout/>}><Route path="/" element={<HomeRedirect/>}/><Route path="/today" element={<TodayPage/>}/><Route path="/calendar" element={<CalendarPage/>}/><Route path="/progress" element={<ProgressPage/>}/><Route path="/plan" element={<PlanPage/>}/><Route path="/exercises" element={<ExerciseLibraryPage/>}/><Route path="/recovery" element={<RecoveryPage/>}/><Route path="/methodology" element={<MethodologyPage/>}/><Route path="/settings" element={<SettingsPage/>}/><Route path="/more" element={<MorePage/>}/><Route path="*" element={<HomeRedirect/>}/></Route></Routes></>
}
