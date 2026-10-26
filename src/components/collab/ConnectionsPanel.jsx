import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Handshake, MessageCircle, FileText } from 'lucide-react';
import { Avatar, Verified, EmptyState } from '../ui';
import { Profiles, Convos } from '../../lib/api';
import { roleLabel } from '../../lib/profileSchema';
import { useStore } from '../../store/store';

/** Mutual follows. Collabs and bookings are only open between these people. */
export default function ConnectionsPanel({ onCollab }) {
  const { pushToast } = useStore();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  useEffect(() => {
    let alive = true;
    Profiles.connections().then((r) => { if (alive) setItems(r.items || []); }).catch((e) => { pushToast(e.message, 'error'); if (alive) setItems([]); });
    return () => { alive = false; };
  }, [pushToast]);

  const message = async (id) => { try { const c = await Convos.open(id); navigate('/messages?c=' + c.id); } catch (e) { pushToast(e.message, 'error'); } };

  if (!items) return <div className="shimmer-strip" style={{ height: 140, borderRadius: 14, marginTop: 14 }} />;
  if (items.length === 0) {
    return <EmptyState icon={<Handshake size={22} />} title="No connections yet" text="You connect with someone when you follow each other. Follow people you want to work with and ask them to follow back." action={<button className="btn btn-blue btn-sm" onClick={() => navigate('/discover')}>Find people</button>} />;
  }
  return (
    <div className="conn-grid" style={{ marginTop: 14 }}>
      {items.map((p) => (
        <div className="conn-card" key={p.id}>
          <div className="conn-top">
            <Avatar name={p.name} src={p.avatarUrl} size={44} />
            <div style={{ minWidth: 0 }}><b>{p.name}{p.verificationStatus === 'VERIFIED' && <Verified size={13} />}</b><span>{roleLabel(p.stakeholderType)}{p.city ? ` · ${p.city}` : ''}</span></div>
          </div>
          {p.bio && <p>{p.bio}</p>}
          <div className="conn-actions">
            <button className="btn btn-blue btn-sm" style={{ flex: 1 }} onClick={() => onCollab(p.id)}><FileText size={14} /> Collab + EPK</button>
            <button className="btn btn-ghost btn-sm" onClick={() => message(p.id)} aria-label={`Message ${p.name}`}><MessageCircle size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
