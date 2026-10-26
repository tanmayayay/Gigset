import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Printer, Sparkles } from 'lucide-react';
import { Modal } from '../ui';
import { useStore } from '../../store/store';
import EpkView from './EpkView';
import useKit from './useKit';
import { EPK_TEMPLATES, EPK_SECTIONS, buildEpk, readEdits, editsToDetail, savedTemplate, saveTemplate, epkUrl } from '../../lib/epk';
import { Profiles } from '../../lib/api';

/** Template picker with live miniature previews. Reused by the generator and the booking flow. */
export function TemplatePicker({ kit, value, onChange }) {
  return (
    <div className="ekm-tpls" role="radiogroup" aria-label="Press kit template">
      {EPK_TEMPLATES.map((t) => (
        <button key={t.id} type="button" role="radio" aria-checked={value === t.id} className={`ekm-tpl${value === t.id ? ' on' : ''}`} onClick={() => onChange(t.id)}>
          <span className="ekm-thumb"><span className="ekm-scale"><EpkView kit={kit} tpl={t.id} compact /></span></span>
          <b>{t.name}{value === t.id && <Check size={14} />}</b>
          <small>{t.blurb}</small>
        </button>
      ))}
    </div>
  );
}

export function StrengthMeter({ strength }) {
  return (
    <div className="ekm-strength">
      <div className="ekm-bar"><i style={{ width: `${strength.pct}%` }} /></div>
      <p><b>{strength.pct}% complete.</b> {strength.tips.length ? `Add: ${strength.tips.slice(0, 3).join(' · ')}.` : 'Your press kit is fully loaded.'}</p>
    </div>
  );
}

const SWATCHES = ['#5B86F5', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#111111'];

/** "Generate EPK": built from the profile, with a Template tab and (for the owner) an Edit tab. */
export default function EpkModal({ personId, person: given, onClose }) {
  const { userId, pushToast, refreshProfile } = useStore();
  const { kit: baseKit, person, reviews, loading } = useKit(personId, given);
  const mine = personId === userId;
  const [tab, setTab] = useState('template');
  const [tpl, setTpl] = useState(savedTemplate);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const edits = draft || (person ? readEdits(person.detail?.data) : null);
  const kit = useMemo(() => (person ? buildEpk(person, { reviews, edits }) : baseKit), [person, reviews, edits, baseKit]);
  const set = (patch) => setDraft({ ...edits, ...patch });
  const pick = (t) => { setTpl(t); saveTemplate(t); };
  const link = epkUrl(personId, tpl);
  const copy = async () => { try { await navigator.clipboard.writeText(link); pushToast('Press-kit link copied.'); } catch { pushToast(link); } };
  const print = () => { window.open(`${link}${link.includes('?') ? '&' : '?'}print=1`, '_blank', 'noopener'); };

  const save = async () => {
    setSaving(true);
    try {
      const keep = Object.fromEntries(Object.entries(person.detail?.data || {}).filter(([k]) => !/^epk[A-Z]/.test(k)));
      await Profiles.update(person.id, { detail: { ...keep, ...editsToDetail(edits) } });
      await refreshProfile?.();
      pushToast('Press kit saved.');
      setDraft(null);
      setTab('template');
    } catch (e) { pushToast(e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Modal title="Press kit" onClose={onClose} wide>
      {loading || !kit ? <p className="muted">Building the press kit…</p> : (
        <div className="ekm">
          <p className="ekm-lead"><Sparkles size={15} /> {mine ? 'Generated from your profile. Pick a look, or edit anything.' : 'Generated from their profile.'}</p>
          <StrengthMeter strength={kit.strength} />
          {mine && <div className="ekm-tabs"><button className={tab === 'template' ? 'on' : ''} onClick={() => setTab('template')}>Template</button><button className={tab === 'edit' ? 'on' : ''} onClick={() => setTab('edit')}>Edit</button></div>}

          {tab === 'template' || !mine ? (
            <>
              <h4 className="ekm-h">Choose a template</h4>
              <TemplatePicker kit={kit} value={tpl} onChange={pick} />
              <div className="ekm-actions">
                <a className="btn btn-blue" href={`#/epk/${personId}?t=${tpl}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Open full size</a>
                <button className="btn btn-ghost" onClick={copy}><Copy size={15} /> Copy link</button>
                <button className="btn btn-ghost" onClick={print}><Printer size={15} /> Save as PDF</button>
                {draft && mine && <button className="btn btn-ghost" onClick={() => setTab('edit')}>Unsaved edits</button>}
              </div>
            </>
          ) : (
            <div className="ekm-form">
              <label>Headline<input maxLength={120} value={edits.headline} onChange={(e) => set({ headline: e.target.value })} placeholder={kit.headline} /></label>
              <label>Bio<textarea maxLength={590} value={edits.about} onChange={(e) => set({ about: e.target.value })} placeholder={kit.about} /><small>Leave blank to use your profile bio.</small></label>
              <label>Tags (comma separated)<input value={edits.tags.join(', ')} onChange={(e) => set({ tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 10) })} placeholder="Techno, House, Live set" /></label>
              <label>Highlights (one per line, up to 6)<textarea value={edits.milestones.join('\n')} onChange={(e) => set({ milestones: e.target.value.split('\n').slice(0, 6) })} placeholder={'Opened for a big name\nHeadlined a sold-out night'} /></label>
              <div className="ekm-two">
                <label>Booking email<input type="email" maxLength={120} value={edits.email} onChange={(e) => set({ email: e.target.value })} placeholder="bookings@you.com" /></label>
                <label>Phone<input maxLength={40} value={edits.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+91 …" /></label>
              </div>
              <label>Accent colour<div className="ekm-swatches">{SWATCHES.map((c) => <button key={c} type="button" aria-label={c} className={(edits.accent || '') === c ? 'on' : ''} style={{ background: c }} onClick={() => set({ accent: c })} />)}<button type="button" className={!edits.accent ? 'on' : ''} style={{ background: 'conic-gradient(#5B86F5,#ec4899,#f59e0b,#10b981,#5B86F5)' }} aria-label="Default colour" onClick={() => set({ accent: '' })} /></div></label>
              <label>Show these sections<div className="ekm-checks">{EPK_SECTIONS.map(([id, name]) => (
                <label key={id}><input type="checkbox" checked={!edits.hide.includes(id)} onChange={(e) => set({ hide: e.target.checked ? edits.hide.filter((h) => h !== id) : [...edits.hide, id] })} />{name}</label>
              ))}</div></label>
              <div className="ekm-actions">
                <button className="btn btn-blue" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save press kit'}</button>
                <button className="btn btn-ghost" onClick={() => { setDraft(null); setTab('template'); }}>Discard</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
