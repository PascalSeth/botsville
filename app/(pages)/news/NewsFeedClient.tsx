'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowRight, ArrowUpRight, Flame, Images, Loader2, Share2 } from 'lucide-react';
import { WhatsAppShareModal } from '@/app/components/WhatsAppShareModal';
import { getNewsPresentation, isAnimatedNewsImage } from '@/lib/news-presentation';
import { isNewsCategory, newsCategoryLabel, type NewsFormat } from '@/lib/news-content';
import styles from './news-feed.module.css';

export type FeedArticle = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  image: string | null;
  images?: string[];
  category: string;
  format?: NewsFormat;
  featured: boolean;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
  _count?: { reactions: number };
};

const FILTERS = [
  { value: 'ALL', label: 'All posts', href: '/news' },
  { value: 'ARTICLES', label: 'News stories', href: '/news?format=ARTICLE' },
  { value: 'MEMES', label: 'Memes', href: '/news?format=MEME' },
  { value: 'QUICK', label: 'Quick posts', href: '/news?format=QUICK_POST' },
  { value: 'BANTER', label: 'Banter', href: '/news?category=BANTER' },
  { value: 'ESPORTS', label: 'Esports', href: '/news?category=ESPORTS' },
  { value: 'COMMUNITY', label: 'Community', href: '/news?category=COMMUNITY' },
  { value: 'PATCH_NOTES', label: 'Patch notes', href: '/news?category=PATCH_NOTES' },
  { value: 'NEW_EVENT', label: 'Events', href: '/news?category=NEW_EVENT' },
  { value: 'NEW_HERO', label: 'Heroes', href: '/news?category=NEW_HERO' },
  { value: 'INTERVIEW', label: 'Interviews', href: '/news?category=INTERVIEW' },
];
const PAGE_SIZE = 24;
const VISIBLE_STEP = 8;
const FORMAT_FILTERS: Record<string, string> = { ARTICLES: 'ARTICLE', MEMES: 'MEME', QUICK: 'QUICK_POST', POSTS: 'posts' };

export function filterFeedArticles(articles: FeedArticle[], filter: string) {
  if (filter === 'POSTS') return articles.filter(article => !getNewsPresentation(article).isLongForm);
  if (FORMAT_FILTERS[filter]) return articles.filter(article => getNewsPresentation(article).format === FORMAT_FILTERS[filter]);
  if (filter === 'ALL') return articles;
  return articles.filter(article => article.category === filter);
}

function categoryLabel(article: FeedArticle) {
  const presentation = getNewsPresentation(article);
  if (presentation.isMeme) return 'Memes';
  return newsCategoryLabel(article.category);
}

