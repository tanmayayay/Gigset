import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { PageHead, EmptyState } from '../components/ui';
import { useStore } from '../store/store';
import { Notifs } from '../lib/api';
import { timeAgo, resolveNotifLink } from '../lib/format';

const FILTERS = [['all', 'All'], ['message', 'Messages'], ['follow', 'Connections'], ['application', 'Opportunities'], ['engagement', 'Engagement']];

export default function Notifications() {
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const navigate = useNavigate();
  const { pushToast } = useStore();

  const load = useCallback(async () => {
    try {
      const res = await Notifs.list();
      setItems(res.items || []);
    } catch (e) {
      pushToast(e.message, 'error');
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const list = items.filter((n) => filter === 'all' || n.type === filter);

  const markAll = async () => {
    try {
      await Notifs.markRead();
      load();
    } catch (e) {
      pushToast(e.message, 'error');
    }
  };

  const openNotif = async (n) => {
    if (!n.read) {
      try {
        await Notifs.markRead([n.id]);
      } catch {
        // non-fatal — still navigate
      }
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    navigate(resolveNotifLink(n.link, n));
  };

  return (
    <div>
      <PageHead
        title="Notifications"
        sub="Everything relevant to your profile, in one place."
        action={<button className="btn btn-ghost btn-sm" onClick={markAll}><CheckCheck size={14} /> Mark all read</button>}
      />
      <div className="filter-row">
        {FILTERS.map(([v, l]) => (
          <button key={v} className={`filter-chip${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Bell size={22} />} title="Nothing here" text={items.length === 0 ? "You're all caught up." : 'Try a different filter.'} />
      ) : list.map((n) => (
        <div
          key={n.id}
          className="post-card"
          style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', opacity: n.read ? 0.75 : 1 }}
          onClick={() => openNotif(n)}
        >
          {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', marginTop: 6, flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{n.title}</div>
            {n.body && <div style={{ fontSize: 13 }}>{n.body}</div>}
            <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{timeAgo(n.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
