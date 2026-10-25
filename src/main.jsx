import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import './future.css'
import App from './App.jsx'
import { warmUpApi, prefetchBoot } from './lib/api'
import { captureRef } from './lib/ref'

// Rebrand: carry saved local data over from the old "strings." keys, once.
try {
  Object.keys(localStorage).filter((k) => k.startsWith('strings.')).forEach((k) => {
    const nk = 'gigset.' + k.slice(8);
    if (localStorage.getItem(nk) === null) localStorage.setItem(nk, localStorage.getItem(k));
    localStorage.removeItem(k);
  });
} catch { /* storage unavailable */ }

captureRef() // remember ?ref=CODE from an invite link
warmUpApi()
prefetchBoot()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
