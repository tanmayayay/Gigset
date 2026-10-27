import { useCallback, useEffect, useState } from 'react';
import { Check, EyeOff, ShieldOff, X } from 'lucide-react';
import { Admin } from '../../lib/api';
import { useStore } from '../../store/store';

const TABS = [['OPEN', 'Needs a look'], ['ACTIONED', 'Acted on'], ['DISMISSED', 'Dismissed']];
const WHAT = { USER: 'a person', POST: 'a post', MESSAGE: 'a message', OPPORTUNITY: 'a gig', COMMUNITY_POST: 'a community post', COMMUNITY_COMMENT: 'a community comment' };
const WHY = { SPAM: 'Spam', HARASSMENT: 'Harassment', FAKE: 'Fake account', INAPPROPRIATE: 'Inappropriate', SCAM: 'Scam', OTHER: 'Other' };

export default function Reports({ onCount }) {
  const { pushToast } = useStore();
  const [tab, setTab] = useState('OPEN');
  const [data, setData] = useState(null);
  const load = useCallback(() => { setData(null); Admin.reports({ status: tab, take: 40 }).then((r) => { setData(r); if (tab === 'OPEN') onCount?.(r.total); }).catch((e) => pushToast(e.message, 'error')); }, [tab, pushToast, onCount]);
  useEffect(() => { load(); }, [load]);
  const act = async (r, action) => { try { await Admin.resolveReport(r.id, action, r.authorId); pushToast('Done.'); load(); } catch (e) { pushToast(e.message, 'error'); } };
  return (
    <div className="ad-stack">
      <div className="ad-row-head"><div><h2>Reports</h2><p>Things members flagged. Look at what was reported, then pick one button.</p></div></div>
      <div className="ad-seg">{TABS.map(([v, l]) => <button key={v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)}>{l}</button>)}</div>
      <div className="ad-list">
        {!data ? <div className="shimmer-strip" style={{ height: 140, borderRadius: 12 }} /> : data.items.length === 0 ? <p className="ad-empty">{tab === 'OPEN' ? 'All clear. Nothing waiting.' : 'Nothing here.'}</p> : data.items.map((r) => (
          <div key={r.id} className="ad-item">
            <div className="ad-item-main">
              <b>{WHY[r.reason] || r.reason}: {WHAT[r.targetType] || r.targetType}</b>
              <p className="ad-quote">{r.gone ? 'This has already been removed.' : r.preview}</p>
              {r.details && <p>“{r.details}”</p>}
              <span>Reported by {r.reporter?.name} · {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
            {tab === 'OPEN' && (
              <div className="ad-item-act">
                {r.targetType !== 'USER' && r.targetType !== 'MESSAGE' && !r.gone && <button className="btn btn-danger btn-sm" onClick={() => act(r, 'HIDE')}><EyeOff size={14} /> Remove it</button>}
                {r.authorId && <button className="btn btn-danger btn-sm" onClick={() => act(r, 'SUSPEND')}><ShieldOff size={14} /> Suspend the person</button>}
                <button className="btn btn-ghost btn-sm" onClick={() => act(r, 'DISMISS')}><X size={14} /> It’s fine</button>
                <button className="btn btn-ghost btn-sm" onClick={() => act(r, 'REVIEWED')}><Check size={14} /> Mark seen</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
