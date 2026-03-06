'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight } from 'lucide-react';

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
  _count?: { reactions: number };
};

type NewsResponse = {
  articles: Article[];
  pagination: { total: number; limit: number; skip: number };
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

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('/api/news?limit=100');
        const data: NewsResponse = await response.json();
        
        if (data.articles) {
          setArticles(data.articles);
          setFilteredArticles(data.articles);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load news');
        console.error('Failed to fetch news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'ALL') {
      setFilteredArticles(articles);
    } else {
      setFilteredArticles(articles.filter((a) => a.category === selectedCategory));
    }
  }, [selectedCategory, articles]);

  const categories = ['ALL', ...new Set(articles.map((a) => a.category))];
  const featuredArticles = filteredArticles.filter((a) => a.featured);
  const regularArticles = filteredArticles.filter((a) => !a.featured);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-linear-to-b from-white/2 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-1 w-12 bg-linear-to-r from-[#e8a000] to-[#e8a000]/50" />
              <span className="text-[#e8a000] text-xs font-black tracking-[0.2em] uppercase">
                Latest Updates
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-tight">
              News & <span className="text-[#e8a000]">Updates</span>
            </h1>
            <p className="mt-4 text-[#888] text-base md:text-lg max-w-2xl leading-relaxed">
              Stay informed with the latest patch notes, events, and hero releases from the Botsville universe.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-12 flex flex-wrap gap-2"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-sm font-black tracking-wide uppercase transition-all duration-300 border ${
                selectedCategory === cat
                  ? 'bg-[#e8a000] text-black border-[#e8a000]'
                  : 'bg-white/5 text-[#888] border-white/10 hover:border-[#e8a000]/50 hover:text-[#e8a000]'
              }`}
            >
              {cat === 'ALL' ? 'All Articles' : CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-[#e8a000]/20 border-t-[#e8a000] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#666] text-sm tracking-wide uppercase">Loading news...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-8">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!loading && filteredArticles.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#666] text-sm tracking-wide uppercase">No articles found in this category.</p>
          </div>
        )}

        {/* Featured Articles Grid */}
        {!loading && featuredArticles.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-8">
              <div className="h-px flex-1 bg-linear-to-r from-[#e8a000]/50 to-transparent" />
              <span className="text-[#e8a000] text-[10px] font-black tracking-[0.2em] uppercase">Featured</span>
              <div className="h-px flex-1 bg-linear-to-l from-[#e8a000]/50 to-transparent" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredArticles.slice(0, 2).map((article, index) => (
                <Link key={article.id} href={`/news/${article.id}`}>
                  <motion.article
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                    className="group cursor-pointer"
                  >
                    <div className="relative overflow-hidden bg-[#111] border border-white/10 hover:border-[#e8a000]/30 transition-all duration-500 h-96">
                    {article.image && (
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />

                    {/* Category Badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <div className={`text-xs font-black tracking-widest uppercase px-3 py-1 rounded-sm border ${CATEGORY_COLORS[article.category] || 'bg-white/10 text-white/70 border-white/20'}`}>
                        {CATEGORY_LABELS[article.category] || article.category}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6">
                      <div>
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-wide uppercase leading-tight mb-2 group-hover:text-[#e8a000] transition-colors duration-300">
                          {article.title}
                        </h2>
                        {article.subtitle && (
                          <p className="text-[#aaa] text-sm tracking-wide mb-4 line-clamp-2">
                            {article.subtitle}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-[#888]">
                          {article.publishedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(article.publishedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                          {article._count?.reactions && (
                            <span className="flex items-center gap-1">
                              ♥ {article._count.reactions}
                            </span>
                          )}
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-[#e8a000] text-xs font-bold uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Read Article</span>
                          <ArrowRight size={12} />
                        </div>
                      </div>
                    </div>
                  </div>
                  </motion.article>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Regular Articles Grid */}
        {!loading && regularArticles.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="h-px flex-1 bg-linear-to-r from-[#e8a000]/50 to-transparent" />
              <span className="text-[#888] text-[10px] font-black tracking-[0.2em] uppercase">All Articles</span>
              <div className="h-px flex-1 bg-linear-to-l from-[#e8a000]/50 to-transparent" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularArticles.map((article, index) => (
                <Link key={article.id} href={`/news/${article.id}`} className="flex flex-col h-full">
                  <motion.article
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.05 * index }}
                    className="group cursor-pointer flex flex-col h-full"
                  >
                    <div className="relative overflow-hidden bg-[#111] border border-white/10 hover:border-[#e8a000]/30 transition-all duration-500 h-48 mb-4">
                    {article.image && (
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      <div className={`text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-sm border ${CATEGORY_COLORS[article.category] || 'bg-white/10 text-white/70 border-white/20'}`}>
                        {CATEGORY_LABELS[article.category] || article.category}
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-col flex-1">
                    <h3 className="text-base font-black text-white tracking-wide uppercase mb-2 group-hover:text-[#e8a000] transition-colors duration-300 line-clamp-2">
                      {article.title}
                    </h3>

                    {article.subtitle && (
                      <p className="text-xs text-[#888] mb-4 line-clamp-2">
                        {article.subtitle}
                      </p>
                    )}

                    {/* Meta Info */}
                    <div className="mt-auto pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#666] flex items-center gap-1">
                          <Calendar size={11} />
                          {article.publishedAt
                            ? new Date(article.publishedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Upcoming'}
                        </span>
                        <span className="text-[#666] flex items-center gap-1">
                          {article._count?.reactions ? `♥ ${article._count.reactions}` : ''}
                        </span>
                      </div>

                      {/* Tags */}
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-white/5">
                          {article.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-[9px] bg-white/5 text-[#888] px-2 py-1 uppercase tracking-wider">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  </motion.article>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Divider ────────────────────────────────────── */}
      <div className="border-t border-white/10 mt-16 mb-8" />
    </div>
  );
}
