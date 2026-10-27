import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, ExternalLink, Lock, UserPlus, UserCheck, FileText, Send } from 'lucide-react';
import { Avatar, Verified } from '../ui';
import { Profiles, Convos, Collabs } from '../../lib/api';
import { metaFor, roleLabel } from '../../lib/profileSchema';
import { savedTemplate, saveTemplate } from '../../lib/epk';
import { VIBES } from '../../lib/collab';
import EpkModal, { TemplatePicker } from '../epk/EpkModal';
import useKit from '../epk/useKit';
import { useStore } from '../../store/store';
import '../profile/profile.css';

/** Opens when you arrive from a profile or the Collab lists: a relaxed way to ask someone to make something with you. */
export default function BookPanel({ id, onClose, onSent }) {
  const { userId, pushToast } = useStore();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [missing, setMissing] = useState(false);
  const [vibe, setVibe] = useState('JAM');
  const [note, setNote] = useState('');
  const [tpl, setTpl] = useState(savedTemplate);
  const [showTpl, setShowTpl] = useState(false);
  const [epkOpen, setEpkOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { kit } = useKit(userId);

  useEffect(() => {
    let alive = true;
    setPerson(null); setMissing(false); setSent(false);
    Profiles.get(id).then((p) => { if (alive) { setPerson(p); setNote(`Hey ${p.name.split(' ')[0]}! I'd love to make something together. Are you up for it?`); } }).catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [id]);

  const message = async () => {
    try { const c = await Convos.open(id); navigate('/messages?c=' + c.id); }
    catch (e) { pushToast(e.message, 'error'); }
  };
  const follow = async () => {
    setBusy(true);
    try { await (person.relation?.iFollow ? Profiles.unfollow(id) : Profiles.follow(id)); setPerson(await Profiles.get(id)); }
    catch (e) { pushToast(e.message, 'error'); } finally { setBusy(false); }
  };
  const send = async () => {
    setBusy(true);
    try { await Collabs.create({ hostId: id, vibe, note, epkTemplate: tpl }); setSent(true); onSent?.(); }
    catch (e) { pushToast(e.message, 'error'); } finally { setBusy(false); }
  };

  if (missing) return null;
  if (!person) return <div className="pf-card" style={{ marginBottom: 16 }}><div className="shimmer-strip" style={{ height: 90, borderRadius: 12 }} /></div>;

  const meta = metaFor(person.stakeholderType);
  const self = person.id === userId;
  const first = person.name.split(' ')[0];
  return (
    <div className="pf-card collab-book" style={{ '--pf-tint': meta.tint, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Avatar name={person.name} src={person.avatarUrl} size={48} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <b style={{ display: 'flex', alignItems: 'center', gap: 5 }}>Collab with {person.name}{person.verificationStatus === 'VERIFIED' && <Verified size={14} />}</b>
          <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>{roleLabel(person.stakeholderType)}{person.city ? ` · ${person.city}` : ''}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={message}><MessageCircle size={14} /> Message</button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/profile/${person.id}`)}><ExternalLink size={14} /> Profile</button>
        <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
      </div>

      {self ? (
        <p style={{ margin: '12px 0 0', fontSize: 13.5, color: 'var(--text-faint)' }}>This is you. See your collab requests in the Requests tab.</p>
      ) : !person.relation?.connected ? (
        <div className="collab-lock">
          <Lock size={18} />
          <div><b>Collabs are for connections</b>
            <p>{person.relation?.followsMe ? `${first} follows you. Follow back to connect.` : person.relation?.iFollow ? `You follow ${first}. Once they follow you back you can send a collab request.` : `Follow ${first} and ask them to follow you back. Then you can make something together.`}</p></div>
          <button className="btn btn-blue btn-sm" disabled={busy || !userId} onClick={follow}>
            {person.relation?.iFollow ? <><UserCheck size={14} /> Requested</> : <><UserPlus size={14} /> {person.relation?.followsMe ? 'Follow back' : 'Connect'}</>}
          </button>
        </div>
      ) : sent ? (
        <div className="collab-sent">
          <b>Sent ✨</b>
          <p>{first} will see it in their Requests. If they are in, they will share a few times and you pick the one you like. Your chat opens when they say yes.</p>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Done</button>
        </div>
      ) : (
        <div className="collab-compose">
          <p className="collab-q">What are you up for?</p>
          <div className="vibes">{VIBES.map((v) => <button key={v.id} type="button" className={vibe === v.id ? 'on' : ''} onClick={() => setVibe(v.id)}><span>{v.emoji}</span>{v.label}</button>)}</div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} aria-label="Your message" />
          <div className="collab-epk">
            <FileText size={14} /> Your press kit goes along ·
            <button type="button" className="pfo-link" onClick={() => setShowTpl((v) => !v)}>{showTpl ? 'hide' : `${tpl === 'classic' ? 'Pop' : tpl === 'stage' ? 'Neon' : 'Mono'} · change`}</button>
            <button type="button" className="pfo-link" onClick={() => setEpkOpen(true)}>preview / edit</button>
          </div>
          {showTpl && kit && <TemplatePicker kit={kit} value={tpl} onChange={(t) => { setTpl(t); saveTemplate(t); }} />}
          <button className="btn btn-blue" disabled={busy || !note.trim()} onClick={send}><Send size={14} /> Send collab request</button>
        </div>
      )}
      {epkOpen && <EpkModal personId={userId} onClose={() => setEpkOpen(false)} />}
    </div>
  );
}
