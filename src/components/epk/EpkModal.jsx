import { useState } from 'react';
import { Check, Copy, ExternalLink, Printer, Sparkles } from 'lucide-react';
import { Modal } from '../ui';
import { useStore } from '../../store/store';
import EpkView from './EpkView';
import useKit from './useKit';
import { EPK_TEMPLATES, savedTemplate, saveTemplate, epkUrl } from '../../lib/epk';

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

/** "Generate EPK": builds the kit from the profile, lets you pick a look, then share, print or open it. */
export default function EpkModal({ personId, person, onClose, onEditProfile }) {
  const { pushToast } = useStore();
  const { kit, loading } = useKit(personId, person);
  const [tpl, setTpl] = useState(savedTemplate);
  const pick = (t) => { setTpl(t); saveTemplate(t); };
  const link = epkUrl(personId, tpl);
  const copy = async () => { try { await navigator.clipboard.writeText(link); pushToast('Press-kit link copied.'); } catch { pushToast(link); } };
  const print = () => { window.open(`${epkUrl(personId, tpl)}${link.includes('?') ? '&' : '?'}print=1`, '_blank', 'noopener'); };

  return (
    <Modal title="Your press kit" onClose={onClose} wide>
      {loading || !kit ? <p className="muted">Building your press kit…</p> : (
        <div className="ekm">
          <p className="ekm-lead"><Sparkles size={15} /> Generated automatically from your profile. The more you add, the richer it gets.</p>
          <StrengthMeter strength={kit.strength} />
          <h4 className="ekm-h">Choose a template</h4>
          <TemplatePicker kit={kit} value={tpl} onChange={pick} />
          <div className="ekm-actions">
            <a className="btn btn-blue" href={`#/epk/${personId}?t=${tpl}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Open full size</a>
            <button className="btn btn-ghost" onClick={copy}><Copy size={15} /> Copy link</button>
            <button className="btn btn-ghost" onClick={print}><Printer size={15} /> Save as PDF</button>
            {onEditProfile && kit.strength.pct < 100 && <button className="btn btn-ghost" onClick={onEditProfile}>Improve my profile</button>}
          </div>
        </div>
      )}
    </Modal>
  );
}
