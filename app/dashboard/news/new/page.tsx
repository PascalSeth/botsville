'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useRoleGuard } from '../../lib/useRole';
import { isNewsFormat } from '@/lib/news-content';
import NewsComposer from '../NewsComposer';
import styles from '../news-desk.module.css';

function CreateNewsPost() {
  const { role, isAllowed } = useRoleGuard(['CONTENT_ADMIN', 'EDITOR', 'INTERVIEWER']);
  const params = useSearchParams();
  const requestedFormat = params.get('format');
  const format = isNewsFormat(requestedFormat) ? requestedFormat : 'QUICK_POST';
  if (!isAllowed) return <div className={styles.loading} role="status"><Loader2 size={18} className={styles.spinner} /> Opening the editor…</div>;
  return <NewsComposer key={format} initialFormat={format} interviewer={role === 'INTERVIEWER'} />;
}

export default function NewNewsPage() {
  return <Suspense fallback={<div className={styles.loading} role="status">Opening the editor…</div>}><CreateNewsPost /></Suspense>;
}

