'use client';

import React, { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, ArrowLeft, Clock, Heart, Share2, Bookmark, ChevronRight } from 'lucide-react';

type Reaction = {
  emoji: string;
  userId: string;
};

type Article = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  image: string | null;
  category: string;
  featured: boolean;
  status: string;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
  reactions: Reaction[];
  _count?: { reactions: number };
};

type RelatedArticle = {
  id: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  category: string;
  publishedAt: string | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  PATCH_NOTES: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  NEW_EVENT: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  NEW_HERO: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const CATEGORY_LABELS: Record<string, string> = {
  PATCH_NOTES: 'Patch Notes',
  NEW_EVENT: 'New Event',
  NEW_HERO: 'New Hero',
};

const CATEGORY_ICONS: Record<string, string> = {
  PATCH_NOTES: '🔧',
  NEW_EVENT: '🎉',
  NEW_HERO: '⚔️',
};

export default function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readTime, setReadTime] = useState(0);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch(`/api/news/${id}`);
        if (!response.ok) {
          throw new Error('Article not found');
        }
        const data = await response.json();
        setArticle(data);
        
        // Calculate read time (average 200 words per minute)
        if (data.body) {
          const wordCount = data.body.split(/\s+/).length;
          setReadTime(Math.max(1, Math.ceil(wordCount / 200)));
        }

        // Fetch related articles
        const relatedResponse = await fetch(`/api/news?category=${data.category}&limit=4`);
        const relatedData = await relatedResponse.json();
        if (relatedData.articles) {
          setRelatedArticles(relatedData.articles.filter((a: RelatedArticle) => a.id !== id).slice(0, 3));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-[#e8a000]/20 border-t-[#e8a000] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#666] text-sm tracking-widest uppercase">Loading Article...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-8"
          >
            <div className="w-24 h-24 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl">📰</span>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-wide mb-2">Article Not Found</h1>
            <p className="text-[#666] text-sm mb-8">{error || 'The article you are looking for does not exist.'}</p>
            <Link
              href="/news"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#e8a000] text-black font-bold uppercase tracking-wide text-sm hover:bg-[#ffc107] transition-colors"
            >
              <ArrowLeft size={16} />
              Back to News
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Hero Section */}
      <div className="relative">
        {/* Background Image */}
        <div className="relative h-[50vh] md:h-[60vh] lg:h-[70vh] overflow-hidden">
          {article.image ? (
            <>
              <Image
                src={article.image}
                alt={article.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-linear-to-b from-[#0a0a0f]/30 via-[#0a0a0f]/60 to-[#0a0a0f]" />
            </>
          ) : (
            <div className="absolute inset-0 bg-linear-to-b from-[#1a1a25] to-[#0a0a0f]" />
          )}

          {/* Overlay Pattern */}
          <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-5" />

          {/* Category Glow */}
          <div className="absolute inset-0 bg-linear-to-br from-[#e8a000]/10 via-transparent to-transparent" />
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col">
          {/* Top Navigation */}
          <div className="shrink-0 pt-8 px-4 md:px-8">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Link
                  href="/news"
                  className="inline-flex items-center gap-2 text-white/70 hover:text-[#e8a000] transition-colors text-sm font-medium group"
                >
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="uppercase tracking-widest text-xs">Back to News</span>
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Hero Content */}
          <div className="flex-1 flex items-end pb-8 md:pb-12 px-4 md:px-8">
            <div className="max-w-6xl mx-auto w-full">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {/* Category & Meta */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className={`inline-flex items-center gap-2 text-xs font-black tracking-widest uppercase px-4 py-2 rounded-sm border ${CATEGORY_COLORS[article.category] || 'bg-white/10 text-white/70 border-white/20'}`}>
                    <span>{CATEGORY_ICONS[article.category] || '📰'}</span>
                    {CATEGORY_LABELS[article.category] || article.category}
                  </span>
                  {article.featured && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 bg-[#e8a000]/20 text-[#e8a000] border border-[#e8a000]/30 rounded-sm">
                      ⭐ Featured
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white tracking-tight uppercase leading-[1.1] mb-4 max-w-4xl">
                  {article.title}
                </h1>

                {/* Subtitle */}
                {article.subtitle && (
                  <p className="text-lg md:text-xl text-white/70 max-w-3xl mb-6 leading-relaxed">
                    {article.subtitle}
                  </p>
                )}

                {/* Meta Bar */}
                <div className="flex flex-wrap items-center gap-6 text-sm text-white/50">
                  {article.publishedAt && (
                    <span className="flex items-center gap-2">
                      <Calendar size={14} className="text-[#e8a000]" />
                      {new Date(article.publishedAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                  <span className="flex items-center gap-2">
                    <Clock size={14} className="text-[#e8a000]" />
                    {readTime} min read
                  </span>
                  {(article._count?.reactions ?? 0) > 0 && (
                    <span className="flex items-center gap-2">
                      <Heart size={14} className="text-red-400" />
                      {article._count?.reactions} reactions
                    </span>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Article Content */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-8"
          >
            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8 pb-8 border-b border-white/10">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 bg-white/5 text-[#888] border border-white/10 hover:border-[#e8a000]/50 hover:text-[#e8a000] transition-colors cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Article Body */}
            {article.body ? (
              <div className="prose prose-invert prose-lg max-w-none">
                <div 
                  className="text-[#ccc] leading-relaxed space-y-6 whitespace-pre-wrap"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {article.body.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-base md:text-lg leading-[1.8]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="text-[#666] text-sm uppercase tracking-widest">No content available</p>
              </div>
            )}

            {/* Actions Bar */}
            <div className="mt-12 pt-8 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-[#e8a000]/50 hover:text-[#e8a000] transition-colors text-sm font-medium">
                    <Heart size={16} />
                    <span>Like</span>
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-[#e8a000]/50 hover:text-[#e8a000] transition-colors text-sm font-medium">
                    <Bookmark size={16} />
                    <span>Save</span>
                  </button>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-[#e8a000]/50 hover:text-[#e8a000] transition-colors text-sm font-medium">
                  <Share2 size={16} />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </motion.article>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="sticky top-8 space-y-8"
            >
              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div className="bg-white/2 border border-white/10 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-1 w-8 bg-[#e8a000]" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Related Articles</h3>
                  </div>
                  <div className="space-y-4">
                    {relatedArticles.map((relatedArticle) => (
                      <Link
                        key={relatedArticle.id}
                        href={`/news/${relatedArticle.id}`}
                        className="group block"
                      >
                        <div className="flex gap-3">
                          {relatedArticle.image && (
                            <div className="relative w-20 h-16 shrink-0 overflow-hidden bg-[#111]">
                              <Image
                                src={relatedArticle.image}
                                alt={relatedArticle.title}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className={`text-[8px] font-black tracking-widest uppercase ${CATEGORY_COLORS[relatedArticle.category]?.includes('text-') ? CATEGORY_COLORS[relatedArticle.category].split(' ').find(c => c.startsWith('text-')) : 'text-[#888]'}`}>
                              {CATEGORY_LABELS[relatedArticle.category] || relatedArticle.category}
                            </span>
                            <h4 className="text-xs font-bold text-white group-hover:text-[#e8a000] transition-colors line-clamp-2 mt-1 uppercase tracking-wide">
                              {relatedArticle.title}
                            </h4>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Nav */}
              <div className="bg-white/2 border border-white/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-1 w-8 bg-[#e8a000]" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Quick Links</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'All News', href: '/news' },
                    { label: 'Patch Notes', href: '/news?category=PATCH_NOTES' },
                    { label: 'Events', href: '/news?category=NEW_EVENT' },
                    { label: 'New Heroes', href: '/news?category=NEW_HERO' },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center justify-between py-2 px-3 text-sm text-[#888] hover:text-[#e8a000] hover:bg-white/5 transition-all group"
                    >
                      <span className="uppercase tracking-wide text-xs font-medium">{link.label}</span>
                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </aside>
        </div>
      </div>

      {/* Footer Divider */}
      <div className="border-t border-white/10 mt-8" />
    </div>
  );
}
