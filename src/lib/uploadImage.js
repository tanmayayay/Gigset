import { supabase } from './supabase';

/** Centre-crop to a square and shrink — small profile photos load fast on mobile data. */
export async function squareImage(file, size = 512, quality = 0.88) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('That image could not be read. Try a JPG or PNG.');
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const out = Math.min(size, side);
  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  canvas.getContext('2d').drawImage(bitmap, sx, sy, side, side, 0, 0, out, out);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
  if (!blob) throw new Error('Could not prepare that image.');
  return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
}

/** Upload a profile photo to the public post-media bucket; returns its URL. */
export async function uploadAvatar(file, uid) {
  if (!/^image\//.test(file.type)) throw new Error('Please choose an image.');
  if (file.size > 15 * 1024 * 1024) throw new Error('That image is over 15 MB.');
  const small = await squareImage(file);
  const path = `${uid}/avatar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
  const { error } = await supabase.storage.from('post-media').upload(path, small, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw new Error('Photo upload failed. Check that the post-media bucket is set up.');
  return supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
}

/** Downscale (max 1600px) and upload a photo for a post; returns its public URL. */
export async function uploadPostImage(file, uid) {
  if (!/^image\//.test(file.type)) throw new Error('Please choose an image.');
  if (file.size > 15 * 1024 * 1024) throw new Error('That image is over 15 MB.');
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('That image could not be read. Try a JPG or PNG.');
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
  if (!blob) throw new Error('Could not prepare that image.');
  const path = `${uid}/c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
  const { error } = await supabase.storage.from('post-media').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw new Error('Photo upload failed. Check that the post-media bucket is set up.');
  return supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
}
