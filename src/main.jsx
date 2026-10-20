import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import './future.css'
import App from './App.jsx'
import { warmUpApi, prefetchBoot } from './lib/api'
import { captureRef } from './lib/ref'

captureRef() // remember ?ref=CODE from an invite link
warmUpApi()
prefetchBoot()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
