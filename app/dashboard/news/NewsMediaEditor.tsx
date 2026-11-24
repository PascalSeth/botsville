'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Check, ImagePlus, Link2, Loader2, Plus, X } from 'lucide-react';
import { uploadImage, STORAGE_BUCKETS } from '@/lib/supabase';
import { isAnimatedNewsImage } from '@/lib/news-presentation';
import { validateNewsWrite } from '@/lib/news-validation';
import styles from './news-desk.module.css';

const MAX_IMAGES = 13;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export default function NewsMediaEditor({ images, onChange, meme, disabled, onUploadingChange }: {
  images: string[];
  onChange: (images: string[]) => void;
  meme: boolean;
  disabled: boolean;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [failedImages, setFailedImages] = useState<string[]>([]);

  async function addFiles(files: File[]) {
    if (disabled || uploadingRef.current || !files.length) return;
    setError('');
    if (files.length + images.length > MAX_IMAGES) {
      setError('You can add a cover and up to 12 extra images.');
      return;
    }
    if (files.some(file => !ACCEPTED_TYPES.includes(file.type))) {
      setError('Choose JPG, PNG, WebP, AVIF, or GIF files.');
      return;
    }
    if (files.some(file => file.size > 10 * 1024 * 1024)) {
      setError('Each image needs to be 10 MB or smaller.');
      return;
    }
    uploadingRef.current = true;
    setUploading(true);
    onUploadingChange(true);
    const uploaded: string[] = [];
    const failed: string[] = [];
    try {
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const { url, error: uploadError } = await uploadImage(STORAGE_BUCKETS.IMAGES, `news/${crypto.randomUUID()}-${safeName}`, file);
        if (url && !uploadError) uploaded.push(url);
        else failed.push(file.name);
      }
      if (uploaded.length) onChange([...images, ...uploaded]);
      if (failed.length) setError(`Couldn’t upload: ${failed.join(', ')}. Your other images are kept. Try those files again.`);
    } catch {
      if (uploaded.length) onChange([...images, ...uploaded]);
      setError('The upload was interrupted. Any completed uploads are kept; try the remaining files again.');
    } finally {
      uploadingRef.current = false;
      setUploading(false);
      onUploadingChange(false);
    }
  }

  function addUrl() {
    if (disabled || uploadingRef.current) return;
    setError('');
    try {
      const { post } = validateNewsWrite({ title: 'Image', format: 'QUICK_POST', image: imageUrl });
      if (!post.image) throw new Error('Paste an image link first.');
      if (images.includes(post.image)) throw new Error('That image is already attached.');
      if (images.length >= MAX_IMAGES) throw new Error('You can add a cover and up to 12 extra images.');
      onChange([...images, post.image]);
      setImageUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check the image link.');
    }
  }

  return (
    <section className={styles.mediaSection} aria-labelledby="post-media-label">
      <div className={styles.fieldLabel}><span id="post-media-label">{meme ? 'The meme' : 'Images'} <span>{meme ? 'Image or GIF required to publish' : 'Optional'}</span></span>{images.length > 0 && <small>{images.length} / {MAX_IMAGES}</small>}</div>
      <input ref={input} type="file" multiple aria-label="Choose post images" accept={ACCEPTED_TYPES.join(',')} className={styles.srOnly} tabIndex={-1} disabled={disabled} onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void addFiles(files); }} />
      {images.length > 0 && <div className={styles.mediaGrid}>
        {images.map((url, index) => <div key={url} className={styles.mediaTile}>
          <div className={styles.mediaImage}>
            {failedImages.includes(url) ? <span>Preview unavailable</span> : <Image src={url} alt={index === 0 ? 'Post cover' : `Attached image ${index + 1}`} fill sizes="150px" unoptimized={isAnimatedNewsImage(url)} onError={() => setFailedImages(previous => [...previous, url])} />}
            <button type="button" disabled={disabled} onClick={() => onChange(images.filter(image => image !== url))} aria-label={`Remove image ${index + 1}`} className={styles.removeImage}><X size={14} /></button>
            {isAnimatedNewsImage(url) && <span className={styles.gifBadge}>GIF</span>}
          </div>
          <button type="button" className={styles.coverButton} disabled={disabled || index === 0} onClick={() => onChange([url, ...images.filter(image => image !== url)])}>{index === 0 ? <><Check size={12} /> Cover</> : 'Make cover'}</button>
        </div>)}
      </div>}
      {images.length < MAX_IMAGES && <button type="button" className={styles.uploadArea} data-compact={images.length > 0} data-dragging={dragging} disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); void addFiles(Array.from(event.dataTransfer.files)); }}>
        {uploading ? <Loader2 size={20} className={styles.spinner} /> : images.length ? <Plus size={17} /> : <ImagePlus size={23} />}
        <span><strong>{uploading ? 'Uploading…' : images.length ? 'Add more images' : meme ? 'Drop the meme here' : 'Add an image'}</strong>{images.length === 0 && <small>Choose files or drag them in. GIFs stay animated.</small>}</span>
      </button>}
      <div className={styles.mediaHint}><span>JPG, PNG, WebP, AVIF, GIF · Up to 10 MB each</span></div>
      {images.length < MAX_IMAGES && <details className={styles.imageLink}>
        <summary><Link2 size={13} /> Use an image link</summary>
        <div><input aria-label="Image URL" type="url" value={imageUrl} maxLength={2048} onChange={event => setImageUrl(event.target.value)} placeholder="https://…/image.gif" className={styles.input} disabled={disabled} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addUrl(); } }} /><button type="button" className={styles.secondaryButton} disabled={disabled} onClick={addUrl}>Add</button></div>
      </details>}
      {error && <p className={styles.inlineError} role="alert">{error}</p>}
    </section>
  );
}

