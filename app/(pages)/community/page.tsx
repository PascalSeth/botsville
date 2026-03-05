'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadImage, STORAGE_BUCKETS, supabase } from '@/lib/supabase';
import { getSocket } from '@/lib/socket-client';
import {
  Flame, ThumbsUp, ThumbsDown, Laugh, Eye, Zap, Heart,
  MessageSquare, ChevronRight, ChevronDown, Send, X, Check,
  Gamepad2, Clapperboard, Swords, MessageCircle,
  Trophy, Plus, TrendingUp, Clock, Sparkles,
  Film, Camera, Brain, Type,
} from 'lucide-react';

/* ================================================================
   Types
   ================================================================ */

type PostType = 'CLIP' | 'MEME' | 'HOT_TAKE' | 'BUILD_SCREENSHOT' | 'ROAST';
type ReactionType = 'UPVOTE' | 'DOWNVOTE' | 'LIKE' | 'LAUGH' | 'FIRE' | 'WOW';

interface Author {
  id: string;
  ign: string | null;
  photo: string | null;
}

interface Post {
  id: string;
  type: PostType;
  title: string | null;
  content: string;
  mediaUrl: string | null;
  heroSlug: string | null;
  tags: string[];
  upvoteCount: number;
  downvoteCount: number;
  reactionScore: number;
  userReactionType?: ReactionType | null;
  isClipOfWeek: boolean;
  createdAt: string;
  author: Author;
  _count: { comments: number; reactions: number };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: Author;
  replies: Comment[];
}

interface ClipOfWeekData {
  post: Post & { author: Author };
  winner?: Author;
  bannerText?: string | null;
}

interface MemeData {
  id: string;
  caption: string | null;
  imageUrl: string;
  createdAt: string;
  user: Author;
  template: { name: string; imageUrl: string } | null;
}

interface TriviaFact {
  id: string;
  title: string;
  teaser: string;
  choices: string[];
  heroSlug?: string | null;
  images?: string[];
  category?: string;
  // Stats
  totalAttempts?: number;
  correctCount?: number;
  // User's answer state (set after answering)
  hasAnswered?: boolean;
  userAnswer?: string | null;
  isCorrect?: boolean | null;
  xpAwarded?: number | null;
  correctAnswer?: string | null;
  reveal?: string | null;
}

interface TriviaState {
  trivias: TriviaFact[];
  currentIndex: number;
  userTotalXp: number;
  dailyAnswered: number;
  dailyLimit: number;
  countdown: number | null; // seconds remaining before next trivia
}

/* ================================================================
   Constants
   ================================================================ */

const POST_TYPES: { value: PostType | 'ALL'; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'ALL',              label: 'All',         icon: <Sparkles size={14} />,     color: 'text-white' },
  { value: 'HOT_TAKE',        label: 'Hot Takes',   icon: <Flame size={14} />,        color: 'text-orange-400' },
  { value: 'CLIP',            label: 'Clips',       icon: <Clapperboard size={14} />, color: 'text-blue-400' },
  { value: 'MEME',            label: 'Memes',       icon: <Laugh size={14} />,        color: 'text-yellow-400' },
  { value: 'BUILD_SCREENSHOT', label: 'Builds',     icon: <Gamepad2 size={14} />,     color: 'text-emerald-400' },
  { value: 'ROAST',           label: 'Roasts',      icon: <Swords size={14} />,       color: 'text-red-400' },
];

const REACTION_CONFIG: { type: ReactionType; icon: React.ReactNode; label: string; color: string; activeColor: string }[] = [
  { type: 'UPVOTE',   icon: <ThumbsUp size={14} />,  label: 'Up',    color: 'text-zinc-100 hover:text-emerald-400', activeColor: 'text-emerald-400 bg-emerald-400/10' },
  { type: 'DOWNVOTE', icon: <ThumbsDown size={14} />, label: 'Down',  color: 'text-zinc-100 hover:text-red-400',     activeColor: 'text-red-400 bg-red-400/10' },
  { type: 'LIKE',     icon: <Heart size={14} />,      label: 'Love',  color: 'text-zinc-100 hover:text-pink-400',    activeColor: 'text-pink-400 bg-pink-400/10' },
  { type: 'LAUGH',    icon: <Laugh size={14} />,      label: 'Haha',  color: 'text-zinc-100 hover:text-yellow-400',  activeColor: 'text-yellow-400 bg-yellow-400/10' },
  { type: 'FIRE',     icon: <Flame size={14} />,      label: 'Fire',  color: 'text-zinc-100 hover:text-orange-400',  activeColor: 'text-orange-400 bg-orange-400/10' },
  { type: 'WOW',      icon: <Eye size={14} />,        label: 'Wow',   color: 'text-zinc-100 hover:text-purple-400',  activeColor: 'text-purple-400 bg-purple-400/10' },
];

const TYPE_BADGE: Record<PostType, { label: string; icon: React.ReactNode; bg: string }> = {
  HOT_TAKE:         { label: 'Hot Take',   icon: <Flame size={10} />,        bg: 'bg-orange-500/80' },
  CLIP:             { label: 'Clip',       icon: <Clapperboard size={10} />, bg: 'bg-blue-500/80' },
  MEME:             { label: 'Meme',       icon: <Laugh size={10} />,        bg: 'bg-yellow-500/80' },
  BUILD_SCREENSHOT: { label: 'Build',      icon: <Gamepad2 size={10} />,     bg: 'bg-emerald-500/80' },
  ROAST:            { label: 'Roast',      icon: <Swords size={10} />,       bg: 'bg-red-500/80' },
};

/* ================================================================
   Trivia Category Config — for Quiz-Style Display
   ================================================================ */

const TRIVIA_CATEGORY_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string; questionLabel: string; answerLabel: string }> = {
  GUESS_THE_HERO: {
    emoji: '🧠',
    label: 'Guess the Hero',
    color: 'text-purple-400',
    bg: 'bg-purple-500/15 border-purple-500/30',
    questionLabel: 'Clue',
    answerLabel: 'Hero',
  },
  HARDEST_HEROES: {
    emoji: '⚔️',
    label: 'Hardest Heroes',
    color: 'text-red-400',
    bg: 'bg-red-500/15 border-red-500/30',
    questionLabel: 'Question',
    answerLabel: 'Answer',
  },
  FUNNY_FACTS: {
    emoji: '😂',
    label: 'Funny Facts',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
    questionLabel: 'Did You Know?',
    answerLabel: 'Reveal',
  },
  OG_HEROES: {
    emoji: '👑',
    label: 'OG Heroes',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15 border-amber-500/30',
    questionLabel: 'Question',
    answerLabel: 'Answer',
  },
  POWER_ULTIMATE: {
    emoji: '🔥',
    label: 'Power Ultimate',
    color: 'text-orange-400',
    bg: 'bg-orange-500/15 border-orange-500/30',
    questionLabel: 'Question',
    answerLabel: 'Answer',
  },
  LORE: {
    emoji: '🐉',
    label: 'Lore & Story',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15 border-cyan-500/30',
    questionLabel: 'Lore Trivia',
    answerLabel: 'Truth',
  },
  SKIN: {
    emoji: '🎯',
    label: 'Skin Trivia',
    color: 'text-pink-400',
    bg: 'bg-pink-500/15 border-pink-500/30',
    questionLabel: 'Question',
    answerLabel: 'Answer',
  },
  EMOJI_GUESS: {
    emoji: '🧩',
    label: 'Emoji Guess',
    color: 'text-green-400',
    bg: 'bg-green-500/15 border-green-500/30',
    questionLabel: 'Emoji Clue',
    answerLabel: 'Hero',
  },
  GENERAL: {
    emoji: '📖',
    label: 'General',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15 border-blue-500/30',
    questionLabel: 'Question',
    answerLabel: 'Answer',
  },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h';
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + 'd';
  return Math.floor(days / 7) + 'w';
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v|avi)$/i.test(url) || url.includes('/video/');
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(url);
}

