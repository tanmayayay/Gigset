import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import './future.css'
import App from './App.jsx'
import { warmUpApi, prefetchBoot } from './lib/api'
import { captureRef } from './lib/ref'
import { installCrashReporting } from './lib/crash'

// Rebrand: carry saved local data over from the old "strings." keys, once.
try {
  Object.keys(localStorage).filter((k) => k.startsWith('strings.')).forEach((k) => {
    const nk = 'gigset.' + k.slice(8);
    if (localStorage.getItem(nk) === null) localStorage.setItem(nk, localStorage.getItem(k));
    localStorage.removeItem(k);
  });
} catch { /* storage unavailable */ }

// Old links used /#/path. Turn them into clean /path addresses before anything reads the URL.
// (Supabase sign-in links use #access_token=…, which start without a slash and are left alone.)
if (window.location.hash.startsWith('#/')) {
  window.history.replaceState(null, '', window.location.hash.slice(1) || '/')
}
// An old link opened while the site is already open only changes the hash: load the clean address.
window.addEventListener('hashchange', () => {
  if (window.location.hash.startsWith('#/')) window.location.replace(window.location.hash.slice(1) || '/')
})

installCrashReporting() // send errors from our own code to the server log
captureRef() // remember ?ref=CODE from an invite link
warmUpApi()
prefetchBoot()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
