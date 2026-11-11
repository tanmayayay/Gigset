import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Avatar, Verified, EmptyState } from './ui';
import { Profiles } from '../lib/api';
import { roleLabel } from '../lib/profileSchema';
import { useStore } from '../store/store';
import { Users } from 'lucide-react';

/** Who follows a person, or who they follow. `kind` is 'followers' | 'following'. */
export default function FollowList({ personId, name, kind, onClose }) {
  const { userId, pushToast } = useStore();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [mine, setMine] = useState(new Set());

  useEffect(() => {
    let alive = true;
    (kind === 'followers' ? Profiles.followersOf(personId) : Profiles.followingOf(personId))
      .then((r) => { if (alive) setItems(r.items || []); })
      .catch((e) => { if (alive) { setItems([]); pushToast(e.message || 'Could not load the list.', 'error'); } });
    if (userId) Profiles.following().then((r) => { if (alive) setMine(new Set((r.items || []).map((p) => p.id))); }).catch(() => {});
    return () => { alive = false; };
  }, [personId, kind, userId, pushToast]);

  const toggle = async (p) => {
    try {
      if (mine.has(p.id)) { await Profiles.unfollow(p.id); setMine((s) => { const n = new Set(s); n.delete(p.id); return n; }); }
      else { await Profiles.follow(p.id); setMine((s) => new Set(s).add(p.id)); }
    } catch (e) { pushToast(e.message, 'error'); }
  };

  const title = kind === 'followers' ? `Followers${name ? ` of ${name}` : ''}` : `${name ? `${name} follows` : 'Following'}`;
  return (
    <Modal title={title} onClose={onClose}>
      {items == null ? (
        <div className="shimmer-strip" style={{ height: 120, borderRadius: 12 }} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Users size={22} />} title={kind === 'followers' ? 'No followers yet' : 'Not following anyone yet'} text="" />
      ) : (
        <div className="fl-list">
          {items.map((p) => (
            <div className="fl-row" key={p.id}>
              <button className="fl-who" onClick={() => { onClose(); navigate(`/profile/${p.id}`); }}>
                <Avatar name={p.name} src={p.avatarUrl} size={40} />
                <span><b>{p.name}{p.verificationStatus === 'VERIFIED' && <Verified size={12} />}</b><small>{[roleLabel(p.stakeholderType), p.city].filter(Boolean).join(' · ')}</small></span>
              </button>
              {userId && p.id !== userId && (
                <button className={`btn btn-xs ${mine.has(p.id) ? 'btn-ghost' : 'btn-blue'}`} onClick={() => toggle(p)}>{mine.has(p.id) ? 'Following' : 'Follow'}</button>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
