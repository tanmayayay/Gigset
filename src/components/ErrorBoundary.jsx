import { Component } from 'react';

const RELOAD_KEY = 'gigset.chunkReload';
const isChunkError = (e) => /Loading chunk|dynamically imported module|Importing a module script failed|Failed to fetch/i.test(String(e?.message || e));

/* Catches render crashes so the app never goes blank.
   - A stale or missing page file (common right after a deploy) reloads once on its own.
   - Anything else shows a calm screen with a reload button and the error text. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error) {
    console.error('Gigset crashed:', error);
    if (!isChunkError(error)) return;
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (Date.now() - last > 30000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
      }
    } catch { /* storage unavailable */ }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const reset = () => { this.setState({ error: null }); };
    const hardReload = () => window.location.reload();
    const fresh = () => {
      try { Object.keys(localStorage).filter((k) => k.startsWith('sb-')).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
      window.location.hash = '#/';
      window.location.reload();
    };
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg, #050a18)', color: 'var(--text, #fff)', fontFamily: 'inherit' }}>
        <div style={{ maxWidth: 440, textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 8px' }}>Something went wrong</h2>
          <p style={{ opacity: 0.7, margin: '0 0 18px' }}>Gigset hit a snag loading this page. Your data is safe.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-blue" onClick={hardReload}>Reload</button>
            <button className="btn btn-ghost" onClick={reset}>Try again</button>
            <button className="btn btn-ghost" onClick={fresh}>Sign out and restart</button>
          </div>
          <pre style={{ marginTop: 20, fontSize: 11, opacity: 0.5, whiteSpace: 'pre-wrap', textAlign: 'left' }}>{String(error?.message || error).slice(0, 400)}</pre>
        </div>
      </div>
    );
  }
}
