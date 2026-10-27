import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Bell, Trash2 } from 'lucide-react';
import { Admin } from '../../lib/api';
import { Confirm } from './People';
import { useStore } from '../../store/store';

const TONES = [['info', 'Blue (news)'], ['success', 'Green (good news)'], ['warning', 'Amber (heads up)']];

export default function Announce() {
  const { pushToast } = useStore();
  const [items, setItems] = useState(null);
  const [f, setF] = useState({ title: '', body: '', tone: 'info', hours: '' });
  const [b, setB] = useState({ title: '', body: '', type: '' });
  const [ask, setAsk] = useState(false);
  const load = useCallback(() => Admin.announcements().then((r) => setItems(r.items)).catch((e) => pushToast(e.message, 'error')), [pushToast]);
  useEffect(() => { load(); }, [load]);
  const post = async () => { try { await Admin.announce({ ...f, hours: Number(f.hours) || 0 }); setF({ title: '', body: '', tone: 'info', hours: '' }); pushToast('Banner is live.'); load(); } catch (e) { pushToast(e.message, 'error'); } };
  return (
    <div className="ad-stack">
      <div className="ad-row-head"><div><h2>Announcements</h2><p>Talk to everyone at once.</p></div></div>
      <section className="ad-card">
        <h3><Megaphone size={16} /> Banner at the top of the app</h3>
        <p className="ad-sub">Shows to everyone who opens Gigset until you switch it off. Good for launches, maintenance and thank-yous.</p>
        <div className="ad-form"><input className="ad-input" placeholder="Headline" maxLength={100} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <input className="ad-input" placeholder="More detail (optional)" maxLength={300} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
          <div className="ad-two"><select className="ad-input" value={f.tone} onChange={(e) => setF({ ...f, tone: e.target.value })}>{TONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <input className="ad-input" type="number" min="0" placeholder="Hide after … hours (blank = until I turn it off)" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></div>
          <button className="btn btn-blue btn-sm" disabled={!f.title.trim()} onClick={post}>Publish banner</button></div>
        {items?.length > 0 && <div className="ad-list" style={{ marginTop: 14 }}>{items.map((a) => (
          <div key={a.id} className={`ad-item${a.active ? '' : ' gone'}`}><div className="ad-item-main"><b>{a.title}</b>{a.body && <p>{a.body}</p>}<span>{a.active ? 'Showing now' : 'Off'}{a.expiresAt ? ` · until ${new Date(a.expiresAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : ''}</span></div>
            <div className="ad-item-act"><button className="btn btn-ghost btn-sm" onClick={() => Admin.setAnnouncement(a.id, !a.active).then(load)}>{a.active ? 'Turn off' : 'Turn on'}</button>
              <button className="btn btn-danger btn-sm" onClick={() => Admin.deleteAnnouncement(a.id).then(load)} aria-label="Delete"><Trash2 size={14} /></button></div></div>))}</div>}
      </section>
      <section className="ad-card">
        <h3><Bell size={16} /> Send a notification to people</h3>
        <p className="ad-sub">Lands in everyone's bell. Use sparingly.</p>
        <div className="ad-form"><input className="ad-input" placeholder="Title" maxLength={100} value={b.title} onChange={(e) => setB({ ...b, title: e.target.value })} />
          <textarea className="ad-input" placeholder="Message" maxLength={400} value={b.body} onChange={(e) => setB({ ...b, body: e.target.value })} />
          <select className="ad-input" value={b.type} onChange={(e) => setB({ ...b, type: e.target.value })}><option value="">Everyone</option><option value="PERFORMER">Artists only</option><option value="VENUE">Venues only</option><option value="BUYER">Buyers only</option><option value="CREW">Crew only</option><option value="INSTITUTION">Institutions only</option></select>
          <button className="btn btn-blue btn-sm" disabled={!b.title.trim()} onClick={() => setAsk(true)}>Send…</button></div>
      </section>
      {ask && <Confirm title="Send to everyone selected?" text={`"${b.title}" will be sent to ${b.type ? 'every ' + b.type.toLowerCase() + ' account' : 'every active account'}. This cannot be taken back.`} action="Send now" onClose={() => setAsk(false)}
        onYes={async () => { try { const r = await Admin.broadcast(b); pushToast(`Sent to ${r.sent} people.`); setB({ title: '', body: '', type: '' }); setAsk(false); } catch (e) { pushToast(e.message, 'error'); } }} />}
    </div>
  );
}
