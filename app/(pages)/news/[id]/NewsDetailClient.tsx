'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, ArrowLeft, Clock, Heart, Share2, Bookmark, ChevronRight, X, ChevronLeft, MessageCircle } from 'lucide-react';
import { WhatsAppShareModal } from '@/app/components/WhatsAppShareModal';
import { toast } from 'sonner';

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
  images?: string[];
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
  INTERVIEW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const CATEGORY_LABELS: Record<string, string> = {
  PATCH_NOTES: 'Patch Notes',
  NEW_EVENT: 'New Event',
  NEW_HERO: 'New Hero',
  INTERVIEW: 'Interview',
};

const CATEGORY_ICONS: Record<string, string> = {
  PATCH_NOTES: '🔧',
  NEW_EVENT: '🎉',
  NEW_HERO: '⚔️',
  INTERVIEW: '🎤',
};

export default function NewsDetailClient({ 
  id, 
  initialArticle 
}: { 
  id: string; 
  initialArticle?: Article | null; 
}) {
  const [article, setArticle] = useState<Article | null>(initialArticle || null);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(!initialArticle);
  const [error, setError] = useState<string | null>(null);
  const [readTime, setReadTime] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        if (!initialArticle) {
          const response = await fetch(`/api/news/${id}`);
          if (!response.ok) {
            throw new Error('Article not found');
          }
          const data = await response.json();
          setArticle(data);
        }

        const currentArticle = initialArticle || article;
        if (currentArticle?.body) {
          const wordCount = currentArticle.body.split(/\s+/).length;
          setReadTime(Math.max(1, Math.ceil(wordCount / 200)));
        }

        // Fetch related articles
        if (currentArticle?.category) {
          const relatedResponse = await fetch(`/api/news?category=${currentArticle.category}&limit=4`);
          const relatedData = await relatedResponse.json();
          if (relatedData.articles) {
            setRelatedArticles(relatedData.articles.filter((a: RelatedArticle) => a.id !== id).slice(0, 3));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id, initialArticle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070c] flex items-center justify-center pt-28 md:pt-36">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-[#e8a000] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#888] text-xs uppercase tracking-widest font-black">Loading Article...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-[#07070c] flex items-center justify-center p-4 pt-28 md:pt-36">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400 font-bold text-xl">
            404
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Article Not Found</h1>
            <p className="text-[#888] text-sm">{error || "The article you're looking for doesn't exist or has been removed."}</p>
          </div>
          <Link
            href="/news"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#e8a000] text-black font-black uppercase text-xs tracking-wider rounded-sm hover:bg-[#ffb700] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to News
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070c] text-white">
      {/* Top Banner & Header */}
      <div className="relative border-b border-white/10 overflow-hidden">
        {/* Background Image Overlay */}
        {article.image && (
          <div className="absolute inset-0 z-0">
            <Image
              src={article.image}
              alt={article.title}
              fill
              className="object-cover opacity-20 blur-xl scale-105"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07070c] via-[#07070c]/80 to-transparent" />
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-24 md:pt-32 pb-12 relative z-10">
          {/* Navigation Bar */}
          <div className="flex items-center justify-between gap-4 mb-8">
            <Link
              href="/news"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#888] hover:text-[#e8a000] transition-colors bg-white/5 px-4 py-2 rounded-sm border border-white/10"
            >
              <ArrowLeft size={14} />
              Back to News
            </Link>

            {/* Quick Share to WhatsApp Header Button */}
            <button
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider bg-[#25D366] text-black px-4 py-2 rounded-xl shadow-lg shadow-[#25D366]/20 hover:bg-[#20ba59] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <MessageCircle size={16} fill="black" />
              <span>Share to WhatsApp</span>
            </button>
          </div>

          {/* Article Header Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Featured Image */}
            {article.image && (
              <div className="lg:col-span-5 relative aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  priority
                />
              </div>
            )}

            {/* Header Details */}
            <div className={article.image ? 'lg:col-span-7' : 'lg:col-span-12'}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Category & Badges */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-black tracking-widest uppercase px-3 py-1.5 border ${
                      CATEGORY_COLORS[article.category] || 'bg-white/10 text-white border-white/20'
                    }`}
                  >
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
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight uppercase leading-[1.1] mb-4">
                  {article.title}
                </h1>

                {/* Subtitle */}
                {article.subtitle && (
                  <p className="text-base md:text-lg text-white/70 mb-6 leading-relaxed">
                    {article.subtitle}
                  </p>
                )}

                {/* Meta Bar */}
                <div className="flex flex-wrap items-center gap-6 text-xs text-white/50 border-t border-white/10 pt-4">
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
            transition={{ duration: 0.6, delay: 0.2 }}
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
                  style={{ fontFamily: "'Inter', sans-serif" }}
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

            {/* Story Gallery Section */}
            {article.images && article.images.length > 0 && (
              <div className="mt-12 pt-8 border-t border-white/10 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#e8a000] flex items-center gap-2">
                  <span>🖼️</span> Story Gallery
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {article.images.map((img, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setLightboxIdx(idx)}
                      className="relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-white/10 group"
                    >
                      <Image
                        src={img}
                        alt={`Story image ${idx + 1}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white bg-black/80 px-3 py-1.5 rounded-full border border-white/15">
                          View
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Bar & WhatsApp Highlight */}
            <div className="mt-12 pt-8 border-t border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-[#e8a000]/50 hover:text-[#e8a000] transition-colors text-xs font-bold rounded-lg">
                    <Heart size={16} />
                    <span>Like</span>
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-[#e8a000]/50 hover:text-[#e8a000] transition-colors text-xs font-bold rounded-lg">
                    <Bookmark size={16} />
                    <span>Save</span>
                  </button>
                </div>

                {/* Primary WhatsApp Share Trigger */}
                <button 
                  onClick={() => setShareModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#25D366]/20"
                >
                  <MessageCircle size={18} fill="black" />
                  <span>Share via WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Lightbox Overlay */}
            {lightboxIdx !== null && article.images && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
                onClick={() => setLightboxIdx(null)}
              >
                <button
                  onClick={() => setLightboxIdx(null)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all z-55"
                >
                  <X size={20} />
                </button>

                {article.images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIdx((idx) => (idx! - 1 + article.images!.length) % article.images!.length);
                      }}
                      className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIdx((idx) => (idx! + 1) % article.images!.length);
                      }}
                      className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}

                <div
                  className="relative max-w-4xl max-h-[80vh] aspect-video w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Image
                    src={article.images[lightboxIdx]}
                    alt="Lightbox View"
                    fill
                    className="object-contain"
                  />
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-xs font-bold text-white/50">
                    {lightboxIdx + 1} of {article.images.length}
                  </div>
                </div>
              </div>
            )}
          </motion.article>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="sticky top-8 space-y-8"
            >
              {/* WhatsApp Broadcast Banner Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-b from-[#128C7E]/20 to-[#07070c] border border-[#25D366]/30 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#25D366] text-black font-black flex items-center justify-center mx-auto">
                  <MessageCircle size={22} fill="black" />
                </div>
                <h3 className="text-base font-black uppercase tracking-wider text-white">Share to Community</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Send this article to your MLBB team or WhatsApp status with media cards and captions.
                </p>
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="w-full py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#25D366]/20"
                >
                  Open WhatsApp Share
                </button>
              </div>

              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div className="bg-white/2 border border-white/10 p-6 rounded-xl">
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
                            <div className="relative w-20 h-16 shrink-0 overflow-hidden bg-[#111] rounded-lg border border-white/5">
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
              <div className="bg-white/2 border border-white/10 p-6 rounded-xl">
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
                      className="flex items-center justify-between py-2 px-3 text-sm text-[#888] hover:text-[#e8a000] hover:bg-white/5 transition-all group rounded-lg"
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

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        article={{
          id: article.id,
          title: article.title,
          subtitle: article.subtitle,
          image: article.image,
          category: article.category,
          publishedAt: article.publishedAt,
        }}
      />
    </div>
  );
}
