import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import '@fontsource/manrope/latin-800.css'
import './index.css'
import { AppStateProvider } from './AppState'
import App from './App'

// autoUpdate only checks at page load; an installed iPhone PWA resumes from memory for
// days, so also re-check whenever the app becomes visible (plus a slow safety interval).
registerSW({ immediate:true, onRegisteredSW(_url, registration) {
  if (!registration) return
  document.addEventListener('visibilitychange', () => { if (document.visibilityState==='visible') registration.update().catch(()=>{}) })
  setInterval(() => { registration.update().catch(()=>{}) }, 60*60*1000)
} })

createRoot(document.getElementById('root')!).render(<StrictMode><HashRouter><AppStateProvider><App/></AppStateProvider></HashRouter></StrictMode>)
