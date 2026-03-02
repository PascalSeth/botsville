'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadImage, STORAGE_BUCKETS, supabase } from '@/lib/supabase';
import {
  Flame, ThumbsUp, ThumbsDown, Laugh, Eye, Zap, Heart,
  MessageSquare, ChevronRight, ChevronDown, Send, X,
  Gamepad2, Clapperboard, Swords, MessageCircle,
  Trophy, Plus, TrendingUp, Clock, Sparkles,
  Film, Camera, Brain,
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
  heroSlug?: string | null;
  images?: string[];
  trueCount?: number;
  falseCount?: number;
  totalVotes?: number;
  userChoice?: boolean | null;
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
   Compose Modal
   ================================================================ */

const ComposeModal = ({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: () => void }) => {
  const [type, setType] = useState<PostType>('HOT_TAKE');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [heroSlug, setHeroSlug] = useState('');
  const [mediaError, setMediaError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus();
  }, [open]);

  const submit = async () => {
    if (!content.trim() || submitting) return;
    let uploadedUrl = '';
    if (file) {
      const isVideo = file.type.startsWith('video') || isVideoUrl(file.name);
      const isImage = file.type.startsWith('image') || isImageUrl(file.name);

      if (!isVideo && !isImage) {
        setMediaError('File must be an image or video.');
        return;
      }

      setSubmitting(true);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = 'community/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safeName;
      const bucket = isVideo ? STORAGE_BUCKETS.VIDEOS : STORAGE_BUCKETS.IMAGES;
      const { url, error } = await uploadImage(bucket, path, file);
      if (error || !url) {
        setMediaError('Upload failed. Please try again.');
        setSubmitting(false);
        return;
      }
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
        setContent('');
        setTitle('');
        setFile(null);
        setMediaError('');
        setHeroSlug('');
        onPosted();
        onClose();
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const typeConfig = POST_TYPES.find(t => t.value === type) ?? POST_TYPES[1];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            className="w-full max-w-2xl bg-[#0d0d14] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
              <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={14} className="text-[#e8a000]" /> New Post
              </h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Type selector pills */}
              <div className="flex flex-wrap gap-1.5">
                {POST_TYPES.filter(t => t.value !== 'ALL').map(t => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value as PostType)}
                    className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ' +
                      (type === t.value
                        ? 'bg-white/10 border-white/15 text-white'
                        : 'border-white/5 text-zinc-500 hover:text-white hover:border-white/10')}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* Title (optional) */}
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full bg-white/3 border border-white/6 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#e8a000]/40 transition-colors"
              />

              {/* Content */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={'Share your ' + (typeConfig?.label?.toLowerCase() ?? 'thoughts') + '...'}
                rows={4}
                className="w-full bg-white/3 border border-white/6 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#e8a000]/40 transition-colors resize-none"
              />

              {/* Media URL */}
              <div className="space-y-2">
                <label className="relative flex flex-col gap-2 items-center justify-center border-2 border-dashed border-white/10 bg-white/3 hover:border-[#e8a000]/40 hover:bg-white/5 transition-colors rounded-xl px-4 py-6 text-center cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <Camera size={18} className="text-zinc-400" />
                  </div>
                  <div className="text-sm text-white font-medium">Upload image or video</div>
                  <div className="text-[11px] text-zinc-500">Videos are stored in the videos bucket automatically.</div>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={e => {
                      const f = e.target.files?.[0] ?? null;
                      setFile(f);
                      setMediaError('');
                    }}
                  />
                </label>
                {file && (
                  <p className="text-[11px] text-emerald-400 text-center">Attached: {file.name}</p>
                )}
                {mediaError && (
                  <span className="text-[11px] text-red-400 text-center">{mediaError}</span>
                )}
              </div>

              {/* Hero slug */}
              <div className="flex items-center gap-2 bg-white/3 border border-white/6 rounded-xl px-3 py-2">
                <Gamepad2 size={14} className="text-zinc-600 shrink-0" />
                <input
                  type="text"
                  value={heroSlug}
                  onChange={e => setHeroSlug(e.target.value)}
                  placeholder="Hero tag, eg: fanny (optional)"
                  className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!content.trim() || submitting}
                className="px-5 py-2 rounded-xl bg-[#e8a000] text-black text-xs font-bold uppercase tracking-wider hover:bg-[#d4900a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {submitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full"
                  />
                ) : (
                  <Send size={12} />
                )}
                Post
              </button>
            </div>
          </motion.div>
        </motion.div>
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
   Trivia Sidebar Card
   ================================================================ */

