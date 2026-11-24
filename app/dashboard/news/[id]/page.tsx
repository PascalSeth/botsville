'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRoleGuard } from '../../lib/useRole';
import { dashboardFetch } from '../../lib/api';
import NewsComposer from '../NewsComposer';
import type { NewsPost } from '../news-types';
import styles from '../news-desk.module.css';

export default function NewsEditPage() {
  const { role, isAllowed } = useRoleGuard(['CONTENT_ADMIN', 'EDITOR', 'INTERVIEWER']);
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<{ id: string; article?: NewsPost; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!isAllowed || !id) return;
    const controller = new AbortController();
    void dashboardFetch<NewsPost>(`/api/news/${id}`, { signal: controller.signal }).then(({ data, error }) => {
      if (!controller.signal.aborted) setResult({ id, article: data, error });
    });
    return () => controller.abort();
  }, [id, isAllowed, retry]);

  if (!isAllowed || !result || result.id !== id) return <div className={styles.loading} role="status"><Loader2 size={18} className={styles.spinner} /> Opening the post…</div>;
  if (!result.article || result.error) return <div className={styles.desk}><div className={styles.empty} role="alert"><h1>Couldn’t open this post</h1><p>{result.error || 'This post is no longer available.'}</p><button className={styles.secondaryButton} onClick={() => { setResult(null); setRetry(value => value + 1); }}>Try again</button><Link href="/dashboard/news" className={styles.backLink}><ArrowLeft size={14} /> Back to the news desk</Link></div></div>;
  if (role === 'INTERVIEWER' && result.article.category !== 'INTERVIEW') return <div className={styles.desk}><div className={styles.empty}><h1>This post is outside your desk</h1><p>Your role can edit interview posts.</p><Link href="/dashboard/news" className={styles.backLink}><ArrowLeft size={14} /> Back to interviews</Link></div></div>;
  return <NewsComposer key={id} article={result.article} interviewer={role === 'INTERVIEWER'} />;
}

