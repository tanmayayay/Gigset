import { useEffect, useRef, useState } from 'react';
import { Download, Copy, Share2, Link2 } from 'lucide-react';
import { Modal } from './ui';
import { Account } from '../lib/api';
import { drawShareCard } from '../lib/shareCard';
import { epkLink } from '../lib/ref';
import { useStore } from '../store/store';
import './growth.css';

/**
 * Share a profile (or a confirmed booking) as an image + link.
 * `card` is what to draw: { kind, person, facts, headline, founding, rating, booked }.
 * The link carries the sharer's invite code so new sign-ups are credited to them.
 */
export default function ShareModal({ card, onClose, title }) {
  const { pushToast } = useStore();
  const [code, setCode] = useState(null);
  const [blob, setBlob] = useState(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const made = useRef(0);

  const link = epkLink(card.person.id, code);

  // Fetch my invite code once, then draw the card with it baked into the QR.
  useEffect(() => {
    let alive = true;
    Account.referral().then((r) => { if (alive) setCode(r.code); }).catch(() => { if (alive) setCode(''); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (code === null) return undefined;
    let alive = true;
    const n = ++made.current;
    setBusy(true);
    setFailed(false);
    drawShareCard({ ...card, link })
      .then((b) => {
        if (!alive || n !== made.current) return;
        setBlob(b);
        setUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); });
      })
      .catch(() => { if (alive) setFailed(true); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const fileName = `gigset-${card.person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); pushToast('Link copied.'); } catch { pushToast('Could not copy. Long-press the link to copy it.', 'error'); }
  };
  const share = async () => {
    const text = card.kind === 'booked' ? 'Booked on Gigset' : `${card.person.name} on Gigset`;
    try {
      const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null;
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text, url: link });
      else if (navigator.share) await navigator.share({ title: text, text, url: link });
      else download();
    } catch (e) { if (e?.name !== 'AbortError') pushToast('Sharing was cancelled.', 'error'); }
  };

  return (
    <Modal title={title || 'Share'} onClose={onClose}>
      <div className="sh-body">
        <div className="sh-preview">
          {busy && <div className="shimmer-strip" style={{ position: 'absolute', inset: 0, borderRadius: 14 }} />}
          {url && !failed && <img src={url} alt="Share card preview" />}
          {failed && <p style={{ padding: 20, fontSize: 13, color: 'var(--text-dim)' }}>Could not draw the card. You can still share the link below.</p>}
        </div>
        <div className="sh-actions">
          {typeof navigator !== 'undefined' && navigator.share && <button className="btn btn-blue btn-sm" onClick={share} disabled={busy}><Share2 size={14} /> Share</button>}
          <button className={`btn btn-sm ${navigator.share ? 'btn-ghost' : 'btn-blue'}`} onClick={download} disabled={!url}><Download size={14} /> Save image</button>
          <button className="btn btn-ghost btn-sm" onClick={copy}><Copy size={14} /> Copy link</button>
        </div>
        <div className="sh-link"><Link2 size={14} /><span>{link.replace(/^https?:\/\//, '')}</span></div>
        <p className="sh-hint">Post it on Instagram or WhatsApp. Anyone who joins through your link is credited to you.</p>
      </div>
    </Modal>
  );
}