const TriviaSidebarCard = ({
  trivia,
  imageUrl,
  loading,
  reveal,
  revealLoading,
  onReveal,
  onVote,
  error,
  xpAwarded,
  voteChoice,
  voteCounts,
  voteLoading,
}: {
  trivia: TriviaFact | null;
  imageUrl: string | null;
  loading: boolean;
  reveal: string | null;
  revealLoading: boolean;
  onReveal: () => void;
  onVote: (choice: boolean) => void;
  error: string | null;
  xpAwarded: number | null;
  voteChoice: boolean | null;
  voteCounts: { trueCount: number; falseCount: number };
  voteLoading: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    className="relative overflow-hidden rounded-xl bg-white/2 border border-white/6"
  >
    <div className="absolute inset-0">
      {imageUrl ? (
        <Image src={imageUrl} alt="Trivia" fill className="object-cover " />
      ) : (
        <div className="w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(232,160,0,0.08),transparent_45%),radial-gradient(circle_at_80%_40%,rgba(59,130,246,0.08),transparent_40%),#0d0d14]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d14]/92 via-[#0d0d14]/85 to-[#0d0d14]/96" />
    </div>

    <div className="relative z-10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-[#e8a000]/15 border border-[#e8a000]/30 flex items-center justify-center">
          <Brain size={16} className="text-[#e8a000]" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e8a000]">Daily trivia</p>
          <p className="text-[11px] text-zinc-500">Reveal to earn XP.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-4 w-2/3 bg-white/5 animate-pulse rounded" />
          <div className="h-3 w-full bg-white/5 animate-pulse rounded" />
        </div>
      ) : trivia ? (
        <>
          <p className="text-white font-semibold text-sm leading-tight">{trivia.title}</p>
          <p className="text-zinc-400 text-[13px] leading-relaxed">{trivia.teaser}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {trivia.heroSlug && (
              <span className="text-[10px] font-semibold tracking-wide text-[#e8a000] bg-[#e8a000]/15 border border-[#e8a000]/30 rounded-full px-2 py-0.5">
                #{trivia.heroSlug}
              </span>
            )}
            {xpAwarded !== null && (
              <span className="text-[10px] font-semibold tracking-wide text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2 py-0.5">
                +{xpAwarded} XP
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onVote(true)}
              disabled={voteLoading || !!reveal || voteChoice !== null}
              className={'flex items-center justify-between rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ' +
                (voteChoice === true
                  ? 'border-emerald-400 bg-emerald-500/15 text-white'
                  : 'border-white/10 bg-white/3 text-zinc-200 hover:border-white/20')}
            >
              <span>True</span>
              <span className="text-emerald-300 text-xs">{voteCounts.trueCount.toLocaleString()}</span>
            </button>
            <button
              onClick={() => onVote(false)}
              disabled={voteLoading || !!reveal || voteChoice !== null}
              className={'flex items-center justify-between rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ' +
                (voteChoice === false
                  ? 'border-red-400 bg-red-500/15 text-white'
                  : 'border-white/10 bg-white/3 text-zinc-200 hover:border-white/20')}
            >
              <span>False</span>
              <span className="text-red-300 text-xs">{voteCounts.falseCount.toLocaleString()}</span>
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">{(voteCounts.trueCount + voteCounts.falseCount).toLocaleString()} votes so far.</p>

          {error && <p className="text-[11px] text-red-300">{error}</p>}

          {reveal ? (
            <div className="rounded-lg border border-white/10 bg-white/3 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#e8a000] font-black mb-1">Reveal</p>
              <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{reveal}</p>
            </div>
          ) : (
            <button
              onClick={onReveal}
              disabled={revealLoading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#e8a000] text-black text-[11px] font-black uppercase tracking-wider hover:bg-[#ffb800] transition-colors disabled:opacity-50"
            >
              {revealLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full"
                />
              ) : (
                <Sparkles size={12} />
              )}
              Reveal
            </button>
          )}
        </>
      ) : (
        <p className="text-zinc-500 text-sm">No active trivia today. Check back soon.</p>
      )}
    </div>
  </motion.div>
);

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [memes, setMemes] = useState<MemeData[]>([]);
  const [clipOfWeek, setClipOfWeek] = useState<ClipOfWeekData | null>(null);
  const [trivia, setTrivia] = useState<TriviaFact | null>(null);
  const [triviaImage, setTriviaImage] = useState<string | null>(null);
  const [triviaReveal, setTriviaReveal] = useState<string | null>(null);
  const [triviaChoice, setTriviaChoice] = useState<boolean | null>(null);
  const [triviaCounts, setTriviaCounts] = useState<{ trueCount: number; falseCount: number }>({ trueCount: 0, falseCount: 0 });
  const [triviaXp, setTriviaXp] = useState<number | null>(null);
  const [triviaError, setTriviaError] = useState<string | null>(null);
  const [triviaLoading, setTriviaLoading] = useState(false);
  const [triviaRevealLoading, setTriviaRevealLoading] = useState(false);
  const [triviaVoteLoading, setTriviaVoteLoading] = useState(false);
  const [reactionLoadingId, setReactionLoadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PostType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'score' | 'new'>('score');
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
        const triviaFact = data?.trivia as TriviaFact | null;
        setTrivia(triviaFact ?? null);
        setTriviaChoice(triviaFact?.userChoice ?? null);
        setTriviaCounts({
          trueCount: triviaFact?.trueCount ?? 0,
          falseCount: triviaFact?.falseCount ?? 0,
        });

        if (triviaFact) {
          if (triviaFact.images?.length) {
            const firstImage = triviaFact.images[0];
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
        setTrivia(null);
      }

      setTriviaLoading(false);
    })();
  }, []);

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

  const handleTriviaReveal = async () => {
    if (!trivia?.id || triviaRevealLoading) return;
    setTriviaRevealLoading(true);
    setTriviaError(null);

    try {
      const res = await fetch('/api/trivia/' + trivia.id + '/reveal', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setTriviaError(data?.error ?? 'Unable to reveal trivia right now.');
      } else {
        setTriviaReveal(data?.reveal ?? '');
        setTriviaXp(typeof data?.xpAwarded === 'number' ? data.xpAwarded : 0);
      }
    } catch {
      setTriviaError('Unable to reveal trivia right now.');
    }

    setTriviaRevealLoading(false);
  };

  const handleTriviaVote = async (choice: boolean) => {
    if (!trivia?.id || triviaVoteLoading || triviaReveal || triviaChoice !== null) return; // lock after first vote or reveal
    setTriviaVoteLoading(true);
    setTriviaError(null);

    try {
      const res = await fetch('/api/trivia/' + trivia.id + '/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      });
      const data = await res.json();

      if (!res.ok) {
        // If API encodes details in JSON string message, surface counts and choice
        try {
          const parsed = typeof data?.error === 'string' ? JSON.parse(data.error) : null;
          if (parsed?.userChoice !== undefined) {
            setTriviaChoice(parsed.userChoice);
            setTriviaCounts({ trueCount: parsed.trueCount ?? triviaCounts.trueCount, falseCount: parsed.falseCount ?? triviaCounts.falseCount });
            setTrivia(prev => prev ? { ...prev, trueCount: parsed.trueCount ?? triviaCounts.trueCount, falseCount: parsed.falseCount ?? triviaCounts.falseCount, totalVotes: parsed.totalVotes ?? (parsed.trueCount ?? 0) + (parsed.falseCount ?? 0), userChoice: parsed.userChoice } : prev);
          }
        } catch { /* ignore parse errors */ }
        setTriviaError(data?.error ?? 'Unable to record vote.');
      } else {
        const trueCount = typeof data?.trueCount === 'number' ? data.trueCount : triviaCounts.trueCount;
        const falseCount = typeof data?.falseCount === 'number' ? data.falseCount : triviaCounts.falseCount;
        const userChoice = typeof data?.userChoice === 'boolean' ? data.userChoice : choice;

        setTriviaChoice(userChoice);
        setTriviaCounts({ trueCount, falseCount });
        setTrivia(prev => prev ? { ...prev, trueCount, falseCount, totalVotes: data?.totalVotes ?? trueCount + falseCount, userChoice } : prev);
      }
    } catch {
      setTriviaError('Unable to record vote.');
    }

    setTriviaVoteLoading(false);
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
              trivia={trivia}
              imageUrl={triviaImage}
              loading={triviaLoading}
              reveal={triviaReveal}
              revealLoading={triviaRevealLoading}
              onReveal={handleTriviaReveal}
              onVote={handleTriviaVote}
              error={triviaError}
              xpAwarded={triviaXp}
              voteChoice={triviaChoice}
              voteCounts={triviaCounts}
              voteLoading={triviaVoteLoading}
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
