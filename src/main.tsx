import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AppStateProvider } from './AppState'
import App from './App'
import './index.css'

registerSW({ immediate:true })

createRoot(document.getElementById('root')!).render(<StrictMode><HashRouter><AppStateProvider><App/></AppStateProvider></HashRouter></StrictMode>)
