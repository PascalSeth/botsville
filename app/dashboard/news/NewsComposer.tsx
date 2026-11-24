'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertDialog } from 'radix-ui';
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, Eye, FileText, Image as ImageIcon, Loader2, Pencil, Send, Star, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { dashboardFetch } from '../lib/api';
import { WhatsAppShareModal } from '@/app/components/WhatsAppShareModal';
import { WhatsAppIcon } from '@/app/components/icons/WhatsAppIcon';
import { NEWS_CATEGORIES, NEWS_FORMATS, resolveNewsFormat, type NewsFormat, type NewsStatus } from '@/lib/news-content';
import { getNewsImages, isAnimatedNewsImage } from '@/lib/news-presentation';
import { validateNewsWrite, type NewsWriteData } from '@/lib/news-validation';
import NewsMediaEditor from './NewsMediaEditor';
import type { NewsPost } from './news-types';
import styles from './news-desk.module.css';

const FORMAT_OPTIONS = [
  { value: 'QUICK_POST', label: 'Quick post', description: 'Updates & hot takes', icon: Zap },
  { value: 'MEME', label: 'Meme / GIF', description: 'For the group chat', icon: ImageIcon },
  { value: 'ARTICLE', label: 'News story', description: 'The full story', icon: FileText },
] as const;

function draftFromPost(post: NewsPost): NewsWriteData {
  return {
    title: post.title, subtitle: post.subtitle || null, body: post.body || null,
    format: resolveNewsFormat(post), category: post.category, status: post.status,
    image: post.image || null, images: post.images || [], tags: post.tags || [],
    sourceName: post.sourceName || null, sourceUrl: post.sourceUrl || null, featured: post.featured,
  };
}

function FeedPreview({ post }: { post: NewsWriteData }) {
  const images = getNewsImages(post);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const cover = images[0];
  const excerpt = post.subtitle?.trim() || (post.format !== 'ARTICLE' || !cover ? post.body?.trim() : '');
  return (
    <article className={styles.previewCard}>
      <div className={styles.previewBrand}>BOTSVILLE <span>/ THE FEED</span></div>
      <div className={styles.previewTopic}><span>{post.format === 'MEME' ? 'Memes' : NEWS_CATEGORIES[post.category]}</span>{post.featured && <Star size={12} />}</div>
      <h2 className={!post.title.trim() ? styles.placeholder : undefined}>{post.title.trim() || 'Your headline goes here'}</h2>
      {cover && failedImage !== cover
        ? <div className={styles.previewMedia}><Image src={cover} alt="Post preview" width={800} height={800} unoptimized={isAnimatedNewsImage(cover)} onError={() => setFailedImage(cover)} />{images.length > 1 && <span>+{images.length - 1} images</span>}</div>
        : post.format === 'MEME' && <div className={styles.previewPlaceholder}><ImageIcon size={23} /><span>{failedImage === cover && cover ? 'Image preview unavailable' : 'Your meme goes here'}</span></div>}
      {excerpt && <p className={styles.previewExcerpt}>{excerpt}</p>}
      {(post.sourceName || post.sourceUrl) && <p className={styles.previewCredit}>Credit: {post.sourceName || 'Original source'}</p>}
      <div className={styles.previewFooter}><span>👍 &nbsp; 🔥 &nbsp; 💀</span><span>{post.format === 'ARTICLE' ? 'Read story' : 'Open post'} <ArrowUpRight size={12} /></span></div>
    </article>
  );
}

