'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Dialog } from 'radix-ui';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Copy, Expand, Share2, X } from 'lucide-react';
import { WhatsAppIcon } from '@/app/components/icons/WhatsAppIcon';
import { toast } from 'sonner';
import { WhatsAppShareModal } from '@/app/components/WhatsAppShareModal';
import { getNewsPresentation, isAnimatedNewsImage } from '@/lib/news-presentation';
import { newsCategoryLabel, type NewsFormat } from '@/lib/news-content';
import styles from './news-detail.module.css';

type Reaction = { emoji: string; userId: string };
type Article = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  image: string | null;
  category: string;
  format?: NewsFormat;
  sourceName?: string | null;
  sourceUrl?: string | null;
  featured: boolean;
  status: string;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
  images?: string[];
  reactions: Reaction[];
  _count?: { reactions: number };
};
type RelatedArticle = Pick<Article, 'id' | 'title' | 'subtitle' | 'image' | 'category' | 'publishedAt'>;

const REACTIONS = [
  { emoji: '🔥', label: 'Fire' }, { emoji: '💀', label: 'Dead' }, { emoji: '👍', label: 'Respect' },
];
const categoryLabel = newsCategoryLabel;
const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});

function ArticleBody({ body }: { body: string }) {
  return body.trim().split(/\r?\n\s*\r?\n/).map((block, index) => {
    if (/^#{1,3}\s/.test(block)) return <h2 key={index}>{block.replace(/^#{1,3}\s+/, '')}</h2>;
    if (/^>\s/.test(block)) return <blockquote key={index}>{block.replace(/^>\s?/gm, '')}</blockquote>;
    const lines = block.split(/\r?\n/);
    if (lines.every(line => /^[-*]\s/.test(line))) {
      return <ul key={index}>{lines.map((line, i) => <li key={i}>{line.replace(/^[-*]\s+/, '')}</li>)}</ul>;
    }
    return <p key={index}>{block}</p>;
  });
}

export default function NewsDetailClient({ id, initialArticle }: { id: string; initialArticle?: Article | null }) {
  const [article, setArticle] = useState<Article | null>(initialArticle || null);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(!initialArticle);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [reactionPending, setReactionPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const storyRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presentation = getNewsPresentation(article || {});
  const { images: gallery, coverImage, extraImages, isLongForm, isMeme, readingMinutes } = presentation;

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      let currentArticle = initialArticle;
      try {
        if (!currentArticle) {
          const response = await fetch(`/api/news/${id}`, { signal: controller.signal });
          if (!response.ok) throw new Error(response.status === 404 ? 'This story has left the lobby.' : 'We couldn’t load this story. Try again in a moment.');
          currentArticle = await response.json() as Article;
          setArticle(currentArticle);
        }
        setLoading(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Something went wrong loading this story.');
        setLoading(false);
        return;
      }
      // Recommendations should never prevent the main story from being read.
      try {
        const response = await fetch('/api/news?status=PUBLISHED&limit=8', { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        const others = (data.articles || []).filter((item: RelatedArticle) => item.id !== id) as RelatedArticle[];
        others.sort((a, b) => Number(b.category === currentArticle?.category) - Number(a.category === currentArticle?.category));
        setRelatedArticles(others.slice(0, 3));
      } catch { /* The story remains available if recommendations fail. */ }
    };
    void load();
    return () => controller.abort();
  }, [id, initialArticle]);

  useEffect(() => {
    if (!article || !isLongForm) return;
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!storyRef.current || !progressRef.current) return;
        const rect = storyRef.current.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (56 - rect.top) / Math.max(1, rect.height - window.innerHeight + 56)));
        progressRef.current.style.transform = `scaleX(${progress})`;
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [article, isLongForm]);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/news/${id}`);
      setCopied(true);
      toast.success('Link copied. Take it to the group chat.');
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch { toast.error('Couldn’t copy the link. You can copy it from the address bar.'); }
  };

  const shareArticle = async () => {
    if (!article) return;
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title: article.title, text: article.subtitle || article.title, url: `${window.location.origin}/news/${id}` });
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) await copyLink();
    }
  };

  const reactToArticle = async (emoji: string) => {
    if (!article || reactionPending) return;
    if (!session?.user?.id) {
      toast('Sign in to leave your take.', { action: { label: 'Sign in', onClick: () => { window.location.href = `/login?callbackUrl=${encodeURIComponent(`/news/${id}#reactions`)}`; } } });
      return;
    }
    const userId = session.user.id;
    const removing = article.reactions.some(reaction => reaction.userId === userId && reaction.emoji === emoji);
    setReactionPending(true);
    try {
      const response = await fetch(`/api/news/${id}/reactions`, {
        method: removing ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' },
        ...(removing ? {} : { body: JSON.stringify({ emoji }) }),
      });
      if (!response.ok) throw new Error('Couldn’t save your reaction. Try again.');
      setArticle(current => {
        if (!current) return current;
        const reactions = current.reactions.filter(reaction => reaction.userId !== userId);
        if (!removing) reactions.push({ emoji, userId });
        return { ...current, reactions, _count: { reactions: reactions.length } };
      });
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Couldn’t save your reaction.'); }
    finally { setReactionPending(false); }
  };

  if (loading) return (
    <main className={styles.page} aria-busy="true" aria-label="Loading story">
      <div className={`${styles.shell} ${styles.loading}`}>
        <span className={styles.eyebrow}>Botsville / The feed</span>
        <div className={styles.skeletonTitle} /><div className={styles.skeletonTitle} />
        <div className={styles.skeletonImage} /><p>Getting the story…</p>
      </div>
    </main>
  );

  if (error || !article) return (
    <main className={`${styles.page} ${styles.error}`}>
      <span className={styles.eyebrow}>Botsville / The feed</span>
      <h1>Story unavailable.</h1>
      <p>{error || 'This story may have moved or been removed.'}</p>
      <Link href="/news" className={styles.primaryButton}><ArrowLeft size={16} /> Back to the feed</Link>
    </main>
  );

  const reactionCount = article._count?.reactions ?? article.reactions.length;
  const postLabel = isMeme ? 'Memes' : isLongForm ? categoryLabel(article.category) : 'Quick post';

  return (
    <main className={styles.page} data-format={isLongForm ? 'article' : 'post'}>
      {isLongForm && <div className={styles.progressTrack} aria-hidden="true"><div ref={progressRef} /></div>}
      <div className={styles.shell}>
        <nav className={styles.feedNav} aria-label="News navigation">
          <Link href="/news"><ArrowLeft size={15} /> The feed<span className={styles.navSlash}>/</span><span className={styles.navCategory}>{postLabel}</span></Link>
          <span className={styles.edition}>Ghana plays here.</span>
        </nav>
        <div className={styles.layout}>
          <article ref={storyRef} className={styles.story}>
            <header className={styles.storyHeader}>
              <div className={styles.kicker}><span>{postLabel}</span><span className={styles.kickerRule} />{article.featured ? 'In the spotlight' : 'From the community'}</div>
              <h1>{article.title}</h1>
              {isLongForm && article.subtitle?.trim() && <p className={styles.dek}>{article.subtitle}</p>}
              <div className={styles.byline}>
                <span className={styles.authorMark} aria-hidden="true">b<span>.</span></span>
                <div><span className={styles.authorName}>Botsville<span className={styles.desk}> / {isLongForm ? 'News desk' : 'The feed'}</span></span><div className={styles.metadata}><time dateTime={article.publishedAt || article.createdAt}>{formatDate(article.publishedAt || article.createdAt)}</time>{readingMinutes !== null && <><span aria-hidden="true">·</span><span>{readingMinutes} min read</span></>}</div></div>
                <button className={styles.iconButton} onClick={shareArticle} aria-label="Share this story"><Share2 size={18} /></button>
              </div>
            </header>
            {coverImage && <figure className={styles.hero}>
              <button onClick={() => setLightboxIdx(0)} aria-label="View post image full screen">
                <Image src={coverImage} alt={article.title} width={1200} height={900} priority unoptimized={isAnimatedNewsImage(coverImage)} sizes={isLongForm ? '(max-width: 760px) 100vw, (max-width: 1100px) 90vw, 860px' : '(max-width: 760px) 100vw, 720px'} className={styles.coverImage} />
                <span className={styles.imageExpand}><Expand size={15} /></span>
              </button>
              {isLongForm && <figcaption><span>THE FEED <span aria-hidden="true">/</span> {categoryLabel(article.category)}</span><span>BOTSVILLE</span></figcaption>}
            </figure>}
            <div className={styles.readingColumn}>
              {!isLongForm && article.subtitle?.trim() && <p className={styles.postCaption}>{article.subtitle}</p>}
              {isLongForm && <div className={styles.storyLabel}><span>The story</span><ArrowDown size={14} /></div>}
              {presentation.body && <div className={styles.body}><ArticleBody body={presentation.body} /></div>}
              {extraImages.length > 0 && <section className={styles.gallery} aria-labelledby="gallery-heading">
                <div className={styles.sectionHeading}><h2 id="gallery-heading">{isLongForm ? 'The receipts.' : 'More from this post'}</h2><span>{extraImages.length} {extraImages.length === 1 ? 'image' : 'images'}</span></div>
                <div className={isLongForm ? styles.galleryGrid : styles.postGallery}>{extraImages.map((src, index) => <button key={src} onClick={() => setLightboxIdx(index + 1)} aria-label={`View post image ${index + 2}`}><Image src={src} alt={`Image ${index + 2} for ${article.title}`} width={1200} height={900} unoptimized={isAnimatedNewsImage(src)} sizes={isLongForm ? '(max-width: 760px) 45vw, 320px' : '(max-width: 760px) 100vw, 680px'} /><span><Expand size={14} /></span></button>)}</div>
              </section>}
              {(article.sourceName || article.sourceUrl) && <div className={styles.sourceCredit}><span>{isMeme ? 'Credit' : 'Source'}</span>{article.sourceUrl ? <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">{article.sourceName || 'Original post'}<ArrowUpRight size={13} /></a> : <span>{article.sourceName}</span>}</div>}
              {article.tags?.length > 0 && <div className={styles.tags} aria-label="Story topics"><span>Filed under</span>{article.tags.map(tag => <span key={tag} className={styles.tag}>{tag}</span>)}</div>}
              <section id="reactions" className={styles.reactions} aria-labelledby="reactions-heading">
                <div className={styles.sectionHeading}><h2 id="reactions-heading">What’s your take?</h2><span aria-live="polite">{reactionCount} {reactionCount === 1 ? 'reaction' : 'reactions'}</span></div>
                <div className={styles.reactionOptions}>{REACTIONS.map(({ emoji, label }) => {
                  const count = article.reactions.filter(reaction => reaction.emoji === emoji).length;
                  const selected = article.reactions.some(reaction => reaction.userId === session?.user?.id && reaction.emoji === emoji);
                  return <button key={emoji} aria-pressed={selected} aria-label={`${label}, ${count} reactions`} disabled={reactionPending || sessionStatus === 'loading'} onClick={() => reactToArticle(emoji)}><span className={styles.emoji} aria-hidden="true">{emoji}</span><span>{label}</span><span className={styles.reactionCount}>{count}</span></button>;
                })}</div>
              </section>
              <section className={styles.shareStrip} aria-label="Share this post">{isLongForm && <div><span className={styles.eyebrow}>Don’t keep it to yourself</span><h2>For the group chat.</h2></div>}<button className={styles.primaryButton} onClick={() => setShareModalOpen(true)}>Send to your squad <ArrowUpRight size={18} /></button></section>
            </div>
          </article>
          {(isLongForm || relatedArticles.length > 0) && <aside className={styles.sidebar} aria-label="More from Botsville">
            <div className={styles.sidebarInner}>
              {isLongForm && <div className={styles.railMasthead}><span>OFF THE MAP.<br />ON YOUR FEED<span>.</span></span><p>Patch drops. Big plays.<br />A little friendly fire.</p></div>}
              {relatedArticles.length > 0 && <section className={styles.related} aria-labelledby="related-heading"><div className={styles.sectionHeading}><h2 id="related-heading">Up next</h2><ArrowDown size={15} /></div>{relatedArticles.map((item, index) => <Link key={item.id} href={`/news/${item.id}`} className={styles.relatedStory}>
                <div className={styles.relatedImage}>{item.image ? <Image src={item.image} alt="" fill sizes="(max-width: 760px) 100px, 280px" /> : <span className={styles.relatedPlaceholder}>b.</span>}<span className={styles.storyNumber}>0{index + 1}</span></div>
                <div className={styles.relatedText}><span className={styles.eyebrow}>{categoryLabel(item.category)}</span><h3>{item.title}</h3>{item.publishedAt && <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>}</div><ArrowUpRight size={16} className={styles.relatedArrow} />
              </Link>)}<Link href="/news" className={styles.allNews}>Back to the feed <ArrowRight size={16} /></Link></section>}
              {isLongForm && <div className={styles.railShare}><span className={styles.eyebrow}>Pass it on</span><p>Someone in your squad<br />needs to see this.</p><button onClick={() => setShareModalOpen(true)}><WhatsAppIcon size={17} /> WhatsApp <ArrowUpRight size={16} /></button><button onClick={copyLink}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Link copied' : 'Copy story link'}</button></div>}
            </div>
          </aside>}
        </div>
      </div>
      <div className={styles.mobileDock} aria-label="Story actions"><a href="#reactions" aria-label={`Jump to ${reactionCount} reactions`}><span aria-hidden="true">🔥</span><span>{reactionCount}</span></a><button className={styles.dockShare} onClick={() => setShareModalOpen(true)}><WhatsAppIcon size={17} /> Send to your squad <ArrowUpRight size={16} /></button><button className={styles.iconButton} onClick={shareArticle} aria-label="More sharing options"><Share2 size={18} /></button></div>
      <Dialog.Root open={lightboxIdx !== null} onOpenChange={open => { if (!open) setLightboxIdx(null); }}><Dialog.Portal><Dialog.Overlay className={styles.lightboxOverlay} /><Dialog.Content className={styles.lightbox} aria-describedby={undefined} onKeyDown={event => {
        if (gallery.length < 2) return;
        if (event.key === 'ArrowLeft') setLightboxIdx(index => ((index ?? 0) - 1 + gallery.length) % gallery.length);
        if (event.key === 'ArrowRight') setLightboxIdx(index => ((index ?? 0) + 1) % gallery.length);
      }}><Dialog.Title className={styles.srOnly}>Post images: {article.title}</Dialog.Title><Dialog.Close className={styles.lightboxClose} aria-label="Close image viewer"><X size={22} /></Dialog.Close>{lightboxIdx !== null && gallery[lightboxIdx] && <div className={styles.lightboxImage}><Image src={gallery[lightboxIdx]} alt={`Image ${lightboxIdx + 1} for ${article.title}`} fill unoptimized={isAnimatedNewsImage(gallery[lightboxIdx])} sizes="100vw" className={styles.containImage} /></div>}<div className={styles.lightboxControls}><button disabled={gallery.length < 2} onClick={() => setLightboxIdx(index => ((index ?? 0) - 1 + gallery.length) % gallery.length)} aria-label="Previous image"><ChevronLeft size={22} /></button><span aria-live="polite">{(lightboxIdx ?? 0) + 1} / {gallery.length}</span><button disabled={gallery.length < 2} onClick={() => setLightboxIdx(index => ((index ?? 0) + 1) % gallery.length)} aria-label="Next image"><ChevronRight size={22} /></button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
      <WhatsAppShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} article={{ ...article, image: coverImage }} />
    </main>
  );
}
