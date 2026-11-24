'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, FileText, Image as ImageIcon, Loader2, Pencil, Plus, Star, Zap } from 'lucide-react';
import { useRoleGuard } from '../lib/useRole';
import { dashboardFetch } from '../lib/api';
import { WhatsAppShareModal } from '@/app/components/WhatsAppShareModal';
import { WhatsAppIcon } from '@/app/components/icons/WhatsAppIcon';
import { NEWS_CATEGORIES, NEWS_FORMATS, resolveNewsFormat } from '@/lib/news-content';
import { getNewsImages, isAnimatedNewsImage } from '@/lib/news-presentation';
import type { NewsPost } from './news-types';
import styles from './news-desk.module.css';

const PAGE_SIZE = 20;
const FORMATS = [
  { value: 'QUICK_POST', label: 'Quick post', icon: Zap },
  { value: 'MEME', label: 'Meme / GIF', icon: ImageIcon },
  { value: 'ARTICLE', label: 'News story', icon: FileText },
] as const;
type Payload = { articles: NewsPost[]; pagination: { total: number; limit: number; skip: number } };

function PostThumbnail({ post }: { post: NewsPost }) {
  const cover = getNewsImages(post)[0];
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.thumbnail} data-meme={post.format === 'MEME'}>
      {cover && !failed
        ? <Image src={cover} alt="" fill sizes="(max-width: 600px) 64px, 84px" unoptimized={isAnimatedNewsImage(cover)} onError={() => setFailed(true)} />
        : post.format === 'MEME' ? <ImageIcon size={21} /> : post.format === 'QUICK_POST' ? <Zap size={21} /> : <FileText size={21} />}
    </div>
  );
}

