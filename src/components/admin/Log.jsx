import { useEffect, useState } from 'react';
import { Admin } from '../../lib/api';
import { useStore } from '../../store/store';

const LABEL = { SUSPEND_USER: 'Suspended a person', UNSUSPEND_USER: 'Restored a person', SET_VERIFICATION: 'Changed verification', SET_FOUNDING: 'Made founding member', UNSET_FOUNDING: 'Removed founding badge', MAKE_ADMIN: 'Made someone admin', REMOVE_ADMIN: 'Removed admin access', MESSAGE_USER: 'Sent a message', DELETE_USER: 'Deleted an account', DELETE_POST: 'Deleted a post', REMOVE_COMMUNITY_POST: 'Hid a community post', RESTORE_COMMUNITY_POST: 'Restored a community post', CLOSE_OPPORTUNITY: 'Closed a gig', DELETE_OPPORTUNITY: 'Deleted a gig', ANNOUNCE: 'Published a banner', BROADCAST: 'Sent a notification', EXPORT_USERS: 'Downloaded the people list' };

export default function Log() {
  const { pushToast } = useStore();
  const [data, setData] = useState(null);
  useEffect(() => { Admin.audit({ take: 100 }).then(setData).catch((e) => pushToast(e.message, 'error')); }, [pushToast]);
  return (
    <div className="ad-stack">
      <div className="ad-row-head"><div><h2>Activity log</h2><p>Every admin action, who did it and when. It cannot be edited.</p></div></div>
      <div className="ad-list">
        {!data ? <div className="shimmer-strip" style={{ height: 140, borderRadius: 12 }} /> : data.items.length === 0 ? <p className="ad-empty">No admin actions yet.</p> : data.items.map((a) => (
          <div key={a.id} className="ad-item"><div className="ad-item-main"><b>{LABEL[a.action] || a.action.replace(/_/g, ' ').toLowerCase()}</b>{a.summary && <p>{a.summary}</p>}<span>{a.adminName} · {new Date(a.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span></div></div>
        ))}
      </div>
    </div>
  );
}
