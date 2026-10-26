import { useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, Printer, Share2, UserX } from 'lucide-react';
import { Logo, EmptyState } from '../components/ui';
import { useStore } from '../store/store';
import EpkView from '../components/epk/EpkView';
import useKit from '../components/epk/useKit';
import { EPK_TEMPLATES, isTemplate, savedTemplate } from '../lib/epk';
import './epk.css';

/** Press kit page. Public (outside RequireAuth). `?t=classic|stage|minimal` picks the look; `?print=1` opens the print dialog. */
export default function Epk() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const { pushToast } = useStore();
  const { kit, loading, error } = useKit(id);
  const t = sp.get('t');
  const tpl = isTemplate(t) ? t : savedTemplate();
  const print = sp.get('print') === '1';

  useEffect(() => { if (print && kit) { const h = setTimeout(() => window.print(), 600); return () => clearTimeout(h); } return undefined; }, [print, kit]);
  useEffect(() => { document.title = kit ? `${kit.name} · Press kit` : 'Press kit'; }, [kit]);

  const share = async () => { try { await navigator.clipboard.writeText(location.href.replace(/[?&]print=1/, '')); } catch { /* ignore */ } pushToast('Press-kit link copied.'); };

  return (
    <div className="epk-page epk-page2">
      <div className="epk-bar epk-noprint">
        <Logo />
        <div className="epk-tools">
          {kit && EPK_TEMPLATES.map((x) => (
            <button key={x.id} className={`epk-chip${tpl === x.id ? ' on' : ''}`} onClick={() => setSp({ t: x.id }, { replace: true })}>{x.name}</button>
          ))}
          {kit && <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><Printer size={14} /> PDF</button>}
          {kit && <button className="btn btn-ghost btn-sm" onClick={share}><Share2 size={14} /> Share</button>}
          {kit && <Link className="btn btn-blue btn-sm" to={kit.profilePath}>Open in Gigset <ArrowRight size={14} /></Link>}
        </div>
      </div>
      {loading && <p className="epk-empty">Loading press kit…</p>}
      {!loading && (error || !kit) && (
        <article className="epk-sheet"><EmptyState icon={<UserX size={22} />} title="Press kit not found" text="This press kit doesn't exist or the profile isn't public." action={<Link className="btn btn-blue btn-sm" to="/">Back to Gigset</Link>} /></article>
      )}
      {kit && <div className="epk-stagewrap"><EpkView kit={kit} tpl={tpl} /></div>}
    </div>
  );
}
