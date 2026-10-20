import { useRef, useState } from 'react';
import { Field, withHttps } from './FieldInputs';
import { motion } from 'framer-motion';
import { Camera, X } from 'lucide-react';
import { Avatar } from '../ui';
import { Profiles } from '../../lib/api';
import { useStore } from '../../store/store';
import { uploadAvatar } from '../../lib/uploadImage';
import { CITIES } from '../../data/demo';
import { ROLE_META, ROLE_ORDER, metaFor, sectionsFor, roleLabel } from '../../lib/profileSchema';

/** Slide-over editor. The fields below "Basics" follow the role chosen at the top. */
export default function EditProfile({ person, onClose, onSaved }) {
  const { pushToast, authUser } = useStore();
  const [name, setName] = useState(person.name || '');
  const [role, setRole] = useState(person.stakeholderType);
  const [city, setCity] = useState(person.city || '');
  const [bio, setBio] = useState(person.bio || '');
  const [visibility, setVisibility] = useState(person.visibility || 'PUBLIC');
  const [avatarUrl, setAvatarUrl] = useState(person.avatarUrl || null);
  const [data, setData] = useState({ ...(person.detail?.data || {}) });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const meta = metaFor(role);
  const set = (key) => (v) => setData((d) => ({ ...d, [key]: v }));
  const roleChanged = role !== person.stakeholderType;

  const pickPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try { setAvatarUrl(await uploadAvatar(file, authUser?.id || person.id)); }
    catch (e) { pushToast(e.message || 'Photo upload failed.', 'error'); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!name.trim()) { pushToast('Please add your name.', 'error'); return; }
    setSaving(true);
    try {
      const detail = { ...data };
      for (const sec of sectionsFor(role)) for (const f of sec.fields) if (f.type === 'url') detail[f.key] = withHttps(detail[f.key]);
      await Profiles.update(person.id, { name: name.trim(), stakeholderType: role, city: city.trim(), bio: bio.trim(), visibility, avatarUrl, detail });
      await onSaved();
      pushToast('Profile updated.');
    } catch (e) {
      pushToast(e.message || 'Could not save your profile.', 'error');
      setSaving(false);
    }
  };

  return (
    <motion.div className="pf-sheet-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div className="pf-sheet" role="dialog" aria-modal="true" aria-label="Edit profile" initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
        <div className="pf-sheet-head">
          <h3>Edit profile</h3>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="pf-sheet-body" style={{ '--pf-tint': meta.tint }}>
          <section className="pf-sec">
            <h4>Basics</h4>
            <div className="pf-sec-grid">
              <div className="pf-photo-edit">
                <Avatar name={name || person.name} src={avatarUrl} size={72} />
                <div>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}><Camera size={14} /> {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Add photo'}</button>
                  {avatarUrl && <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => setAvatarUrl(null)}>Remove</button>}
                  <div className="pf-field"><div className="hint" style={{ marginTop: 6 }}>Square photos look best. JPG or PNG.</div></div>
                </div>
              </div>

              <div className="pf-field">
                <label htmlFor="pf-name">{role === 'PERFORMER' ? 'Artist / stage name' : role === 'VENUE' ? 'Venue name' : role === 'INSTITUTION' ? 'Institution name' : 'Name'}</label>
                <input id="pf-name" className="pf-input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="pf-field">
                <label>I am on Strings as</label>
                <div className="pf-roles">
                  {ROLE_ORDER.map((r) => {
                    const m = ROLE_META[r];
                    const Icon = m.icon;
                    return (
                      <button key={r} type="button" className={`pf-rolebtn${role === r ? ' on' : ''}`} style={{ '--c': m.tint }} onClick={() => setRole(r)} aria-pressed={role === r}>
                        <Icon size={16} /> {m.label}
                      </button>
                    );
                  })}
                </div>
                <div className="hint">{meta.blurb}</div>
              </div>
              {roleChanged && (
                <div className="pf-note">The fields below now follow <b>{roleLabel(role)}</b>. Answers you gave under your previous role are kept, so you can switch back anytime.</div>
              )}

              <div className="pf-field">
                <label htmlFor="pf-headline">Headline</label>
                <input id="pf-headline" className="pf-input" value={data.headline || ''} maxLength={100} placeholder={meta.headlineHint} onChange={(e) => set('headline')(e.target.value)} />
              </div>

              <div className="pf-field">
                <label htmlFor="pf-city">City</label>
                <input id="pf-city" className="pf-input" list="pf-cities" value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" />
                <datalist id="pf-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
              </div>

              <div className="pf-field">
                <label htmlFor="pf-bio">About</label>
                <textarea id="pf-bio" value={bio} maxLength={1000} placeholder={meta.bioHint} style={{ minHeight: 110 }} onChange={(e) => setBio(e.target.value)} />
                <div className="hint">{bio.length}/1000</div>
              </div>
            </div>
          </section>

          {sectionsFor(role).map((sec) => (
            <section className="pf-sec" key={`${role}-${sec.title}`}>
              <h4>{sec.title}</h4>
              <div className="pf-sec-grid">
                {sec.fields.map((f) => <Field key={f.key} f={f} value={data[f.key]} onChange={set(f.key)} />)}
              </div>
            </section>
          ))}

          <section className="pf-sec">
            <h4>Privacy</h4>
            <div className="pf-field">
              <label htmlFor="pf-vis">Who can see my profile</label>
              <select id="pf-vis" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                <option value="PUBLIC">Everyone on Strings (and search)</option>
                <option value="CONNECTIONS">Only people I connect with</option>
                <option value="PRIVATE">Only me</option>
              </select>
            </div>
          </section>
        </div>

        <div className="pf-sheet-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-blue" onClick={save} disabled={saving || uploading}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
