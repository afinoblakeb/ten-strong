import { CalendarDays, ChartNoAxesColumnIncreasing, Dumbbell, MoreHorizontal } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAppState } from '../AppState'
import { downloadFile, getRecoveryBlob } from '../lib/storage'

function downloadRecoveredCopy() {
  const blob = getRecoveryBlob()
  if (blob) downloadFile('ten-strong-recovered-data.json', blob, 'application/json')
}

export function Layout() {
  const location = useLocation()
  const {storageError,loadFailure,dismissLoadFailure}=useAppState()
  const hideNav = location.pathname.startsWith('/workout') || location.pathname === '/onboarding'
  return <div className="app-shell">
    <header className="topbar"><NavLink to="/today" className="brand" aria-label="Ten Strong home"><span className="brand-mark">10</span><span>Ten Strong</span></NavLink><span className="privacy-pill">Private by default</span></header>
    <main id="main-content">
      {loadFailure && <div className="storage-warning recovery-banner" role="alert">
        <p><strong>Your saved data could not be read.</strong> {loadFailure.hasRecoveryCopy ? 'The unreadable copy is kept safe on this device. Download it now — it may be repairable, and you can also restore an exported backup from Settings.' : 'You can restore an exported backup from Settings.'} Nothing new will be saved until you choose how to continue.</p>
        <div className="button-stack">
          {loadFailure.hasRecoveryCopy && <button type="button" className="button secondary" onClick={downloadRecoveredCopy}>Download recovered data</button>}
          <button type="button" className="button secondary" onClick={() => { downloadRecoveredCopy(); dismissLoadFailure() }}>{loadFailure.hasRecoveryCopy ? 'Download and continue fresh' : 'Continue fresh'}</button>
        </div>
      </div>}
      {storageError&&<div className="storage-warning" role="alert">{storageError}</div>}
      <Outlet />
    </main>
    {!hideNav && <nav className="bottom-nav" aria-label="Primary">
      <NavLink to="/today"><Dumbbell/><span>Today</span></NavLink>
      <NavLink to="/calendar"><CalendarDays/><span>Calendar</span></NavLink>
      <NavLink to="/progress"><ChartNoAxesColumnIncreasing/><span>Progress</span></NavLink>
      <NavLink to="/more"><MoreHorizontal/><span>More</span></NavLink>
    </nav>}
  </div>
}