export default function DashboardNewsPage() {
  const { role, isAllowed } = useRoleGuard(['CONTENT_ADMIN', 'EDITOR', 'INTERVIEWER']);
  const isInterviewer = role === 'INTERVIEWER';
  const [filter, setFilter] = useState({ status: '', format: '', category: '', skip: 0 });
  const [result, setResult] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [sharing, setSharing] = useState<NewsPost | null>(null);

  useEffect(() => {
    if (!isAllowed) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String(filter.skip) });
      if (filter.status) params.set('status', filter.status);
      if (filter.format) params.set('format', filter.format);
      if (isInterviewer) params.set('category', 'INTERVIEW');
      else if (filter.category) params.set('category', filter.category);
      const { data, error: loadError } = await dashboardFetch<Payload>(`/api/news?${params}`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (data) {
        const lastPageSkip = Math.max(0, (Math.ceil(data.pagination.total / PAGE_SIZE) - 1) * PAGE_SIZE);
        if (filter.skip > lastPageSkip) {
          setFilter(previous => ({ ...previous, skip: lastPageSkip }));
          return;
        }
      }
      setResult(data ?? null);
      setError(loadError || '');
      setLoading(false);
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filter, isAllowed, isInterviewer, retry]);

  function changeFilter(field: 'status' | 'format' | 'category', value: string) {
    setLoading(true);
    setFilter(previous => ({ ...previous, [field]: value, skip: 0 }));
  }

  function turnPage(skip: number) {
    setLoading(true);
    setFilter(previous => ({ ...previous, skip }));
    document.getElementById('news-post-list')?.scrollIntoView({ block: 'start' });
  }

  const total = result?.pagination.total ?? 0;
  const hasFilters = Boolean(filter.status || filter.format || filter.category);

  return (
    <div className={styles.desk}>
      <header className={styles.pageHeader}>
        <div><span className={styles.eyebrow}>Botsville / Publishing</span><h1>News desk<span>.</span></h1><p>Big news. Small updates. Questionable memes.</p></div>
        <div className={styles.headerActions}>
          <Link href="/news" target="_blank" rel="noopener noreferrer" className={styles.textButton}>View feed <ArrowUpRight size={15} /></Link>
          <Link href="/dashboard/news/new" className={styles.primaryButton}><Plus size={16} /> New post</Link>
        </div>
      </header>

      {isAllowed && <div className={styles.startBar}>
        <span>Start with</span>
        {FORMATS.filter(item => !isInterviewer || item.value === 'ARTICLE').map(({ value, label, icon: Icon }) => (
          <Link key={value} href={`/dashboard/news/new?format=${value}`}><Icon size={15} />{label}<ArrowUpRight size={13} /></Link>
        ))}
      </div>}

      <section className={styles.postSection} id="news-post-list" aria-label="Manage news posts">
        <div className={styles.toolbar}>
          <div className={styles.statusTabs} aria-label="Filter by status">
            {[['', 'All posts'], ['DRAFT', 'Drafts'], ['PUBLISHED', 'Published']].map(([value, label]) => (
              <button key={value} onClick={() => changeFilter('status', value)} aria-pressed={filter.status === value}>{label}</button>
            ))}
          </div>
          <div className={styles.filters}>
            {!isInterviewer && <select aria-label="Filter by format" value={filter.format} onChange={event => changeFilter('format', event.target.value)}>
              <option value="">All formats</option>{FORMATS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>}
            {!isInterviewer && <select aria-label="Filter by topic" value={filter.category} onChange={event => changeFilter('category', event.target.value)}>
              <option value="">All topics</option>{Object.entries(NEWS_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>}
          </div>
        </div>

        <div aria-busy={loading || !isAllowed}>
          {loading || !isAllowed ? <div className={styles.loading} role="status"><Loader2 size={18} className={styles.spinner} /> Loading posts…</div>
            : error ? <div className={styles.empty} role="alert"><h2>Couldn’t load the desk</h2><p>{error}</p><button className={styles.secondaryButton} onClick={() => setRetry(value => value + 1)}>Try again</button></div>
            : !result?.articles.length ? <div className={styles.empty}>
              <FileText size={25} /><h2>{hasFilters ? 'No posts in this view' : 'The feed starts here'}</h2>
              <p>{hasFilters ? 'Try another format or status.' : 'Drop a meme, share a quick take, or write the next story.'}</p>
              {hasFilters ? <button className={styles.secondaryButton} onClick={() => { setLoading(true); setFilter({ status: '', format: '', category: '', skip: 0 }); }}>Clear filters</button> : <Link href="/dashboard/news/new" className={styles.primaryButton}><Plus size={15} /> Create a post</Link>}
            </div> : <>
              <div className={styles.listHeading} aria-hidden="true"><span>Post</span><span>Status</span><span>Actions</span></div>
              <div className={styles.postList}>
                {result.articles.map(post => {
                  const format = resolveNewsFormat(post);
                  const date = post.updatedAt || post.createdAt;
                  return (
                    <article key={post.id} className={styles.postRow}>
                      <Link href={`/dashboard/news/${post.id}`} className={styles.postLink}>
                        <PostThumbnail post={post} />
                        <div className={styles.postInfo}>
                          <div className={styles.postMeta}><span data-format={format}>{NEWS_FORMATS[format].label}</span><span>{NEWS_CATEGORIES[post.category]}</span>{post.featured && <span className={styles.featured}><Star size={11} /> Featured</span>}</div>
                          <h2>{post.title}</h2>
                          <div className={styles.postFootnote}><time dateTime={date}>{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</time><span>{post._count?.reactions ?? 0} reactions</span></div>
                        </div>
                      </Link>
                      <span className={styles.statusBadge} data-status={post.status}><span />{post.status === 'PUBLISHED' ? 'Published' : 'Draft'}</span>
                      <div className={styles.rowActions}>
                        {post.status === 'PUBLISHED' && <button className={styles.whatsappButton} aria-label={`Share ${post.title} on WhatsApp`} title="Share on WhatsApp" onClick={() => setSharing(post)}><WhatsAppIcon size={18} /><span>Share</span></button>}
                        <Link href={`/dashboard/news/${post.id}`} className={styles.editButton} aria-label={`Edit ${post.title}`}><Pencil size={14} /><span>Edit</span></Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>}
        </div>

        {!loading && !error && isAllowed && total > 0 && <div className={styles.pagination}>
          <span>{filter.skip + 1}–{Math.min(filter.skip + PAGE_SIZE, total)} of {total} posts</span>
          <div><button disabled={filter.skip === 0} onClick={() => turnPage(Math.max(0, filter.skip - PAGE_SIZE))} aria-label="Previous page"><ArrowLeft size={15} /></button><span>{Math.floor(filter.skip / PAGE_SIZE) + 1} / {Math.ceil(total / PAGE_SIZE)}</span><button disabled={filter.skip + PAGE_SIZE >= total} onClick={() => turnPage(filter.skip + PAGE_SIZE)} aria-label="Next page"><ArrowRight size={15} /></button></div>
        </div>}
      </section>
      {sharing && <WhatsAppShareModal isOpen onClose={() => setSharing(null)} article={sharing} />}
    </div>
  );
}