/* ================================================================
   Animated Background
   ================================================================ */

const AnimatedBackground = () => (
  <>
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.2]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
    />
    <motion.div
      className="pointer-events-none absolute -top-40 -left-40 w-125 h-125 rounded-full bg-orange-500/6 blur-[120px]"
      animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.08, 1] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="pointer-events-none absolute -bottom-32 -right-32 w-105 h-105 rounded-full bg-blue-600/5 blur-[100px]"
      animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.06, 1] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
    />
    <motion.div
      className="pointer-events-none absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-[#e8a000]/4 blur-[90px]"
      animate={{ opacity: [0.2, 0.45, 0.2] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
    />
    {Array.from({ length: 8 }).map((_, i) => (
      <motion.div
        key={i}
        className="pointer-events-none absolute w-px h-px bg-white/20 rounded-full"
        style={{ left: (10 + i * 11) + '%', top: (8 + ((i * 19) % 75)) + '%' }}
        animate={{ opacity: [0, 0.5, 0], y: [0, -25, 0] }}
        transition={{ duration: 4 + (i % 3), repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
      />
    ))}
    <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
      <motion.div
        className="absolute top-0 h-px w-32 bg-linear-to-r from-transparent via-[#e8a000]/40 to-transparent"
        animate={{ left: ['-10%', '110%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  </>
);

/* ================================================================
   Clip of the Week Banner
   ================================================================ */

const ClipOfWeekBanner = ({ data }: { data: ClipOfWeekData }) => {
  const post = data.post;
  const winner = data.winner ?? post.author;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-[#e8a000]/20 bg-linear-to-br from-[#e8a000]/8 via-white/2 to-transparent mb-8"
    >
      <div className="absolute inset-0">
        {post.mediaUrl && (
          <Image src={post.mediaUrl} alt="" fill className="object-cover opacity-15 blur-sm" />
        )}
        <div className="absolute inset-0 bg-linear-to-r from-[#0a0a0f]/95 via-[#0a0a0f]/70 to-[#0a0a0f]/90" />
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 sm:p-6">
        {/* Trophy badge */}
        <div className="shrink-0 w-14 h-14 rounded-xl bg-[#e8a000]/15 border border-[#e8a000]/30 flex items-center justify-center">
          <Trophy size={28} className="text-[#e8a000]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#e8a000] text-[10px] font-bold tracking-[0.2em] uppercase">Clip of the Week</span>
            {data.bannerText && (
              <span className="text-zinc-500 text-[10px] tracking-wide">— {data.bannerText}</span>
            )}
          </div>
          <p className="text-white font-bold text-lg leading-tight truncate">
            {post.title ?? post.content.slice(0, 60)}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              {winner.photo ? (
                <Image src={winner.photo} alt="" width={18} height={18} className="rounded-full object-cover" />
              ) : (
                <div className="w-4.5 h-4.5 rounded-full bg-[#e8a000]/20 flex items-center justify-center text-[8px] text-[#e8a000] font-bold">
                  {(winner.ign ?? '?')[0]}
                </div>
              )}
              <span className="text-zinc-400 text-xs">@{winner.ign ?? 'player'}</span>
            </div>
            <span className="text-emerald-400 text-xs flex items-center gap-1">
              <TrendingUp size={12} /> {post.reactionScore}
            </span>
            <span className="text-zinc-600 text-xs flex items-center gap-1">
              <MessageSquare size={12} /> {post._count?.comments ?? 0}
            </span>
          </div>
        </div>

        {/* Media preview */}
        {post.mediaUrl && (
          <div className="shrink-0 w-28 h-20 rounded-lg overflow-hidden relative bg-black/40 hidden sm:block">
            <Image src={post.mediaUrl} alt="" fill className="object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Film size={14} className="text-white" />
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ================================================================
   Avatar Component
   ================================================================ */

const Avatar = ({ user, size = 32 }: { user: Author; size?: number }) => (
  <div className="shrink-0 rounded-full overflow-hidden bg-white/5 border border-white/8" style={{ width: size, height: size }}>
    {user.photo ? (
      <Image src={user.photo} alt={user.ign ?? ''} width={size} height={size} className="object-cover" />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-[#e8a000] font-bold" style={{ fontSize: size * 0.4 }}>
        {(user.ign ?? '?')[0].toUpperCase()}
      </div>
    )}
  </div>
);

/* ================================================================
   Post Card
   ================================================================ */

const PostCard = ({ post, onReact, reactionLoadingId }: { post: Post; onReact: (postId: string, type: ReactionType) => void; reactionLoadingId: string | null }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAllReactions, setShowAllReactions] = useState(false);
  const badge = TYPE_BADGE[post.type];

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const res = await fetch('/api/community/posts/' + post.id + '/comments');
      const data = await res.json();
      if (data?.comments) setComments(data.comments);
    } catch { /* ignore */ }
    setLoadingComments(false);
  }, [post.id]);

  const toggleComments = () => {
    if (!showComments) loadComments();
    setShowComments(prev => !prev);
  };

  const submitComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await fetch('/api/community/posts/' + post.id + '/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      });
      setCommentText('');
      loadComments();
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const mainReactions = REACTION_CONFIG.slice(0, 3);
  const extraReactions = REACTION_CONFIG.slice(3);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      layout
      className="rounded-xl bg-white/2 border border-white/6 overflow-hidden hover:border-white/10 transition-all duration-300 group"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar user={post.author} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm truncate">@{post.author.ign ?? 'anon'}</span>
            <span className={'text-white text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ' + badge.bg}>
              {badge.icon} {badge.label}
            </span>
          </div>
          <span className="text-zinc-600 text-[11px] flex items-center gap-1">
            <Clock size={10} /> {timeAgo(post.createdAt)}
          </span>
        </div>
        {post.isClipOfWeek && (
          <div className="shrink-0 bg-[#e8a000]/15 border border-[#e8a000]/30 rounded-full px-2 py-0.5 flex items-center gap-1">
            <Trophy size={10} className="text-[#e8a000]" />
            <span className="text-[#e8a000] text-[9px] font-bold tracking-wider uppercase">COTW</span>
          </div>
        )}
      </div>

      {/* Title */}
      {post.title && (
        <p className="text-white font-bold text-base px-4 mt-1 leading-tight">{post.title}</p>
      )}

      {/* Content */}
      <p className="text-zinc-300 text-sm px-4 py-2 leading-relaxed whitespace-pre-wrap">{post.content}</p>

      {/* Media */}
      {post.mediaUrl && (
        <div className="mx-4 mb-3 relative aspect-video rounded-lg overflow-hidden bg-black/40">
          {isVideoUrl(post.mediaUrl) ? (
            <video
              src={post.mediaUrl}
              className="absolute inset-0 w-full h-full object-cover"
              controls
              preload="metadata"
            />
          ) : (
            <Image src={post.mediaUrl} alt="" fill className="object-cover" />
          )}
          {post.type === 'CLIP' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">
                <Film size={20} className="text-white" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hero tag & tags */}
      {(post.heroSlug || post.tags.length > 0) && (
        <div className="flex items-center gap-1.5 px-4 pb-2 flex-wrap">
          {post.heroSlug && (
            <span className="text-[#e8a000] text-[10px] font-semibold tracking-wide bg-[#e8a000]/10 rounded-full px-2 py-0.5">
              #{post.heroSlug}
            </span>
          )}
          {post.tags.map(tag => (
            <span key={tag} className="text-zinc-500 text-[10px] tracking-wide border border-white/6 rounded-full px-2 py-0.5">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Score bar */}
      <div className="mx-4 mb-2 flex items-center gap-3 text-[11px]">
        <span className={'flex items-center gap-1 font-semibold ' + (post.reactionScore > 0 ? 'text-emerald-400' : post.reactionScore < 0 ? 'text-red-400' : 'text-zinc-500')}>
          <TrendingUp size={12} /> {post.reactionScore > 0 ? '+' : ''}{post.reactionScore}
        </span>
        <span className="text-zinc-600">{post._count.reactions} reactions</span>
        <span className="text-zinc-600">{post._count.comments} comments</span>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 mx-4" />

      {/* Reaction bar */}
      <div className="flex items-center gap-1 px-3 py-2 relative">
        {mainReactions.map(r => {
          const isActive = post.userReactionType === r.type;
          return (
            <button
              key={r.type}
              onClick={() => onReact(post.id, r.type)}
              disabled={reactionLoadingId === post.id}
              className={'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 ' +
                (isActive ? r.activeColor : r.color) +
                ' hover:bg-white/5 active:scale-95 ' +
                (reactionLoadingId === post.id ? 'opacity-50 cursor-not-allowed' : '')}
              title={r.label}
            >
              {r.icon}
              <span className="hidden sm:inline text-[11px]">{r.label}</span>
            </button>
          );
        })}

        {/* More reactions toggle */}
        <div className="relative">
          <button
            onClick={() => setShowAllReactions(prev => !prev)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <Plus size={14} />
          </button>
          <AnimatePresence>
            {showAllReactions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                className="absolute bottom-full left-0 mb-1 flex items-center gap-0.5 bg-zinc-900 border border-white/10 rounded-xl px-2 py-1.5 shadow-xl z-20"
              >
                {extraReactions.map(r => {
                  const isActive = post.userReactionType === r.type;
                  return (
                    <button
                      key={r.type}
                      onClick={() => { if (reactionLoadingId !== post.id) { onReact(post.id, r.type); setShowAllReactions(false); } }}
                      disabled={reactionLoadingId === post.id}
                      className={'flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ' +
                        (isActive ? r.activeColor : r.color) +
                        ' hover:bg-white/5 ' +
                        (reactionLoadingId === post.id ? 'opacity-50 cursor-not-allowed' : '')}
                      title={r.label}
                    >
                      {r.icon}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1" />

        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-blue-400 hover:bg-white/5 transition-all"
        >
          <MessageSquare size={14} />
          <span>{post._count.comments}</span>
          <ChevronDown size={12} className={'transition-transform duration-200 ' + (showComments ? 'rotate-180' : '')} />
        </button>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 px-4 py-3 bg-white/1">
              {/* Comment input */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
                  placeholder="Write a comment..."
                  className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#e8a000]/40 transition-colors"
                />
                <button
                  onClick={submitComment}
                  disabled={submitting || !commentText.trim()}
                  className="shrink-0 w-8 h-8 rounded-lg bg-[#e8a000]/15 border border-[#e8a000]/30 flex items-center justify-center text-[#e8a000] hover:bg-[#e8a000]/25 transition-colors disabled:opacity-30"
                >
                  <Send size={14} />
                </button>
              </div>

              {/* Comments list */}
              {loadingComments ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full animate-pulse bg-white/5" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 w-20 animate-pulse bg-white/5 rounded" />
                        <div className="h-3 w-3/4 animate-pulse bg-white/5 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <p className="text-zinc-600 text-xs text-center py-2">No comments yet. Be the first!</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {comments.map(c => (
                    <CommentItem key={c.id} comment={c} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
};

/* ================================================================
   Comment Item
   ================================================================ */

const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => (
  <div className={'flex gap-2 ' + (depth > 0 ? 'ml-6 mt-2' : '')}>
    <Avatar user={comment.user} size={24} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-white text-xs font-semibold">@{comment.user.ign ?? 'anon'}</span>
        <span className="text-zinc-700 text-[10px]">{timeAgo(comment.createdAt)}</span>
      </div>
      <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">{comment.content}</p>
      {comment.replies?.length > 0 && (
        <div className="mt-1">
          {comment.replies.map(r => (
            <CommentItem key={r.id} comment={r} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  </div>
);

/* ================================================================
   Compose Modal  — redesigned
   ================================================================ */

const TYPE_ACCENT: Record<string, string> = {
  CLIP: '#a78bfa',
  MEME: '#facc15',
  HOT_TAKE: '#f97316',
  BUILD_SCREENSHOT: '#34d399',
  ROAST: '#f87171',
};

const ComposeModal = ({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: () => void }) => {
  const [type, setType] = useState<PostType>('HOT_TAKE');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [showTitle, setShowTitle] = useState(true);
  const [heroSlug, setHeroSlug] = useState('');
  const [showHero, setShowHero] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const MAX = 500;

  // Revoke object URL on unmount only
  useEffect(() => () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); }, []);

  const pickFile = (f: File | null) => {
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
    setFile(f);
    setMediaError('');
    if (!f) { setPreview(null); return; }
    if (f.type.startsWith('image')) {
      previewUrlRef.current = URL.createObjectURL(f);
      setPreview(previewUrlRef.current);
    } else {
      setPreview('video');
    }
  };

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 80);
  }, [open]);

  const submit = async () => {
    if (!content.trim() || submitting || content.length > MAX) return;
    let uploadedUrl = '';
    if (file) {
      const isVideo = file.type.startsWith('video') || isVideoUrl(file.name);
      const isImage = file.type.startsWith('image') || isImageUrl(file.name);
      if (!isVideo && !isImage) { setMediaError('File must be an image or video.'); return; }
      setSubmitting(true);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = 'community/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safeName;
      const bucket = isVideo ? STORAGE_BUCKETS.VIDEOS : STORAGE_BUCKETS.IMAGES;
      const { url, error } = await uploadImage(bucket, path, file);
      if (error || !url) { setMediaError('Upload failed. Please try again.'); setSubmitting(false); return; }
      uploadedUrl = url;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          content,
          title: title.trim() || undefined,
          mediaUrl: uploadedUrl || undefined,
          heroSlug: heroSlug.trim() || undefined,
        }),
      });
      if (res.ok) {
        setContent(''); setTitle(''); setFile(null); setPreview(null); setMediaError('');
        if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
        setHeroSlug(''); setShowTitle(false); setShowHero(false);
        onPosted(); onClose();
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const typeConfig = POST_TYPES.find(t => t.value === type) ?? POST_TYPES[1];
  const accent = TYPE_ACCENT[type] ?? '#e8a000';
  const charsLeft = MAX - content.length;
  const overLimit = charsLeft < 0;

  // SVG ring for character counter
  const ring = 20;
  const r = 8;
  const circ = 2 * Math.PI * r;
  const progress = Math.min(content.length / MAX, 1);
  const dash = circ * progress;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — desktop only */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="hidden sm:block fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-105 flex flex-col bg-[#0a0a0f] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
            style={{ borderTop: `2px solid ${accent}33` }}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/10" />
            </div>

            {/* Type selector — horizontal scroll strip */}
            <div className="flex items-center gap-1.5 px-4 pt-2 pb-4 overflow-x-auto">
              {POST_TYPES.filter(t => t.value !== 'ALL').map(t => {
                const ac = TYPE_ACCENT[t.value] ?? '#e8a000';
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value as PostType)}
                    className={'flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border ' +
                      (active ? 'border-transparent text-black' : 'border-white/6 text-zinc-500 hover:text-zinc-300 bg-transparent')}
                    style={active ? { background: ac, boxShadow: `0 0 12px ${ac}55` } : {}}
                  >
                    {t.icon}<span className="ml-1">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/5 mx-4" />

            {/* Expandable title */}
            <AnimatePresence initial={false}>
              {showTitle && (
                <motion.div
                  key="title"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Add a title..."
                    className="w-full bg-transparent text-white font-semibold text-base placeholder-zinc-600 outline-none px-4 pt-3 pb-1"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main textarea — open, no box */}
            <div className="px-4 pt-3 pb-1">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`What's your ${typeConfig?.label?.toLowerCase() ?? 'take'}?`}
                rows={4}
                className="w-full bg-transparent text-white text-[15px] leading-relaxed placeholder-zinc-600 outline-none resize-none"
              />
            </div>

            {/* Expandable hero tag */}
            <AnimatePresence initial={false}>
              {showHero && (
                <motion.div
                  key="hero"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden px-4 pb-2"
                >
                  <div className="flex items-center gap-2 rounded-xl bg-white/4 border border-white/6 px-3 py-2">
                    <Gamepad2 size={13} className="text-zinc-500 shrink-0" />
                    <input
                      value={heroSlug}
                      onChange={e => setHeroSlug(e.target.value)}
                      placeholder="Hero, e.g. fanny"
                      className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none"
                    />
                    {heroSlug && (
                      <button onClick={() => setHeroSlug('')} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Media preview */}
            <AnimatePresence>
              {file && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden px-4 pb-3"
                >
                  <div className="relative inline-flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-3 py-2">
                    {preview && preview !== 'video' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-white/5 flex items-center justify-center">
                        <Film size={16} className="text-zinc-400" />
                      </div>
                    )}
                    <span className="text-[11px] text-zinc-400 max-w-40 truncate">{file.name}</span>
                    <button
                      onClick={() => pickFile(null)}
                      className="ml-auto text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {mediaError && <p className="text-[11px] text-red-400 mt-1">{mediaError}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-2.5 border-t border-white/5">
              {/* Media */}
              <label className="w-9 h-9 rounded-xl hover:bg-white/5 flex items-center justify-center cursor-pointer transition-colors group">
                <Camera size={17} className={`transition-colors ${file ? 'text-[#e8a000]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => pickFile(e.target.files?.[0] ?? null)} />
              </label>

              {/* Title toggle */}
              <button
                onClick={() => setShowTitle(v => !v)}
                className={`w-9 h-9 rounded-xl hover:bg-white/5 flex items-center justify-center transition-colors ${showTitle ? 'text-[#e8a000]' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Type size={15} />
              </button>

              {/* Hero toggle */}
              <button
                onClick={() => setShowHero(v => !v)}
                className={`w-9 h-9 rounded-xl hover:bg-white/5 flex items-center justify-center transition-colors ${showHero ? 'text-[#e8a000]' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Gamepad2 size={15} />
              </button>

              <div className="flex-1" />

              {/* Char counter ring */}
              <div className="relative flex items-center justify-center w-9 h-9 mr-1">
                <svg width={ring} height={ring} className="-rotate-90">
                  <circle cx={ring / 2} cy={ring / 2} r={r} fill="none" stroke="#ffffff12" strokeWidth="2" />
                  <circle
                    cx={ring / 2} cy={ring / 2} r={r} fill="none"
                    stroke={overLimit ? '#f87171' : charsLeft < 50 ? '#facc15' : accent}
                    strokeWidth="2"
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    className="transition-all"
                  />
                </svg>
                {charsLeft <= 50 && (
                  <span className={`absolute text-[9px] font-bold ${overLimit ? 'text-red-400' : 'text-zinc-400'}`}>
                    {overLimit ? `-${Math.abs(charsLeft)}` : charsLeft}
                  </span>
                )}
              </div>

              {/* Post button */}
              <button
                onClick={submit}
                disabled={!content.trim() || submitting || overLimit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: accent, boxShadow: content.trim() && !overLimit ? `0 0 16px ${accent}44` : 'none' }}
              >
                {submitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full"
                  />
                ) : <Send size={12} />}
                Post
              </button>
            </div>

            {/* Bottom safe-area spacer on mobile */}
            <div className="pb-[env(safe-area-inset-bottom)] sm:hidden" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/* ================================================================
   Trending Sidebar (top memes)
   ================================================================ */

const TrendingSidebar = ({ memes }: { memes: MemeData[] }) => {
  if (memes.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl bg-white/2 border border-white/6 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <Flame size={14} className="text-orange-400" />
        <h3 className="text-white font-bold text-xs uppercase tracking-widest">Trending Memes</h3>
      </div>
      <div className="divide-y divide-white/5">
        {memes.slice(0, 5).map((meme, i) => (
          <div key={meme.id} className="flex items-center gap-3 px-4 py-3 group cursor-pointer hover:bg-white/2 transition-colors">
            <span className="text-[#e8a000] font-bold text-xs w-4">{i + 1}</span>
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 shrink-0 relative">
              <Image src={meme.imageUrl} alt="" fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-zinc-300 text-[11px] leading-tight truncate group-hover:text-white transition-colors">
                {meme.caption ?? meme.template?.name ?? 'Meme #' + (i + 1)}
              </p>
              <p className="text-zinc-600 text-[9px] mt-0.5">@{meme.user.ign ?? 'anon'}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/* ================================================================
   Trivia Sidebar Card — Multiple Choice Quiz
   ================================================================ */

const TriviaSidebarCard = ({
  trivia,
  imageUrl,
  loading,
  onAnswer,
  onSkip,
  error,
  answerLoading,
  countdown,
  userTotalXp,
  dailyAnswered,
  dailyLimit,
  currentIndex,
  totalTrivias,
}: {
  trivia: TriviaFact | null;
  imageUrl: string | null;
  loading: boolean;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
  error: string | null;
  answerLoading: boolean;
  countdown: number | null;
  userTotalXp: number;
  dailyAnswered: number;
  dailyLimit: number;
  currentIndex: number;
  totalTrivias: number;
}) => {
  const categoryKey = trivia?.category ?? 'GENERAL';
  const categoryConfig = TRIVIA_CATEGORY_CONFIG[categoryKey] ?? TRIVIA_CATEGORY_CONFIG.GENERAL;
  const isEmojiGuess = categoryKey === 'EMOJI_GUESS';
  const isGuessTheHero = categoryKey === 'GUESS_THE_HERO';

  const hasAnswered = trivia?.hasAnswered ?? false;
  const userAnswer = trivia?.userAnswer ?? null;
  const isCorrect = trivia?.isCorrect ?? null;
  const correctAnswer = trivia?.correctAnswer ?? null;
  const xpAwarded = trivia?.xpAwarded ?? null;
  const reveal = trivia?.reveal ?? null;
  const choices = trivia?.choices ?? [];

  // Stats from current trivia
  const stats = {
    totalAttempts: trivia?.totalAttempts ?? 0,
    correctCount: trivia?.correctCount ?? 0,
  };

  // Calculate success rate
  const successRate = stats.totalAttempts > 0
    ? Math.round((stats.correctCount / stats.totalAttempts) * 100)
    : 0;

  // Check if all trivias completed for today
  const allCompleted = totalTrivias === 0 || (currentIndex >= totalTrivias && !countdown);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative overflow-hidden rounded-xl bg-white/2 border border-white/6"
    >
      <div className="absolute inset-0">
        {imageUrl ? (
          <Image src={imageUrl} alt="Trivia" fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(232,160,0,0.08),transparent_45%),radial-gradient(circle_at_80%_40%,rgba(59,130,246,0.08),transparent_40%),#0d0d14]" />
        )}
        <div className="absolute inset-0 bg-linear-to-br from-[#0d0d14]/92 via-[#0d0d14]/85 to-[#0d0d14]/96" />
      </div>

      <div className="relative z-10 p-4 space-y-3">
        {/* Header with XP display */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#e8a000]/15 border border-[#e8a000]/30 flex items-center justify-center">
              <Brain size={16} className="text-[#e8a000]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e8a000]">Daily Quiz</p>
              <p className="text-[11px] text-zinc-500">{currentIndex + 1}/{dailyLimit} • {userTotalXp} XP earned</p>
            </div>
          </div>
          {trivia && !allCompleted && (
            <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-1 rounded-full border ${categoryConfig.bg} ${categoryConfig.color}`}>
              {categoryConfig.emoji} {categoryConfig.label}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#e8a000]"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((dailyAnswered / dailyLimit) * 100, 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-4 w-2/3 bg-white/5 animate-pulse rounded" />
            <div className="h-3 w-full bg-white/5 animate-pulse rounded" />
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 bg-white/5 animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        ) : allCompleted ? (
          /* All trivias completed for today */
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Check size={24} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">All Done for Today!</p>
              <p className="text-zinc-500 text-[11px] mt-1">You&apos;ve completed {dailyAnswered} quiz{dailyAnswered !== 1 ? 'zes' : ''}</p>
            </div>
            <div className="bg-[#e8a000]/10 border border-[#e8a000]/30 rounded-lg px-3 py-2">
              <p className="text-[11px] text-zinc-400">Total XP Earned</p>
              <p className="text-[#e8a000] font-black text-lg">{userTotalXp} XP</p>
            </div>
            <p className="text-zinc-600 text-[10px]">Come back tomorrow for more!</p>
          </div>
        ) : trivia ? (
          <>
            {/* Question label */}
            <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${categoryConfig.color}`}>
              {categoryConfig.questionLabel}
            </p>

            {/* Question/Clue display */}
            {isEmojiGuess ? (
              <div className="text-center py-2">
                <p className="text-3xl leading-relaxed tracking-wider">{trivia.teaser}</p>
                <p className="text-zinc-500 text-[11px] mt-1">Guess the hero!</p>
              </div>
            ) : (
              <>
                {trivia.title && (
                  <p className="text-white font-semibold text-sm leading-tight">{trivia.title}</p>
                )}
                <p className="text-zinc-400 text-[13px] leading-relaxed">{trivia.teaser}</p>
              </>
            )}

            {/* Hero tag (hidden for guessing categories) */}
            {trivia.heroSlug && !isGuessTheHero && !isEmojiGuess && (
              <span className="inline-block text-[10px] font-semibold tracking-wide text-[#e8a000] bg-[#e8a000]/15 border border-[#e8a000]/30 rounded-full px-2 py-0.5">
                #{trivia.heroSlug}
              </span>
            )}

            {error && <p className="text-[11px] text-red-300">{error}</p>}

            {/* Multiple Choice Buttons */}
            {!hasAnswered ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {choices.map((choice, idx) => (
                    <button
                      key={idx}
                      onClick={() => onAnswer(choice)}
                      disabled={answerLoading}
                      className="flex items-center justify-center rounded-lg border border-white/10 bg-white/3 px-3 py-2.5 text-[12px] font-semibold text-zinc-200 transition-all hover:border-[#e8a000]/40 hover:bg-[#e8a000]/10 hover:text-white disabled:opacity-50 active:scale-95"
                    >
                      {answerLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-white rounded-full"
                        />
                      ) : (
                        choice
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-600 text-center">
                  {stats.totalAttempts > 0 ? `${stats.totalAttempts} attempts • ${successRate}% success rate` : 'Be the first to try!'}
                </p>
              </>
            ) : (
              <>
                {/* Result feedback */}
                <div className={`rounded-lg border p-3 ${isCorrect ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {isCorrect ? (
                      <>
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Check size={14} className="text-emerald-400" />
                        </div>
                        <span className="text-emerald-400 font-bold text-sm">Correct! +{xpAwarded} XP</span>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                          <X size={14} className="text-red-400" />
                        </div>
                        <span className="text-red-400 font-bold text-sm">Wrong!</span>
                      </>
                    )}
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Your answer: <span className={isCorrect ? 'text-emerald-300' : 'text-red-300'}>{userAnswer}</span>
                  </p>
                  {!isCorrect && correctAnswer && (
                    <p className="text-zinc-400 text-[11px]">
                      Correct answer: <span className="text-emerald-300">{correctAnswer}</span>
                    </p>
                  )}
                </div>

                {/* Show answer choices with indicators */}
                <div className="grid grid-cols-2 gap-2">
                  {choices.map((choice, idx) => {
                    const isUserChoice = choice === userAnswer;
                    const isRightAnswer = choice === correctAnswer;
                    let buttonClass = 'border-white/5 bg-white/2 text-zinc-500';
                    if (isRightAnswer) buttonClass = 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
                    else if (isUserChoice && !isCorrect) buttonClass = 'border-red-500/40 bg-red-500/15 text-red-300';

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-center rounded-lg border px-3 py-2 text-[11px] font-semibold ${buttonClass}`}
                      >
                        {choice}
                        {isRightAnswer && <Check size={12} className="ml-1.5 text-emerald-400" />}
                        {isUserChoice && !isCorrect && <X size={12} className="ml-1.5 text-red-400" />}
                      </div>
                    );
                  })}
                </div>

                {/* Reveal/Explanation */}
                {reveal && (
                  <div className={`rounded-lg border p-3 ${categoryConfig.bg}`}>
                    <p className={`text-[10px] uppercase tracking-[0.15em] font-black mb-1 ${categoryConfig.color}`}>
                      {categoryConfig.answerLabel}
                    </p>
                    <p className="text-white text-[12px] leading-relaxed whitespace-pre-wrap">{reveal}</p>
                  </div>
                )}

                {/* Stats */}
                <p className="text-[11px] text-zinc-600 text-center">
                  {stats.totalAttempts} attempts • {successRate}% got it right
                </p>

                {/* Countdown Timer + Next Button */}
                {countdown !== null && currentIndex < totalTrivias - 1 && (
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="relative w-8 h-8">
                        <svg className="w-8 h-8 -rotate-90">
                          <circle
                            cx="16"
                            cy="16"
                            r="14"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            className="text-white/10"
                          />
                          <circle
                            cx="16"
                            cy="16"
                            r="14"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            strokeDasharray={88}
                            strokeDashoffset={88 - (countdown / 10) * 88}
                            className="text-[#e8a000] transition-all duration-1000"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                          {countdown}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500">Next question in {countdown}s</span>
                    </div>
                    <button
                      onClick={onSkip}
                      className="text-[10px] font-bold uppercase tracking-wider text-[#e8a000] hover:text-white transition-colors flex items-center gap-1"
                    >
                      Skip <ChevronRight size={14} />
                    </button>
                  </div>
                )}

                {/* Final message when on last trivia */}
                {countdown !== null && currentIndex >= totalTrivias - 1 && (
                  <div className="text-center pt-2 border-t border-white/10">
                    <p className="text-[11px] text-zinc-500">That was the last one! Come back tomorrow.</p>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <p className="text-zinc-500 text-sm">No active trivia today. Check back soon.</p>
        )}
      </div>
    </motion.div>
  );
};

/* ================================================================
   Stats Bar
   ================================================================ */

const StatsBar = ({ totalPosts, loading }: { totalPosts: number; loading: boolean }) => (
  <div className="flex items-center gap-4 py-3 px-4 rounded-xl bg-white/2 border border-white/6 mb-6">
    <div className="flex items-center gap-2">
      <MessageCircle size={14} className="text-[#e8a000]" />
      <span className="text-zinc-400 text-xs">
        {loading ? '...' : totalPosts.toLocaleString()} posts
      </span>
    </div>
    <div className="h-3 w-px bg-white/6" />
    <div className="flex items-center gap-2">
      <Zap size={14} className="text-emerald-400" />
      <span className="text-zinc-400 text-xs">Live Feed</span>
    </div>
  </div>
);

/* ================================================================
   Skeleton
   ================================================================ */

const PostSkeleton = () => (
  <div className="rounded-xl bg-white/2 border border-white/6 p-4 space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full animate-pulse bg-white/5" />
      <div className="space-y-1.5">
        <div className="h-3 w-24 animate-pulse bg-white/5 rounded" />
        <div className="h-2.5 w-16 animate-pulse bg-white/5 rounded" />
      </div>
    </div>
    <div className="h-4 w-3/4 animate-pulse bg-white/5 rounded" />
    <div className="h-3 w-full animate-pulse bg-white/5 rounded" />
    <div className="h-3 w-2/3 animate-pulse bg-white/5 rounded" />
    <div className="h-px bg-white/5" />
    <div className="flex gap-2">
      {[1, 2, 3].map(i => <div key={i} className="h-7 w-14 animate-pulse bg-white/5 rounded-lg" />)}
    </div>
  </div>
);

/* ================================================================
   Main Page
   ================================================================ */

export default function CommunityPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const [posts, setPosts] = useState<Post[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [memes, setMemes] = useState<MemeData[]>([]);
  const [clipOfWeek, setClipOfWeek] = useState<ClipOfWeekData | null>(null);
  // Trivia state
  const [triviaState, setTriviaState] = useState<TriviaState>({
    trivias: [],
    currentIndex: 0,
    userTotalXp: 0,
    dailyAnswered: 0,
    dailyLimit: 5,
    countdown: null,
  });
  const [triviaImage, setTriviaImage] = useState<string | null>(null);
  const [triviaError, setTriviaError] = useState<string | null>(null);
  const [triviaLoading, setTriviaLoading] = useState(false);
  const [triviaAnswerLoading, setTriviaAnswerLoading] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [reactionLoadingId, setReactionLoadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PostType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'score' | 'new'>('new');
  const [composeOpen, setComposeOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const skipRef = useRef(0);

  const loadPosts = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      skipRef.current = 0;
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({ limit: '20', skip: String(skipRef.current) });
      if (filter !== 'ALL') params.set('type', filter);

      const res = await fetch('/api/community/posts?' + params.toString());
      const data = await res.json();
      const newPosts: Post[] = data?.posts ?? [];
      const total = data?.pagination?.total ?? 0;

      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      setTotalPosts(total);
      setHasMore(skipRef.current + newPosts.length < total);
      skipRef.current += newPosts.length;
    } catch { /* ignore */ }

    setLoading(false);
    setLoadingMore(false);
  }, [filter]);

  // Sort locally
  const sorted = useMemo(() => {
    const arr = [...posts];
    if (sortBy === 'new') arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else arr.sort((a, b) => b.reactionScore - a.reactionScore);
    return arr;
  }, [posts, sortBy]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  useEffect(() => { loadPosts(true); }, [filter]);

  // Load memes + clip of week once
  useEffect(() => {
    Promise.all([
      fetch('/api/memes').then(r => r.ok ? r.json() : null),
      fetch('/api/clips/weekly').then(r => r.ok ? r.json() : null),
    ]).then(([memeData, clipData]) => {
      if (memeData?.memes) setMemes(memeData.memes);
      if (clipData?.featured) setClipOfWeek(clipData.featured);
    }).catch(() => undefined);
  }, []);

  // Load trivia and pick a decorative image; prefer stored images, fallback to images/trivia bucket
  useEffect(() => {
    setTriviaLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/trivia/current', { cache: 'no-store' });
        const data = await res.json();
        const trivias = (data?.trivias ?? []) as TriviaFact[];
        
        setTriviaState(prev => ({
          ...prev,
          trivias,
          currentIndex: 0,
          userTotalXp: data?.userTotalXp ?? 0,
          dailyAnswered: data?.dailyAnswered ?? 0,
          dailyLimit: data?.dailyLimit ?? 5,
        }));

        // Set image for first trivia
        const firstTrivia = trivias[0];
        if (firstTrivia) {
          if (firstTrivia.images?.length) {
            const firstImage = firstTrivia.images[0];
            if (firstImage.startsWith('http')) {
              setTriviaImage(firstImage);
            } else {
              const { data: urlData } = supabase.storage.from(STORAGE_BUCKETS.IMAGES).getPublicUrl(firstImage);
              setTriviaImage(urlData.publicUrl ?? firstImage);
            }
          } else {
            const { data: files, error } = await supabase.storage
              .from(STORAGE_BUCKETS.IMAGES)
              .list('trivia', { limit: 20, sortBy: { column: 'created_at', order: 'desc' } });

            if (!error && files?.length) {
              const path = 'trivia/' + files[0].name;
              const { data: urlData } = supabase.storage.from(STORAGE_BUCKETS.IMAGES).getPublicUrl(path);
              setTriviaImage(urlData.publicUrl);
            }
          }
        }
      } catch {
        setTriviaState(prev => ({ ...prev, trivias: [] }));
      }

      setTriviaLoading(false);
    })();

    // Cleanup countdown on unmount
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Socket.io Realtime — prepend new posts without a manual refresh
  useEffect(() => {
    const socket = getSocket();

    const handleNewPost = (post: Post) => {
      if (!post?.id) return;

      setPosts(prev => prev.some(p => p.id === post.id) ? prev : [post, ...prev]);
      setTotalPosts(prev => prev + 1);

      // Browser notification — only for other users' posts
      if (
        post.author?.id !== currentUserId &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const authorName = post.author?.ign ?? 'Someone';
        const body = post.title
          ? post.title
          : post.content.length > 80
            ? post.content.slice(0, 80) + '…'
            : post.content;

        const notif = new Notification(`${authorName} posted in Community`, {
          body,
          icon: '/mlbb_logo.png',
          badge: '/mlbb_logo.png',
          tag: 'community-post-' + post.id,
        });
        notif.onclick = () => { window.focus(); notif.close(); };
      }
    };

    socket.on('new-post', handleNewPost);
    return () => { socket.off('new-post', handleNewPost); };
  }, [currentUserId]);

  const handleReact = async (postId: string, type: ReactionType) => {
    if (reactionLoadingId === postId) return;
    setReactionLoadingId(postId);

    try {
      const res = await fetch('/api/community/posts/' + postId + '/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();

      if (res.ok) {
        const up = typeof data?.upvoteCount === 'number' ? data.upvoteCount : undefined;
        const down = typeof data?.downvoteCount === 'number' ? data.downvoteCount : undefined;

        setPosts(prev =>
          prev.map(p => {
            if (p.id !== postId) return p;
            if (up === undefined || down === undefined) return p;
            const reactionScore = up - down;
            const reactionsTotal = Math.max(p._count?.reactions ?? 0, up + down);
            return {
              ...p,
              upvoteCount: up,
              downvoteCount: down,
              reactionScore,
              userReactionType: data?.reaction?.type ?? type,
              _count: { ...p._count, reactions: reactionsTotal },
            };
          })
        );
      }
    } catch {
      /* ignore */
    }

    setReactionLoadingId(null);
  };

  // Handle trivia answer selection
  const handleTriviaAnswer = async (answer: string) => {
    const currentTrivia = triviaState.trivias[triviaState.currentIndex];
    if (!currentTrivia?.id || triviaAnswerLoading || currentTrivia.hasAnswered) return;
    setTriviaAnswerLoading(true);
    setTriviaError(null);

    try {
      const res = await fetch('/api/trivia/' + currentTrivia.id + '/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Handle "already answered" scenario
        try {
          const parsed = typeof data?.error === 'string' ? JSON.parse(data.error) : null;
          if (parsed?.userAnswer) {
            // Update the current trivia with answer data
            setTriviaState(prev => {
              const updated = [...prev.trivias];
              updated[prev.currentIndex] = {
                ...updated[prev.currentIndex],
                hasAnswered: true,
                userAnswer: parsed.userAnswer,
                isCorrect: parsed.isCorrect,
                correctAnswer: parsed.correctAnswer,
                xpAwarded: parsed.xpAwarded,
                reveal: parsed.reveal,
                totalAttempts: parsed.totalAttempts ?? updated[prev.currentIndex].totalAttempts,
                correctCount: parsed.correctCount ?? updated[prev.currentIndex].correctCount,
              };
              return {
                ...prev,
                trivias: updated,
                userTotalXp: prev.userTotalXp + (parsed.xpAwarded ?? 0),
                dailyAnswered: prev.dailyAnswered + 1,
              };
            });
            startCountdown();
          } else {
            setTriviaError(parsed?.message || data?.error || 'Unable to submit answer.');
          }
        } catch {
          setTriviaError(data?.error ?? 'Unable to submit answer.');
        }
      } else {
        // Success! Update trivia state with result
        setTriviaState(prev => {
          const updated = [...prev.trivias];
          updated[prev.currentIndex] = {
            ...updated[prev.currentIndex],
            hasAnswered: true,
            userAnswer: data.userAnswer,
            isCorrect: data.isCorrect,
            correctAnswer: data.correctAnswer,
            xpAwarded: data.xpAwarded,
            reveal: data.reveal,
            totalAttempts: data.totalAttempts ?? (updated[prev.currentIndex].totalAttempts ?? 0) + 1,
            correctCount: data.correctCount ?? (data.isCorrect ? (updated[prev.currentIndex].correctCount ?? 0) + 1 : updated[prev.currentIndex].correctCount),
          };
          return {
            ...prev,
            trivias: updated,
            userTotalXp: prev.userTotalXp + (data.xpAwarded ?? 0),
            dailyAnswered: prev.dailyAnswered + 1,
          };
        });
        startCountdown();
      }
    } catch {
      setTriviaError('Unable to submit answer.');
    }

    setTriviaAnswerLoading(false);
  };

  // Start 10 second countdown then advance to next trivia
  const startCountdown = () => {
    // Clear any existing countdown
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    setTriviaState(prev => ({ ...prev, countdown: 10 }));
    
    countdownRef.current = setInterval(() => {
      setTriviaState(prev => {
        if (prev.countdown === null || prev.countdown <= 1) {
          // Time's up - advance to next trivia
          if (countdownRef.current) clearInterval(countdownRef.current);
          const nextIndex = prev.currentIndex + 1;
          if (nextIndex < prev.trivias.length) {
            return { ...prev, countdown: null, currentIndex: nextIndex };
          }
          // No more trivias
          return { ...prev, countdown: null };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
  };

  // Skip countdown and go to next trivia immediately
  const skipToNextTrivia = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setTriviaState(prev => {
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex < prev.trivias.length) {
        return { ...prev, countdown: null, currentIndex: nextIndex };
      }
      return { ...prev, countdown: null };
    });
  };

  return (
    <main className="relative min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page header */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white font-bold text-2xl sm:text-3xl tracking-tight flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-[#e8a000]/15 border border-[#e8a000]/30 flex items-center justify-center">
              <MessageCircle size={20} className="text-[#e8a000]" />
            </div>
            Community Feed
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-500 text-sm mt-2 max-w-xl"
          >
            Clips, memes, hot takes, build screenshots, and roasts — share your MLBB Ghana moments.
          </motion.p>
        </div>

        {/* Clip of the week banner */}
        {clipOfWeek && <ClipOfWeekBanner data={clipOfWeek} />}

        <StatsBar totalPosts={totalPosts} loading={loading} />

        {/* Toolbar: filter tabs + sort + compose */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-1 flex-wrap flex-1">
            {POST_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setFilter(t.value as PostType | 'ALL')}
                className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ' +
                  (filter === t.value
                    ? 'bg-white/10 border-white/15 text-white '
                    : 'border-transparent text-zinc-500 hover:text-white hover:bg-white/5 ') + t.color}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort toggle */}
            <div className="flex items-center bg-white/3 rounded-lg border border-white/6 overflow-hidden">
              <button
                onClick={() => setSortBy('score')}
                className={'px-3 py-1.5 text-[11px] font-medium transition-all ' + (sortBy === 'score' ? 'text-[#e8a000] bg-[#e8a000]/10' : 'text-zinc-500 hover:text-white')}
              >
                <TrendingUp size={12} className="inline mr-1" /> Top
              </button>
              <button
                onClick={() => setSortBy('new')}
                className={'px-3 py-1.5 text-[11px] font-medium transition-all ' + (sortBy === 'new' ? 'text-[#e8a000] bg-[#e8a000]/10' : 'text-zinc-500 hover:text-white')}
              >
                <Clock size={12} className="inline mr-1" /> New
              </button>
            </div>

            {/* Compose button */}
            <button
              onClick={() => setComposeOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#e8a000] text-black text-xs font-bold uppercase tracking-wider hover:bg-[#d4900a] transition-colors"
            >
              <Plus size={14} /> Post
            </button>
          </div>
        </div>

        {/* Mobile Quiz Card — shown only on mobile/tablet */}
        <div className="lg:hidden mb-6">
          <TriviaSidebarCard
            trivia={triviaState.trivias[triviaState.currentIndex] ?? null}
            imageUrl={triviaImage}
            loading={triviaLoading}
            onAnswer={handleTriviaAnswer}
            onSkip={skipToNextTrivia}
            error={triviaError}
            answerLoading={triviaAnswerLoading}
            countdown={triviaState.countdown}
            userTotalXp={triviaState.userTotalXp}
            dailyAnswered={triviaState.dailyAnswered}
            dailyLimit={triviaState.dailyLimit}
            currentIndex={triviaState.currentIndex}
            totalTrivias={triviaState.trivias.length}
          />
        </div>

        {/* Main grid: feed + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Feed */}
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <PostSkeleton key={i} />)
            ) : sorted.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/6 flex items-center justify-center mb-4">
                  <MessageCircle size={28} className="text-zinc-600" />
                </div>
                <p className="text-zinc-500 text-sm mb-1">No posts yet</p>
                <p className="text-zinc-700 text-xs mb-4">Be the first to share something!</p>
                <button
                  onClick={() => setComposeOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#e8a000]/15 text-[#e8a000] text-xs font-bold uppercase tracking-wider hover:bg-[#e8a000]/25 transition-colors border border-[#e8a000]/30"
                >
                  Create Post
                </button>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {sorted.map(post => (
                  <PostCard key={post.id} post={post} onReact={handleReact} reactionLoadingId={reactionLoadingId} />
                ))}
              </AnimatePresence>
            )}

            {/* Load more */}
            {!loading && hasMore && sorted.length > 0 && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => loadPosts(false)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/3 border border-white/6 text-zinc-400 text-xs font-medium hover:text-white hover:border-white/10 transition-all disabled:opacity-40"
                >
                  {loadingMore ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-zinc-300 rounded-full"
                    />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>

          {/* Sidebar — desktop only */}
          <div className="hidden lg:flex flex-col gap-5">
            <TriviaSidebarCard
              trivia={triviaState.trivias[triviaState.currentIndex] ?? null}
              imageUrl={triviaImage}
              loading={triviaLoading}
              onAnswer={handleTriviaAnswer}
              onSkip={skipToNextTrivia}
              error={triviaError}
              answerLoading={triviaAnswerLoading}
              countdown={triviaState.countdown}
              userTotalXp={triviaState.userTotalXp}
              dailyAnswered={triviaState.dailyAnswered}
              dailyLimit={triviaState.dailyLimit}
              currentIndex={triviaState.currentIndex}
              totalTrivias={triviaState.trivias.length}
            />
            <TrendingSidebar memes={memes} />

            {/* Quick links */}
            <div className="rounded-xl bg-white/2 border border-white/6 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <h3 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={12} className="text-[#e8a000]" /> Quick Links
                </h3>
              </div>
              <div className="divide-y divide-white/5">
                {[
                  { label: 'Meme Generator', href: '/memes', icon: <Laugh size={14} className="text-yellow-400" /> },
                  { label: 'Leaderboard', href: '/leaderboard', icon: <Trophy size={14} className="text-[#e8a000]" /> },
                  { label: 'Active Polls', href: '/polls', icon: <MessageSquare size={14} className="text-blue-400" /> },
                  { label: 'Streamers', href: '/streamers', icon: <Film size={14} className="text-purple-400" /> },
                ].map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 px-4 py-3 group cursor-pointer hover:bg-white/2 transition-colors"
                  >
                    {link.icon}
                    <span className="text-zinc-400 text-[11px] tracking-wide group-hover:text-white transition-colors flex-1">{link.label}</span>
                    <ChevronRight size={12} className="text-zinc-700 group-hover:text-[#e8a000] transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compose modal */}
      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} onPosted={() => loadPosts(true)} />

      {/* Mobile FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        onClick={() => setComposeOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#e8a000] text-black shadow-lg shadow-[#e8a000]/20 flex items-center justify-center hover:bg-[#d4900a] transition-colors"
      >
        <Plus size={24} />
      </motion.button>
    </main>
  );
}
