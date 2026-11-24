'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Dialog } from 'radix-ui';
import { ArrowUpRight, Check, Copy, Download, Image as ImageIcon, X } from 'lucide-react';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { toast } from 'sonner';
import { getNewsImages, isAnimatedNewsImage } from '@/lib/news-presentation';
import styles from './whatsapp-share.module.css';

type WhatsAppShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  article: {
    id: string;
    title: string;
    subtitle?: string | null;
    image?: string | null;
    images?: string[];
    category?: string;
    publishedAt?: string | null;
  };
};

const CAPTIONS = [
  { label: 'The heads-up', text: 'Squad, you need to see this.' },
  { label: 'The hot take', text: 'The group chat is not ready for this 💀' },
  { label: 'The debate', text: 'Alright, whose side are we on?' },
];

function ShareContent({ article, onClose }: Pick<WhatsAppShareModalProps, 'article' | 'onClose'>) {
  const [caption, setCaption] = useState(CAPTIONS[0].text);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const articleUrl = `${window.location.origin}/news/${article.id}`;
  const displayImage = imageFailed ? null : getNewsImages(article)[0] || null;
  const message = `${caption.trim() ? `${caption.trim()}\n\n` : ''}*${article.title.trim()}*\n${article.subtitle ? `${article.subtitle.trim()}\n\n` : '\n'}${articleUrl}`;

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Caption and link copied.');
    } catch {
      toast.error('Couldn’t copy the message. Try sharing to WhatsApp.');
    }
  };

  const getImageFile = async () => {
    if (!displayImage) throw new Error('This post has no image to download.');
    const response = await fetch(displayImage);
    if (!response.ok) throw new Error('The story image couldn’t be downloaded.');
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('The story image is unavailable.');
    const extension = blob.type.split('/')[1].split('+')[0].replace('jpeg', 'jpg');
    return new File([blob], `botsville-${article.id}.${extension}`, { type: blob.type });
  };

  const downloadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleMedia = async (share: boolean) => {
    setBusy(true);
    try {
      const file = await getImageFile();
      const shareData = { files: [file], title: article.title, text: message };
      if (share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        downloadFile(file);
        toast.success(share ? 'Image downloaded. Copy your caption to share it with the story.' : 'Story image downloaded.');
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        toast.error('Couldn’t share the image. You can still send the story link.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Content className={styles.sheet}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Pass it on</span>
          <Dialog.Title className={styles.title}>For the group chat.</Dialog.Title>
        </div>
        <button onClick={onClose} className={styles.close} aria-label="Close sharing options"><X size={20} /></button>
      </div>
      <Dialog.Description className={styles.description}>Add your take. Send it to the squad.</Dialog.Description>
      <div className={styles.content}>
        <div className={styles.preview}>
          {displayImage && <div className={styles.previewImage}><Image src={displayImage} alt="" fill sizes="88px" unoptimized={isAnimatedNewsImage(displayImage)} onError={() => setImageFailed(true)} /></div>}
          <div><span>BOTSVILLE / THE FEED</span><h3>{article.title}</h3></div>
        </div>
        <label htmlFor="news-share-caption" className={styles.label}>Your caption</label>
        <textarea id="news-share-caption" rows={2} value={caption} onChange={event => { setCaption(event.target.value); setCopied(false); }} placeholder="Say it how you see it…" className={styles.caption} />
        <div className={styles.presets} aria-label="Caption ideas">{CAPTIONS.map(preset => <button key={preset.label} aria-pressed={caption === preset.text} onClick={() => { setCaption(preset.text); setCopied(false); }}>{preset.label}</button>)}</div>
        <p className={styles.hint}>The story title and link are included.</p>
        <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={styles.primary}><WhatsAppIcon size={18} /> Open WhatsApp <ArrowUpRight size={18} /></a>
        <button className={styles.copy} onClick={copyMessage}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied to clipboard' : 'Copy caption & link'}</button>
        {displayImage && <div className={styles.mediaActions}><button disabled={busy} onClick={() => handleMedia(true)}><ImageIcon size={15} />{busy ? 'Preparing image…' : 'Share with image'}</button><button disabled={busy} onClick={() => handleMedia(false)}><Download size={15} /> Save image</button></div>}
      </div>
    </Dialog.Content>
  );
}

export function WhatsAppShareModal({ isOpen, onClose, article }: WhatsAppShareModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        {isOpen && <ShareContent key={article.id} article={article} onClose={onClose} />}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