function dateLabel(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

async function fetchPage(filter: string, skip: number, signal: AbortSignal) {
  const params = new URLSearchParams({ status: 'PUBLISHED', limit: String(PAGE_SIZE), skip: String(skip) });
  if (FORMAT_FILTERS[filter]) params.set('format', FORMAT_FILTERS[filter]);
  else if (filter !== 'ALL') params.set('category', filter);
  const response = await fetch(`/api/news?${params}`, { signal });
  if (!response.ok) throw new Error('The feed couldn’t load. Give it another shot.');
  const data = await response.json();
  if (!Array.isArray(data.articles)) throw new Error('The feed couldn’t load. Give it another shot.');
  return {
    articles: data.articles as FeedArticle[],
    total: typeof data.pagination?.total === 'number' ? data.pagination.total : skip + data.articles.length,
  };
}

function Masthead() {
  return (
    <header className={styles.masthead}>
      <div className={styles.edition}><span>Botsville / Community dispatch</span><span>Ghana plays here.</span></div>
      <div className={styles.headingRow}>
        <h1>The feed<span>.</span></h1>
        <div className={styles.intro}><p>News. Memes.<br /> A little friendly fire.</p><span>From the Land of Dawn to the group chat.</span></div>
      </div>
    </header>
  );
}

function FeedSkeleton() {
  return (
    <div className={styles.skeleton} role="status">
      <span className={styles.srOnly}>Loading the feed…</span>
      <div className={styles.skeletonHeading} /><div className={styles.skeletonMedia} />
      <div className={styles.skeletonRows}><div /><div /></div>
    </div>
  );
}

export function NewsFeedLoading() {
  return <main className={styles.page}><div className={styles.shell}><Masthead /><FeedSkeleton /></div></main>;
}

export function NewsFeedPost({ article, lead = false, onShare }: {
  article: FeedArticle;
  lead?: boolean;
  onShare: (article: FeedArticle) => void;
}) {
  const { coverImage, images, isLongForm, isMeme, body, readingMinutes } = getNewsPresentation(article);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const hasImage = Boolean(coverImage && failedImage !== coverImage);
  const date = article.publishedAt || article.createdAt;
  const excerpt = article.subtitle?.trim() || ((!isLongForm || !hasImage) ? body : '');

  return (
    <article className={`${styles.post} ${lead ? styles.leadPost : ''}`} data-format={isLongForm ? 'article' : 'post'} data-has-image={hasImage}>
      <div className={styles.postKicker}>
        <span>{categoryLabel(article)}</span>
        {article.featured ? <span className={styles.featured}>In the spotlight</span> : !isLongForm && !isMeme ? <span>Quick post</span> : null}
      </div>
      {lead ? <h2><Link href={`/news/${article.id}`}>{article.title}</Link></h2> : <h3><Link href={`/news/${article.id}`}>{article.title}</Link></h3>}
      <div className={styles.postDate}><time dateTime={date}>{dateLabel(date)}</time>{readingMinutes !== null && <><span aria-hidden="true">/</span><span>{readingMinutes} min read</span></>}</div>
      {hasImage && coverImage && <Link href={`/news/${article.id}`} className={styles.postImage} aria-label={`Open ${article.title}`}>
        <Image src={coverImage} alt={article.title} width={1200} height={900} priority={lead} unoptimized={isAnimatedNewsImage(coverImage)} sizes={lead ? '(max-width: 760px) 100vw, (max-width: 1100px) 90vw, 820px' : '(max-width: 600px) 100vw, (max-width: 1100px) 45vw, 390px'} onError={() => setFailedImage(coverImage)} />
      </Link>}
      {images.length > 1 && <span className={styles.imageCount}><Images size={12} />{images.length} images in this post</span>}
      {excerpt && <p className={styles.excerpt}>{excerpt}</p>}
      <div className={styles.postActions}>
        <Link href={`/news/${article.id}`} className={styles.openPost}>{isLongForm ? 'Read the story' : 'Open post'}<ArrowUpRight size={16} /></Link>
        <div>
          <Link href={`/news/${article.id}#reactions`} className={styles.reactions} aria-label={`${article._count?.reactions || 0} reactions to ${article.title}`}><Flame size={15} /><span>{article._count?.reactions || 0}</span></Link>
          <button type="button" onClick={() => onShare(article)} className={styles.share} aria-label={`Share ${article.title}`}><Share2 size={16} /></button>
        </div>
      </div>
    </article>
  );
}

type FeedState = { key: string; articles: FeedArticle[]; total: number; nextSkip: number; error: string | null };

export default function NewsFeedClient() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category');
  const formatQuery = searchParams.get('format');
  const formatAlias = ({ articles: 'ARTICLES', memes: 'MEMES', quick: 'QUICK' } as Record<string, string>)[formatQuery || ''];
  const formatFilter = Object.entries(FORMAT_FILTERS).find(([, value]) => value === formatQuery)?.[0] || formatAlias;
  const activeFilter = isNewsCategory(category) ? category : formatFilter || 'ALL';
  const [retry, setRetry] = useState(0);
  const queryKey = `${activeFilter}:${retry}`;
  const [feed, setFeed] = useState<FeedState | null>(null);
  const [visible, setVisible] = useState({ key: '', count: VISIBLE_STEP });
  const [more, setMore] = useState<{ key: string; loading: boolean; error: string | null }>({ key: '', loading: false, error: null });
  const moreController = useRef<AbortController | null>(null);
  const [sharing, setSharing] = useState<FeedArticle | null>(null);
  const current = feed?.key === queryKey ? feed : null;
  const loading = current === null;
  const filtered = filterFeedArticles(current?.articles || [], activeFilter);
  const visibleCount = visible.key === queryKey ? visible.count : VISIBLE_STEP;
  const shown = filtered.slice(0, visibleCount);
  const [lead, ...rest] = shown;
  const hasMore = filtered.length > shown.length || Boolean(current && current.nextSkip < current.total);
  const loadingMore = more.key === queryKey && more.loading;
  const moreError = more.key === queryKey ? more.error : null;
  const mostReacted = [...(current?.articles || [])]
    .filter(article => (article._count?.reactions || 0) > 0)
    .sort((a, b) => (b._count?.reactions || 0) - (a._count?.reactions || 0))
    .slice(0, 3);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const batch = await fetchPage(activeFilter, 0, controller.signal);
        if (!controller.signal.aborted) setFeed({ key: queryKey, articles: batch.articles, total: batch.total, nextSkip: batch.articles.length || batch.total, error: null });
      } catch (err) {
        if (!controller.signal.aborted) setFeed({ key: queryKey, articles: [], total: 0, nextSkip: 0, error: err instanceof Error ? err.message : 'The feed couldn’t load.' });
      }
    })();
    return () => { controller.abort(); moreController.current?.abort(); };
  }, [activeFilter, queryKey]);

  const loadMore = async () => {
    if (!current || loadingMore) return;
    if (filtered.length > visibleCount) {
      setVisible({ key: queryKey, count: visibleCount + VISIBLE_STEP });
      return;
    }
    const controller = new AbortController();
    moreController.current = controller;
    setMore({ key: queryKey, loading: true, error: null });
    try {
      const batch = await fetchPage(activeFilter, current.nextSkip, controller.signal);
      const articles = [...new Map([...current.articles, ...batch.articles].map(article => [article.id, article])).values()];
      const total = batch.total;
      const nextSkip = batch.articles.length ? current.nextSkip + batch.articles.length : total;
      if (controller.signal.aborted) return;
      setFeed(previous => previous?.key === queryKey ? { ...previous, articles, total, nextSkip } : previous);
      setVisible({ key: queryKey, count: visibleCount + VISIBLE_STEP });
      setMore({ key: queryKey, loading: false, error: null });
    } catch {
      if (!controller.signal.aborted) setMore({ key: queryKey, loading: false, error: 'Couldn’t load more posts. Your feed is still here.' });
    } finally {
      if (moreController.current === controller) {
        setMore(previous => previous.key === queryKey ? { ...previous, loading: false } : previous);
        moreController.current = null;
      }
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Masthead />
        <nav className={styles.filters} aria-label="Filter the news feed">
          {activeFilter === 'POSTS' && <Link href="/news?format=posts" scroll={false} aria-current="page">Memes & quick posts</Link>}
          {FILTERS.map(filter => <Link key={filter.value} href={filter.href} scroll={false} aria-current={activeFilter === filter.value ? 'page' : undefined}>{filter.label}</Link>)}
        </nav>
        {loading ? <FeedSkeleton /> : current.error ? (
          <section className={styles.empty} role="alert"><span className={styles.eyebrow}>Connection interrupted</span><h2>The feed took a hit.</h2><p>{current.error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Try again <ArrowRight size={16} /></button></section>
        ) : !lead ? (
          <section className={styles.empty}><span className={styles.eyebrow}>Nothing here yet</span><h2>{activeFilter === 'ALL' ? 'The next drop is on its way.' : 'A quiet corner of the feed.'}</h2><p>{activeFilter === 'ALL' ? 'News, memes, and community posts will land here.' : 'No posts in this category yet. There’s more on the rest of the feed.'}</p>{activeFilter !== 'ALL' && <Link href="/news" scroll={false}>See all posts <ArrowRight size={16} /></Link>}</section>
        ) : (
          <div className={styles.feedLayout}>
            <div className={styles.mainFeed}>
              <div className={styles.sectionTitle}><span>{lead.featured ? 'In the spotlight' : 'On the feed'}</span><ArrowDown size={15} /></div>
              <NewsFeedPost key={lead.id} article={lead} lead onShare={setSharing} />
              {rest.length > 0 && <section className={styles.morePosts} aria-labelledby="more-posts-heading"><div className={styles.sectionTitle}><h2 id="more-posts-heading">Keep scrolling</h2><span>There’s more where that came from.</span></div><div className={styles.postGrid}>{rest.map(article => <NewsFeedPost key={article.id} article={article} onShare={setSharing} />)}</div></section>}
              <div className={styles.feedEnd}>
                <p aria-live="polite">{shown.length} {shown.length === 1 ? 'post' : 'posts'}{!hasMore ? ' · You’re all caught up.' : ''}</p>
                {moreError && <p className={styles.loadError} role="alert">{moreError}</p>}
                {hasMore && <button type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? <Loader2 size={16} className={styles.spinner} /> : <ArrowDown size={16} />}{loadingMore ? 'Loading posts…' : moreError ? 'Try loading more' : 'More from the feed'}</button>}
              </div>
            </div>
            <aside className={styles.sidebar} aria-label="Around the community">
              <div className={styles.sidebarInner}>
                {mostReacted.length > 0 && <section className={styles.radar}><div className={styles.sectionTitle}><h2>Getting a reaction</h2><Flame size={16} /></div>{mostReacted.map((article, index) => <Link key={article.id} href={`/news/${article.id}`} className={styles.radarPost}><span className={styles.number}>0{index + 1}</span><div><span className={styles.eyebrow}>{categoryLabel(article)}</span><h3>{article.title}</h3><span className={styles.radarCount}>{article._count?.reactions} reactions</span></div><ArrowUpRight size={14} /></Link>)}</section>}
                <section className={styles.community}><span className={styles.eyebrow}>Beyond the headline</span><h2>Same game.<br /> Your people<span>.</span></h2><p>The players, the squads, and everything in between.</p><Link href="/community">Community hub <ArrowUpRight size={16} /></Link><Link href="/pros">Meet the pros <ArrowUpRight size={16} /></Link><Link href="/teams">Find your squad <ArrowUpRight size={16} /></Link></section>
                <p className={styles.railFooter}>BOTSVILLE<br /><span>From Ghana. For the game.</span></p>
              </div>
            </aside>
          </div>
        )}
      </div>
      {sharing && <WhatsAppShareModal isOpen onClose={() => setSharing(null)} article={sharing} />}
    </main>
  );
}
