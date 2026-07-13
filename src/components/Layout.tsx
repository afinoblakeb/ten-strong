import { CalendarDays, ChartNoAxesColumnIncreasing, Dumbbell, MoreHorizontal } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

export function Layout() {
  const location = useLocation()
  const hideNav = location.pathname.startsWith('/workout') || location.pathname === '/onboarding'
  return <div className="app-shell">
    <header className="topbar"><NavLink to="/today" className="brand" aria-label="Ten Strong home"><span className="brand-mark">10</span><span>Ten Strong</span></NavLink><span className="privacy-pill">Private by default</span></header>
    <main id="main-content"><Outlet /></main>
    {!hideNav && <nav className="bottom-nav" aria-label="Primary">
      <NavLink to="/today"><Dumbbell/><span>Today</span></NavLink>
      <NavLink to="/calendar"><CalendarDays/><span>Calendar</span></NavLink>
      <NavLink to="/progress"><ChartNoAxesColumnIncreasing/><span>Progress</span></NavLink>
      <NavLink to="/more"><MoreHorizontal/><span>More</span></NavLink>
    </nav>}
  </div>
}
