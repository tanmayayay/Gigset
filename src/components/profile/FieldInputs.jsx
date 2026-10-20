import { useState } from 'react';
import './profile.css';

export function TagsInput({ value = [], onChange, suggestions = [] }) {
  const [draft, setDraft] = useState('');
  const add = (raw) => {
    const t = raw.trim().replace(/,$/, '').trim();
    if (!t || value.some((v) => v.toLowerCase() === t.toLowerCase()) || value.length >= 30) { setDraft(''); return; }
    onChange([...value, t.slice(0, 80)]);
    setDraft('');
  };
  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 8);
  return (
    <>
      <div className="pf-tags">
        {value.map((t) => (
          <span key={t} className="pf-chip">{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((v) => v !== t))}>×</button></span>
        ))}
        <input
          value={draft}
          placeholder={value.length ? '' : 'Type and press Enter'}
          onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add(draft); }
            else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => add(draft)}
        />
      </div>
      {remaining.length > 0 && (
        <div className="pf-sugg">{remaining.map((s) => <button type="button" key={s} onClick={() => add(s)}>+ {s}</button>)}</div>
      )}
    </>
  );
}

export function Field({ f, value, onChange }) {
  const id = `pf-f-${f.key}`;
  if (f.type === 'toggle') {
    return (
      <label className="pf-switch" htmlFor={id}>
        <input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {f.label}
      </label>
    );
  }
  return (
    <div className="pf-field">
      <label htmlFor={id}>{f.label}</label>
      {f.type === 'tags' ? <TagsInput value={Array.isArray(value) ? value : []} onChange={onChange} suggestions={f.suggestions} />
        : f.type === 'longtext' ? <textarea id={id} value={value || ''} maxLength={600} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
        : f.type === 'select' ? (
          <select id={id} value={value || ''} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select…</option>
            {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : f.type === 'number' ? (
          <input id={id} className="pf-input" type="number" inputMode="numeric" min="0" max="1000000" value={value ?? ''} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
        ) : (
          <input id={id} className="pf-input" type={f.type === 'url' ? 'url' : 'text'} value={value || ''} maxLength={f.type === 'url' ? 300 : 200} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
        )}
    </div>
  );
}

export const withHttps = (v) => (typeof v === 'string' && v.trim() && !/^https?:\/\//i.test(v.trim()) ? `https://${v.trim()}` : v);
