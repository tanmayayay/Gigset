import { useState } from 'react';
import { ImagePlus, X, Plus, ShieldCheck } from 'lucide-react';
import { Modal } from '../ui';
import { Communities } from '../../lib/api';
import { useStore } from '../../store/store';
import { checkText } from '../../lib/moderation';
import { uploadPostImage } from '../../lib/uploadImage';
import { CommIcon } from './Bits';
import { CATEGORIES, FLAIRS, GRADIENTS, grad, RULES_DEFAULT } from './meta';

const CLEAN = 'Please keep it clean — abusive, hateful or adult language isn’t allowed on Gigset.';

export function PostComposer({ communities, initialId, onClose, onPosted }) {
  const { pushToast, userId, user } = useStore();
  const [gid, setGid] = useState(initialId || communities[0]?.id);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [flair, setFlair] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const dirty = !!(title.trim() || body.trim());
  const flagged = dirty && !(checkText(title).ok && checkText(body).ok);

  const pick = (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    if (!/^image\//.test(f.type)) return pushToast('Please choose an image.', 'error');
    setFile(f); setPreview(URL.createObjectURL(f));
  };
  const submit = async () => {
    if (title.trim().length < 3) return pushToast('Add a title (at least 3 characters).', 'error');
    if (flagged) return pushToast(CLEAN, 'error');
    setBusy(true);
    try {
      const mediaUrl = file ? await uploadPostImage(file, user?.authId || userId) : undefined;
      const p = await Communities.post(gid, { title: title.trim(), body: body.trim() || undefined, flair: flair || undefined, mediaUrl });
      pushToast('Posted.');
      onPosted(p);
    } catch (e) { pushToast(e.message, 'error'); setBusy(false); }
  };
  if (!communities.length) {
    return <Modal title="Create a post" onClose={onClose}><p style={{ color: 'var(--text-dim)', lineHeight: 1.6 }}>Join a community first, then you can post in it.</p></Modal>;
  }
  return (
    <Modal title="Create a post" onClose={onClose} wide>
      <label>Post to</label>
      <div className="cm-pick">
        {communities.map((c) => (
          <button key={c.id} className={gid === c.id ? 'on' : ''} onClick={() => setGid(c.id)}><CommIcon c={c} size={20} /> {c.name}</button>
        ))}
      </div>
      <label>Title</label>
      <input type="text" maxLength={200} placeholder="An interesting title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label>Text (optional)</label>
      <textarea rows={6} maxLength={10000} placeholder="What do you want to share or ask?" value={body} onChange={(e) => setBody(e.target.value)} />
      <label>Flair</label>
      <div className="cm-flairs">
        {FLAIRS.map((f) => <button key={f} className={flair === f ? 'on' : ''} onClick={() => setFlair(flair === f ? '' : f)}>{f}</button>)}
      </div>
      {preview ? (
        <div className="cm-attach"><img src={preview} alt="Selected" /><button onClick={() => { setFile(null); setPreview(null); }} aria-label="Remove photo"><X size={14} /></button></div>
      ) : (
        <label className="cm-addphoto"><ImagePlus size={16} /> Add a photo<input type="file" accept="image/*" hidden onChange={pick} /></label>
      )}
      {flagged && <div className="cm-warn"><ShieldCheck size={14} /> {CLEAN}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-blue btn-sm" disabled={busy || flagged || title.trim().length < 3} onClick={submit}>{busy ? 'Posting…' : 'Post'}</button>
      </div>
    </Modal>
  );
}

export function NewCommunityModal({ onClose, onCreated }) {
  const { pushToast } = useStore();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [color, setColor] = useState('indigo');
  const [rules, setRules] = useState(RULES_DEFAULT.map((r) => ({ ...r })));
  const [busy, setBusy] = useState(false);
  const flagged = !(checkText(name).ok && checkText(desc).ok && rules.every((r) => checkText(r.title + ' ' + r.body).ok));

  const create = async () => {
    if (name.trim().length < 3) return pushToast('Give your community a name (at least 3 characters).', 'error');
    if (flagged) return pushToast(CLEAN, 'error');
    setBusy(true);
    try { onCreated(await Communities.create({ name: name.trim(), desc: desc.trim() || undefined, category, color, rules: rules.filter((r) => r.title.trim()) })); }
    catch (e) { pushToast(e.message, 'error'); setBusy(false); }
  };
  return (
    <Modal title="Create a community" onClose={onClose} wide>
      <div className="cm-new-prev" style={{ background: grad(color) }}>
        <CommIcon c={{ name: name || 'G', color }} size={46} />
        <div><b>{name.trim() || 'Your community'}</b><span>{CATEGORIES.find((c) => c.id === category)?.label} · 1 member</span></div>
      </div>
      <label>Name</label>
      <input type="text" maxLength={40} placeholder="e.g. Mumbai Drummers" value={name} onChange={(e) => setName(e.target.value)} />
      <label>What&rsquo;s it about?</label>
      <textarea rows={3} maxLength={500} placeholder="Who should join, and what happens here?" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <label>Category</label>
      <div className="cm-flairs">
        {CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => <button key={c.id} className={category === c.id ? 'on' : ''} onClick={() => setCategory(c.id)}>{c.label}</button>)}
      </div>
      <label>Colour</label>
      <div className="cm-swatches">
        {Object.keys(GRADIENTS).map((k) => <button key={k} className={color === k ? 'on' : ''} style={{ background: grad(k) }} onClick={() => setColor(k)} aria-label={k} />)}
      </div>
      <label>Community rules</label>
      {rules.map((r, i) => (
        <div className="cm-rule-edit" key={i}>
          <input type="text" maxLength={80} placeholder={`Rule ${i + 1}`} value={r.title} onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
          <button className="cm-ghost" onClick={() => setRules(rules.filter((_, j) => j !== i))} aria-label="Remove rule"><X size={14} /></button>
        </div>
      ))}
      {rules.length < 8 && <button className="cm-ghost" onClick={() => setRules([...rules, { title: '', body: '' }])}><Plus size={14} /> Add a rule</button>}
      {flagged && <div className="cm-warn"><ShieldCheck size={14} /> {CLEAN}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-blue btn-sm" disabled={busy || flagged || name.trim().length < 3} onClick={create}>{busy ? 'Creating…' : 'Create community'}</button>
      </div>
    </Modal>
  );
}
