import { useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, Printer, Share2, UserX } from 'lucide-react';
import { Logo, EmptyState } from '../components/ui';
import { useStore } from '../store/store';
import EpkView from '../components/epk/EpkView';
import useKit from '../components/epk/useKit';
import { ownerTemplate } from '../lib/epk';
import { useSeo, clip, SITE_URL } from '../lib/seo';
import './epk.css';

/** Press kit page. Public (outside RequireAuth). It always uses the look its owner chose; `?print=1` opens the print dialog. */
export default function Epk() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const { pushToast } = useStore();
  const { kit, person, loading, error } = useKit(id);
  const tpl = ownerTemplate(person);
  const print = sp.get('print') === '1';

  useEffect(() => { if (print && kit) { const h = setTimeout(() => window.print(), 600); return () => clearTimeout(h); } return undefined; }, [print, kit]);
  // Index only public, adult profiles that loaded; everything else asks search engines to skip it.
  const where = kit?.city ? ` in ${kit.city}` : '';
  useSeo(kit ? {
    title: `${kit.name} · ${kit.label}${where}`,
    description: clip(`${kit.headline && kit.headline !== kit.label ? `${kit.headline}. ` : ''}${kit.about}`),
    path: `/epk/${id}`,
    image: kit.avatarUrl || undefined,
    noindex: person?.seoIndex !== true,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': person?.stakeholderType === 'VENUE' ? 'MusicVenue' : 'Person',
      name: kit.name,
      url: `${SITE_URL}/epk/${id}`,
      ...(kit.avatarUrl ? { image: kit.avatarUrl } : {}),
      description: clip(kit.about, 300),
      ...(kit.city ? { address: { '@type': 'PostalAddress', addressLocality: kit.city, addressCountry: 'IN' } } : {}),
      ...(person?.stakeholderType === 'VENUE' ? {} : { jobTitle: kit.label }),
      ...(kit.links?.length ? { sameAs: kit.links.map((l) => l.href).filter((u) => /^https?:\/\//.test(u || '')) } : {}),
    },
  } : { title: 'Press kit', noindex: true });

  const share = async () => { try { await navigator.clipboard.writeText(location.href.replace(/[?&]print=1/, '')); } catch { /* ignore */ } pushToast('Press-kit link copied.'); };

  return (
    <div className="epk-page epk-page2">
      <div className="epk-bar epk-noprint">
        <Logo />
        <div className="epk-tools">
          {kit && <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><Printer size={14} /> PDF</button>}
          {kit && <button className="btn btn-ghost btn-sm" onClick={share}><Share2 size={14} /> Share</button>}
          {kit && <Link className="btn btn-blue btn-sm" to={kit.profilePath}>Open in TheGigSet <ArrowRight size={14} /></Link>}
        </div>
      </div>
      {loading && <p className="epk-empty">Loading press kit…</p>}
      {!loading && (error || !kit) && (
        <article className="epk-sheet"><EmptyState icon={<UserX size={22} />} title="Press kit not found" text="This press kit doesn't exist or the profile isn't public." action={<Link className="btn btn-blue btn-sm" to="/">Back to TheGigSet</Link>} /></article>
      )}
      {kit && <div className="epk-stagewrap"><EpkView kit={kit} tpl={tpl} /></div>}
    </div>
  );
}