export default function NewsComposer({ article, initialFormat = 'QUICK_POST', interviewer = false }: {
  article?: NewsPost;
  initialFormat?: NewsFormat;
  interviewer?: boolean;
}) {
  const router = useRouter();
  const [persisted, setPersisted] = useState(article);
  const [post, setPost] = useState<NewsWriteData>(() => article ? {
    ...draftFromPost(article), ...(interviewer ? { category: 'INTERVIEW', format: 'ARTICLE' } as const : {}),
  } : {
    title: '', subtitle: null, body: null, format: interviewer ? 'ARTICLE' : initialFormat,
    category: interviewer ? 'INTERVIEW' : initialFormat === 'MEME' ? 'BANTER' : 'COMMUNITY',
    status: 'DRAFT', image: null, images: [], tags: [], sourceName: null, sourceUrl: null, featured: false,
  });
  const [tags, setTags] = useState((article?.tags || []).join(', '));
  const [mobileView, setMobileView] = useState<'write' | 'preview'>('write');
  const [saving, setSaving] = useState<NewsStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [contextOpen, setContextOpen] = useState(Boolean(article?.body));
  const [creditsOpen, setCreditsOpen] = useState(Boolean(article?.sourceName || article?.sourceUrl || article?.tags?.length));
  const saveLock = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const busy = Boolean(saving || uploading || deleting);
  const published = persisted?.status === 'PUBLISHED';
  const images = getNewsImages(post);
  const isStory = post.format === 'ARTICLE';
  const isMeme = post.format === 'MEME';
  const changed = !persisted || JSON.stringify(post) !== JSON.stringify(draftFromPost(persisted)) || tags !== (persisted.tags || []).join(', ');

  function change<K extends keyof NewsWriteData>(field: K, value: NewsWriteData[K]) {
    setPost(previous => ({ ...previous, [field]: value }));
    setError('');
  }

  function setImages(nextImages: string[]) {
    setPost(previous => ({ ...previous, image: nextImages[0] || null, images: nextImages.slice(1) }));
    setError('');
  }

  async function save(status: NewsStatus) {
    if (busy || saveLock.current) return;
    setError('');
    let validated: NewsWriteData;
    try {
      validated = validateNewsWrite({
        ...post, status, tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        ...(interviewer ? { category: 'INTERVIEW', format: 'ARTICLE' } : {}),
      }).post;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Check your post and try again.';
      setError(message);
      if (/source|credit|tag/i.test(message)) setCreditsOpen(true);
      setMobileView('write');
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    saveLock.current = true;
    setSaving(status);
    try {
      const { data, error: saveError } = await dashboardFetch<{ article: NewsPost }>(persisted ? `/api/news/${persisted.id}` : '/api/news', {
        method: persisted ? 'PUT' : 'POST', body: JSON.stringify(validated),
      });
      if (saveError || !data?.article) {
        setError(saveError || 'The post couldn’t be saved. Try again.');
        requestAnimationFrame(() => errorRef.current?.focus());
        return;
      }
      setPersisted(data.article);
      setPost(draftFromPost(data.article));
      setTags((data.article.tags || []).join(', '));
      toast.success(status === 'DRAFT' ? published ? 'Post moved to drafts.' : 'Draft saved.' : published ? 'Changes saved.' : 'Post published. Ready for the group chat.');
      if (!persisted) router.replace(`/dashboard/news/${data.article.id}`);
    } finally {
      saveLock.current = false;
      setSaving(null);
    }
  }

  async function deletePost() {
    if (!persisted || busy || saveLock.current) return;
    saveLock.current = true;
    setDeleting(true);
    setDeleteError('');
    const { error: removeError } = await dashboardFetch(`/api/news/${persisted.id}`, { method: 'DELETE' });
    if (removeError) {
      setDeleteError(removeError);
      setDeleting(false);
      saveLock.current = false;
      return;
    }
    toast.success('Post removed.');
    router.push('/dashboard/news');
  }

  const mediaEditor = <NewsMediaEditor images={images} onChange={setImages} meme={isMeme} disabled={busy} onUploadingChange={setUploading} />;
  const bodyField = <div className={styles.field}>
    <label htmlFor="post-body" className={styles.fieldLabel}>{isStory ? 'The story' : 'More context'} <span>{isStory ? 'Required to publish' : 'Optional'}</span></label>
    <textarea id="post-body" className={`${styles.input} ${styles.bodyInput}`} rows={isStory ? 12 : 4} value={post.body || ''} maxLength={100000} onChange={event => change('body', event.target.value)} placeholder={isStory ? 'Start with what happened. Add the details below.' : 'A bit of backstory, if it needs one…'} />
    {isStory && <small className={styles.fieldHint}>{post.body?.trim() ? post.body.trim().split(/\s+/).length : 0} words · Paragraph breaks are kept.</small>}
  </div>;

  return (
    <div className={styles.desk}>
      <div className={styles.editorNav}>
        <Link href="/dashboard/news" className={styles.backLink}><ArrowLeft size={15} /> News desk</Link>
        <div className={styles.headerActions}>
          <span className={styles.statusBadge} data-status={published ? 'PUBLISHED' : 'DRAFT'}><span />{published ? 'Published' : 'Draft'}</span>
          {persisted && published && <button type="button" className={styles.whatsappButton} onClick={() => setSharing(true)}><WhatsAppIcon size={18} /><span>Share</span></button>}
        </div>
      </div>
      <header className={styles.composerHeader}><h1>{persisted ? 'Edit post' : 'Create a post'}<span>.</span></h1><p>{interviewer ? 'Your next interview, from first draft to the feed.' : 'Pick the format. Make it yours.'}</p></header>

      <div className={styles.mobileTabs} aria-label="Editor view"><button type="button" aria-pressed={mobileView === 'write'} onClick={() => setMobileView('write')}><Pencil size={14} /> Write</button><button type="button" aria-pressed={mobileView === 'preview'} onClick={() => setMobileView('preview')}><Eye size={15} /> Preview</button></div>

      <form noValidate onSubmit={event => { event.preventDefault(); void save(published ? 'PUBLISHED' : 'DRAFT'); }}>
        <div className={styles.composerGrid} data-mobile-view={mobileView}>
          <fieldset className={styles.editorFields} disabled={busy}>
            <legend className={styles.srOnly}>Post content</legend>
            {!interviewer && <fieldset className={styles.formatPicker}>
              <legend className={styles.srOnly}>Choose a post format</legend>
              {FORMAT_OPTIONS.map(({ value, label, description, icon: Icon }) => <label key={value} className={styles.formatOption} data-selected={post.format === value}>
                <input type="radio" name="post-format" value={value} checked={post.format === value} onChange={() => change('format', value)} />
                <Icon size={18} /><span><strong>{label}</strong><small>{description}</small></span><Check size={13} className={styles.formatCheck} />
              </label>)}
            </fieldset>}
            <div className={styles.editorPaper}>
              <div className={styles.sectionTop}><span>{NEWS_FORMATS[post.format].label}</span><small>{isMeme ? 'Image first. Let the caption do the rest.' : isStory ? 'A headline worth opening.' : 'A little news. A little friendly fire.'}</small></div>
              {isMeme && mediaEditor}
              <div className={styles.field}>
                <label htmlFor="post-title" className={styles.fieldLabel}>{isMeme ? 'Title / punchline' : isStory ? 'Headline' : 'Post title'}<small>{post.title.length}/180</small></label>
                <textarea id="post-title" className={`${styles.input} ${styles.titleInput}`} rows={2} maxLength={180} value={post.title} onChange={event => change('title', event.target.value)} placeholder={isMeme ? 'When your jungler says “trust me”…' : isStory ? 'Give the story a clear headline' : 'What’s the group chat talking about?'} aria-required="true" />
              </div>
              <div className={styles.field}>
                <label htmlFor="post-subtitle" className={styles.fieldLabel}>{isStory ? 'Short summary' : 'Caption'}<span>Optional</span></label>
                <textarea id="post-subtitle" className={styles.input} rows={2} maxLength={500} value={post.subtitle || ''} onChange={event => change('subtitle', event.target.value)} placeholder={isMeme ? 'The image speaks. You can add the punchline.' : isStory ? 'The takeaway in a sentence or two.' : 'Your take, in your own words.'} />
                <small className={styles.fieldHint}>{(post.subtitle || '').length}/500</small>
              </div>
              {isStory ? bodyField : <details className={styles.extraText} open={contextOpen} onToggle={event => setContextOpen(event.currentTarget.open)}><summary>More to say? <span>Optional text</span><ChevronDown size={14} /></summary>{bodyField}</details>}
              {!isMeme && mediaEditor}
            </div>

            <div className={styles.settingsPanel}>
              <div className={styles.topicRow}>
                <div className={styles.field}><label htmlFor="post-topic" className={styles.fieldLabel}>Topic</label><select id="post-topic" className={styles.input} value={post.category} disabled={interviewer || busy} onChange={event => change('category', event.target.value as NewsWriteData['category'])}>{Object.entries(NEWS_CATEGORIES).filter(([value]) => !interviewer || value === 'INTERVIEW').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <label className={styles.featureToggle}><input type="checkbox" checked={post.featured} onChange={event => change('featured', event.target.checked)} /><span><strong><Star size={13} /> Feature this post</strong><small>Give it a spot at the top of the feed.</small></span></label>
              </div>
              <details className={styles.extraDetails} open={creditsOpen} onToggle={event => setCreditsOpen(event.currentTarget.open)}>
                <summary><span>Credit & tags <small>Optional</small></span><ChevronDown size={15} /></summary>
                <div className={styles.detailsFields}>
                  <div className={styles.field}><label htmlFor="post-credit" className={styles.fieldLabel}>Source / creator</label><input id="post-credit" className={styles.input} value={post.sourceName || ''} maxLength={100} onChange={event => change('sourceName', event.target.value)} placeholder="Give the original creator a nod" /></div>
                  <div className={styles.field}><label htmlFor="post-source" className={styles.fieldLabel}>Original post / source link</label><input id="post-source" className={styles.input} type="url" value={post.sourceUrl || ''} maxLength={2048} onChange={event => change('sourceUrl', event.target.value)} placeholder="https://…" /></div>
                  <div className={styles.field}><label htmlFor="post-tags" className={styles.fieldLabel}>Tags</label><input id="post-tags" className={styles.input} value={tags} onChange={event => { setTags(event.target.value); setError(''); }} placeholder="ranked, solo queue, community" /><small className={styles.fieldHint}>Separate with commas. Up to 12 tags.</small></div>
                </div>
              </details>
            </div>
          </fieldset>

          <aside className={styles.previewColumn} aria-label="Post preview">
            <div className={styles.previewSticky}>
              <div className={styles.previewLabel}><Eye size={14} /> Feed preview <span>Mobile</span></div>
              <FeedPreview post={post} />
              <p className={styles.previewNote}>{isMeme ? 'The full image stays visible. No cropped punchlines.' : isStory ? 'The full story opens on its own page.' : 'Short updates sit right in the feed.'}</p>
              <div className={styles.publishNote}><WhatsAppIcon size={19} /><p>Made for the group chat.<span>{published ? 'Share the saved version from the top of this page.' : 'Publish first, then share to WhatsApp.'}</span></p></div>
              {published && persisted && <Link href={`/news/${persisted.id}`} className={styles.textButton} target="_blank" rel="noopener noreferrer">Open published post <ArrowUpRight size={14} /></Link>}
            </div>
          </aside>
        </div>

        <footer className={styles.saveBar}>
          {error && <div ref={errorRef} tabIndex={-1} className={styles.saveError} role="alert">{error}</div>}
          <div className={styles.saveBarInner}>
            <span className={styles.saveState} aria-live="polite">{uploading ? <><Loader2 size={13} className={styles.spinner} /> Uploading images…</> : saving ? 'Saving…' : changed ? <><span className={styles.unsavedDot} /> Unsaved changes</> : <><Check size={14} /> All changes saved</>}</span>
            <div className={styles.saveActions}>
              <button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => void save('DRAFT')}>{saving === 'DRAFT' && <Loader2 size={14} className={styles.spinner} />}{published ? 'Move to drafts' : 'Save draft'}</button>
              <button type="button" className={styles.primaryButton} disabled={busy} onClick={() => void save('PUBLISHED')}>{saving === 'PUBLISHED' ? <Loader2 size={14} className={styles.spinner} /> : published ? <Check size={14} /> : <Send size={14} />}{published ? 'Save changes' : 'Publish post'}</button>
            </div>
          </div>
        </footer>
      </form>

      {persisted && !interviewer && <AlertDialog.Root open={deleteOpen} onOpenChange={open => { if (!deleting) { setDeleteOpen(open); setDeleteError(''); } }}>
        <AlertDialog.Trigger asChild><button type="button" className={styles.deleteLink} disabled={busy}><Trash2 size={13} /> Remove post</button></AlertDialog.Trigger>
        <AlertDialog.Portal><AlertDialog.Overlay className={styles.dialogOverlay} /><AlertDialog.Content className={styles.deleteDialog}>
          <AlertDialog.Title>Remove this post?</AlertDialog.Title><AlertDialog.Description>“{persisted.title}” will no longer appear in the feed or news desk.</AlertDialog.Description>
          {deleteError && <p className={styles.inlineError} role="alert">{deleteError}</p>}
          <div><AlertDialog.Cancel asChild><button className={styles.secondaryButton} disabled={deleting}>Keep post</button></AlertDialog.Cancel><button className={styles.dangerButton} onClick={() => void deletePost()} disabled={deleting}>{deleting && <Loader2 size={14} className={styles.spinner} />}Remove post</button></div>
        </AlertDialog.Content></AlertDialog.Portal>
      </AlertDialog.Root>}
      {persisted && published && sharing && <WhatsAppShareModal isOpen onClose={() => setSharing(false)} article={persisted} />}
    </div>
  );
}

