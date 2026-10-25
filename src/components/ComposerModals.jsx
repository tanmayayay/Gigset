import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Modal, Avatar } from './ui';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/store';
import { CITIES } from '../data/demo';
import { Posts, Opps } from '../lib/api';
import './postcard.css';

/* Post composer — text + optional photo.
   Photos are downscaled on-device (max 1600px, JPEG) before upload, which
   keeps posts fast on mobile data, then stored in the public `post-media`
   Supabase bucket (see backend/post-media-storage.sql). */
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export async function downscale(file, maxDim = 1600, quality = 0.85) {
  if (file.type === 'image/gif') return file; // keep animation
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
}

export function PostModal({ onClose, startWithPhoto = false, prefill = '' }) {
  const { user, authUser, pushToast } = useStore();
  const [body, setBody] = useState(prefill);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    if (startWithPhoto) fileInput.current?.click();
  }, [startWithPhoto]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (f) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(f.type)) {
      pushToast('Please choose a JPG, PNG, WebP or GIF image.', 'error');
      return;
    }
    if (f.size > MAX_INPUT_BYTES) {
      pushToast('That image is over 15 MB — please pick a smaller one.', 'error');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const publish = async () => {
    if (!body.trim() && !file) { onClose(); return; }
    if (!user) { pushToast('Sign in to post.', 'error'); onClose(); return; }
    setSaving(true);
    try {
      let mediaUrl = null;
      if (file) {
        const small = await downscale(file);
        const ext = small.type === 'image/gif' ? 'gif' : 'jpg';
        const path = `${authUser?.id || user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from('post-media').upload(path, small, {
          contentType: small.type, cacheControl: '31536000',
        });
        if (error) throw new Error('Photo upload failed — the post-media storage bucket may not be set up yet.');
        mediaUrl = supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
      }
      // The backend requires a body; a photo-only post gets a light caption.
      await Posts.create({ body: body.trim() || '📸', mediaUrl });
      window.dispatchEvent(new Event('gigset:post-created'));
      onClose();
      pushToast('Posted.');
    } catch (e) {
      pushToast(e.message || 'Could not publish the post.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Create a post" onClose={onClose}>
      <div className="pm-author">
        <Avatar name={user?.name || 'You'} size={38} />
        <div><b>{user?.name}</b><span>Posting publicly</span></div>
      </div>
      <textarea
        className="pm-text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share a gig moment, a call-out, or what you're working on… use #tags to get discovered"
        maxLength={2000}
        autoFocus={!startWithPhoto}
        aria-label="Post text"
      />
      {preview ? (
        <div className="pm-preview">
          <img src={preview} alt="Selected photo preview" />
          <button className="pm-remove" onClick={() => { setFile(null); setPreview(null); }} aria-label="Remove photo">✕</button>
        </div>
      ) : (
        <div
          className={`pm-drop${dragOver ? ' over' : ''}`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0]); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()}
        >
          <ImageIcon size={22} />
          <b>Add a photo</b>
          <span>Drag & drop or click — posts with photos get far more reach</span>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <div className="modal-actions">
        <span className="pm-count">{body.length}/2000</span>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-blue btn-sm" onClick={publish} disabled={saving || (!body.trim() && !file)}>
          {saving ? (file ? 'Uploading…' : 'Publishing…') : 'Publish'}
        </button>
      </div>
    </Modal>
  );
}

/* Opportunity composer */
export function OppModal({ onClose }) {
  const { user, pushToast } = useStore();
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);

  const publish = async () => {
    if (!title.trim()) { onClose(); return; }
    if (!user) { pushToast('Sign in to post an opportunity.', 'error'); onClose(); return; }
    const text = details.trim();
    if (!text) { pushToast('Please add a short description of the opportunity.', 'error'); return; }
    setSaving(true);
    try {
      // The single details field feeds both backend text fields; the old
      // "type" select and free-text "budget" have no backend equivalent.
      await Opps.create({
        title: title.trim(),
        description: text,
        requirements: text,
        city,
      });
      window.dispatchEvent(new Event('gigset:opp-created'));
      onClose();
      pushToast('Opportunity posted.');
    } catch (e) {
      pushToast(e.message || 'Could not post the opportunity.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Post an opportunity" onClose={onClose}>
      <label>Title</label>
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bassist needed for wedding season" />
      <label>City</label>
      <select value={city} onChange={(e) => setCity(e.target.value)}>
        {CITIES.slice(0, 5).map((c) => <option key={c}>{c}</option>)}
      </select>
      <label>Requirements</label>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Describe what you're looking for…" />
      <div className="modal-actions">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-blue btn-sm" onClick={publish} disabled={saving}>{saving ? 'Posting…' : 'Post opportunity'}</button>
      </div>
    </Modal>
  );
}
