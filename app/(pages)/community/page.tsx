'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadImage, STORAGE_BUCKETS, supabase } from '@/lib/supabase';
import { subscribeToCommunityPosts, unsubscribeFromChannel } from '@/lib/socket-client';
import {
  Flame, ThumbsUp, ThumbsDown, Laugh, Eye, Zap, Heart,
  MessageSquare, ChevronRight, ChevronDown, Send, X, Check,
  Gamepad2, Clapperboard, Swords, MessageCircle,
  Trophy, Plus, TrendingUp, Clock, Sparkles,
  Film, Camera, Brain, Type, Pencil, Trash, MoreHorizontal,
} from 'lucide-react';
import {
  TriviaCinematicStage,
  MissionControlSidebar,
  TriviaFact,
  TriviaState,
  ClipPost,
  Poll,
  Streamer
} from '@/app/components/sections/CommunityHighlights';

/* ================================================================
   Types (Unchanged)
   ================================================================ */

type PostType = 'CLIP' | 'MEME' | 'HOT_TAKE' | 'BUILD_SCREENSHOT' | 'ROAST';
type ReactionType = 'UPVOTE' | 'DOWNVOTE' | 'LIKE' | 'LAUGH' | 'FIRE' | 'WOW';

interface Author { id: string; ign: string | null; photo: string | null; }
interface Post {
  id: string; type: PostType; title: string | null; content: string;
  mediaUrl: string | null; heroSlug: string | null; tags: string[];
  upvoteCount: number; downvoteCount: number; reactionScore: number;
  userReactionType?: ReactionType | null; isClipOfWeek: boolean;
  createdAt: string; author: Author; _count: { comments: number; reactions: number };
}
interface Comment { id: string; content: string; createdAt: string; user: Author; replies: Comment[]; }
interface ClipOfWeekData { post: Post & { author: Author }; winner?: Author; bannerText?: string | null; }
interface MemeData { id: string; caption: string | null; imageUrl: string; createdAt: string; user: Author; template: { name: string; imageUrl: string } | null; }

/* ================================================================
   Constants & Utilities (UI Tweaked Colors)
   ================================================================ */

const POST_TYPES: { value: PostType | 'ALL'; label: string; icon: React.ReactNode; color: string; glow: string }[] = [
  { value: 'ALL', label: 'All', icon: <Sparkles size={14} />, color: 'text-zinc-200', glow: 'rgba(255,255,255,0.5)' },
  { value: 'HOT_TAKE', label: 'Hot Takes', icon: <Flame size={14} />, color: 'text-orange-400', glow: 'rgba(251, 146, 60, 0.5)' },
  { value: 'CLIP', label: 'Clips', icon: <Clapperboard size={14} />, color: 'text-cyan-400', glow: 'rgba(34, 211, 238, 0.5)' },
  { value: 'MEME', label: 'Memes', icon: <Laugh size={14} />, color: 'text-yellow-400', glow: 'rgba(250, 204, 21, 0.5)' },
  { value: 'BUILD_SCREENSHOT', label: 'Builds', icon: <Gamepad2 size={14} />, color: 'text-emerald-400', glow: 'rgba(52, 211, 153, 0.5)' },
  { value: 'ROAST', label: 'Roasts', icon: <Swords size={14} />, color: 'text-rose-400', glow: 'rgba(251, 113, 133, 0.5)' },
];

const REACTION_CONFIG: { type: ReactionType; icon: React.ReactNode; label: string; color: string; activeColor: string }[] = [
  { type: 'UPVOTE', icon: <ThumbsUp size={14} />, label: 'Up', color: 'hover:text-emerald-400 text-zinc-400', activeColor: 'text-emerald-400 bg-emerald-400/15 ring-1 ring-emerald-400/30' },
  { type: 'DOWNVOTE', icon: <ThumbsDown size={14} />, label: 'Down', color: 'hover:text-rose-400 text-zinc-400', activeColor: 'text-rose-400 bg-rose-400/15 ring-1 ring-rose-400/30' },
  { type: 'LIKE', icon: <Heart size={14} />, label: 'Love', color: 'hover:text-pink-400 text-zinc-400', activeColor: 'text-pink-400 bg-pink-400/15 ring-1 ring-pink-400/30' },
  { type: 'LAUGH', icon: <Laugh size={14} />, label: 'Haha', color: 'hover:text-yellow-400 text-zinc-400', activeColor: 'text-yellow-400 bg-yellow-400/15 ring-1 ring-yellow-400/30' },
  { type: 'FIRE', icon: <Flame size={14} />, label: 'Fire', color: 'hover:text-orange-400 text-zinc-400', activeColor: 'text-orange-400 bg-orange-400/15 ring-1 ring-orange-400/30' },
  { type: 'WOW', icon: <Eye size={14} />, label: 'Wow', color: 'hover:text-purple-400 text-zinc-400', activeColor: 'text-purple-400 bg-purple-400/15 ring-1 ring-purple-400/30' },
];

const TYPE_BADGE: Record<PostType, { label: string; icon: React.ReactNode; border: string, text: string, bg: string }> = {
  HOT_TAKE: { label: 'Hot Take', icon: <Flame size={10} />, border: 'border-orange-500/30', text: 'text-orange-400', bg: 'bg-orange-500/10' },
  CLIP: { label: 'Clip', icon: <Clapperboard size={10} />, border: 'border-cyan-500/30', text: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  MEME: { label: 'Meme', icon: <Laugh size={10} />, border: 'border-yellow-500/30', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  BUILD_SCREENSHOT: { label: 'Build', icon: <Gamepad2 size={10} />, border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ROAST: { label: 'Roast', icon: <Swords size={10} />, border: 'border-rose-500/30', text: 'text-rose-400', bg: 'bg-rose-500/10' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now'; if (mins < 60) return mins + 'm';
  const hrs = Math.floor(mins / 60); if (hrs < 24) return hrs + 'h';
  const days = Math.floor(hrs / 24); if (days < 7) return days + 'd';
  return Math.floor(days / 7) + 'w';
}
function isVideoUrl(url: string) { return /\.(mp4|webm|mov|m4v|avi)(?:[?#].*)?/i.test(url) || url.toLowerCase().includes('/video/'); }
function isImageUrl(url: string) { return /\.(png|jpe?g|webp|gif|avif)$/i.test(url); }

/* ================================================================
   Gamified Animated Background
   ================================================================ */
const AnimatedBackground = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#030308]">
    {/* Moving magical orbs */}
    <motion.div
      className="absolute -top-[20%] -left-[10%] w-[80vw] h-[80vw] md:w-[50vw] md:h-[50vw] bg-purple-600/10 rounded-full blur-[120px] mix-blend-screen"
      animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
      transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute top-[40%] -right-[20%] w-[70vw] h-[70vw] md:w-[40vw] md:h-[40vw] bg-[#e8a000]/10 rounded-full blur-[100px] mix-blend-screen"
      animate={{ x: [0, -80, 0], y: [0, -60, 0] }}
      transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
    />
    <motion.div
      className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] md:w-[35vw] md:h-[35vw] bg-cyan-600/10 rounded-full blur-[90px] mix-blend-screen"
      animate={{ x: [0, 50, 0], y: [0, -100, 0] }}
      transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
    />

    {/* Hex Grid Overlay */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l20 10v20L20 40 0 30V10z' fill-rule='evenodd' stroke='%23FFF' stroke-width='1' fill='none'/%3E%3C/svg%3E")`,
        backgroundSize: '30px 30px'
      }}
    />

    {/* Floating Particles */}
    <div className="absolute inset-0 h-full w-full">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full opacity-20 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000)
          }}
          animate={{ y: [null, -1000] }}
          transition={{ duration: Math.random() * 10 + 10, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  </div>
);

/* ================================================================
   Components
   ================================================================ */
const Avatar = ({ user, size = 32 }: { user: Author; size?: number }) => (
  <div className="relative shrink-0 rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0f] rotate-3 hover:rotate-0 transition-transform shadow-lg" style={{ width: size, height: size }}>
    {user.photo ? (
      <Image src={user.photo} alt={user.ign ?? ''} width={size} height={size} className="object-cover w-full h-full scale-110" />
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-[#e8a000]/20 to-purple-500/20 text-white font-bold" style={{ fontSize: size * 0.4 }}>
        {(user.ign ?? '?')[0].toUpperCase()}
      </div>
    )}
    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-lg pointer-events-none" />
  </div>
);

const PostCard = ({ post, onReact, reactionLoadingId, currentUserId, editingPostId, editTitle, setEditTitle, editContent, setEditContent, startEditPost, cancelEdit, saveEditPost, deletePost, savingEditId }:
  {
    post: Post; onReact: (postId: string, type: ReactionType) => void; reactionLoadingId: string | null; currentUserId: string | null; editingPostId: string | null; editTitle: string; setEditTitle: (v: string) => void; editContent: string; setEditContent: (v: string) => void; startEditPost: (p: Post) => void; cancelEdit: () => void; saveEditPost: (id: string) => void; deletePost: (id: string) => void; savingEditId: string | null;
  }) => {
  const { data: session } = useSession();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAllReactions, setShowAllReactions] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
    if (!session) { toast.error('You must log in to comment'); return; }
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await fetch('/api/community/posts/' + post.id + '/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: commentText }), });
      setCommentText(''); loadComments();
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const mainReactions = REACTION_CONFIG.slice(0, 3);
  const extraReactions = REACTION_CONFIG.slice(3);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      layout
      className="relative rounded-3xl bg-[#08080c]/80 backdrop-blur-md border border-white/5 overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
    >
      {/* Decorative Top Glow */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] ${badge.bg} shadow-[0_0_20px_2px_currentColor] ${badge.text} opacity-50`} />

      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-5 pb-3">
        <Avatar user={post.author} size={42} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-zinc-100 font-bold text-[15px] truncate tracking-wide">@{post.author.ign ?? 'anon'}</span>
            {post.isClipOfWeek && (
              <span className="flex items-center gap-1 bg-[#e8a000]/20 text-[#e8a000] border border-[#e8a000]/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-sm">
                <Trophy size={10} /> COTW
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-sm border flex items-center gap-1 ${badge.bg} ${badge.border} ${badge.text}`}>
              {badge.icon} {badge.label}
            </span>
            <span className="text-zinc-500 text-[10px] flex items-center gap-1 font-medium">
              <Clock size={10} /> {timeAgo(post.createdAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        {post.author?.id === currentUserId && (
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
              <MoreHorizontal size={18} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute right-0 mt-2 w-32 bg-[#12121a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20">
                  {editingPostId === post.id ? (
                    <>
                      <button onClick={() => { saveEditPost(post.id); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-white/5 flex items-center gap-2"><Check size={14} /> Save</button>
                      <button onClick={() => { cancelEdit(); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-white/5 flex items-center gap-2"><X size={14} /> Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { startEditPost(post); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/5 flex items-center gap-2"><Pencil size={14} /> Edit</button>
                      <button onClick={() => { deletePost(post.id); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-white/5 flex items-center gap-2"><Trash size={14} /> Delete</button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pb-3">
        {editingPostId === post.id ? (
          <div className="space-y-2">
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title (optional)" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-bold outline-none focus:border-[#e8a000]/50" />
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-zinc-300 text-sm outline-none focus:border-[#e8a000]/50" />
          </div>
        ) : (
          <>
            {post.title && <h3 className="text-white font-bold text-lg leading-tight mb-1">{post.title}</h3>}
            <p className="text-zinc-300 text-[14px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </>
        )}
      </div>

      {/* Gamified Tags */}
      {(post.heroSlug || post.tags.length > 0) && (
        <div className="flex flex-wrap gap-2 px-5 pb-4">
          {post.heroSlug && (
            <span className="text-[#e8a000] text-[10px] font-black uppercase tracking-wider bg-[#e8a000]/10 border border-[#e8a000]/30 rounded-sm px-2 py-1 shadow-[0_0_10px_rgba(232,160,0,0.1)]">
              {post.heroSlug}
            </span>
          )}
          {post.tags.map(tag => (
            <span key={tag} className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/20 rounded-sm px-2 py-1">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Media Box - Edge to Edge look within padding */}
      {post.mediaUrl && (
        <div className="mx-5 mb-4 relative rounded-2xl overflow-hidden bg-black ring-1 ring-white/10 shadow-inner group/media">
          {isVideoUrl(post.mediaUrl) ? (
            <video src={post.mediaUrl} className="w-full h-auto max-h-[500px] object-cover" controls playsInline preload="metadata" />
          ) : (
            <Image src={post.mediaUrl} alt="Post media" width={800} height={450} className="w-full h-auto max-h-[500px] object-cover transition-transform duration-700 group-hover/media:scale-105" />
          )}
        </div>
      )}

      {/* Gamified Action Bar */}
      <div className="mx-5 mb-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 backdrop-blur-md">

        {/* Score & Reactions */}
        <div className="flex items-center gap-1.5">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs border ${post.reactionScore > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : post.reactionScore < 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-white/5 border-white/10 text-zinc-400'}`}>
            <Zap size={14} className={post.reactionScore > 0 ? 'fill-emerald-400' : ''} />
            {post.reactionScore > 0 ? '+' : ''}{post.reactionScore}
          </div>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Core Reactions */}
          <div className="flex items-center gap-1 relative">
            {mainReactions.map(r => {
              const isActive = post.userReactionType === r.type;
              return (
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  key={r.type} onClick={() => onReact(post.id, r.type)} disabled={reactionLoadingId === post.id}
                  className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${isActive ? r.activeColor : 'hover:bg-white/10 text-zinc-400'}`}
                >
                  {r.icon}
                </motion.button>
              );
            })}

            {/* More Reactions Expander */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => setShowAllReactions(!showAllReactions)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${showAllReactions ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-zinc-400'}`}
              >
                <Plus size={16} />
              </motion.button>
              <AnimatePresence>
                {showAllReactions && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }} className="absolute bottom-full left-0 mb-2 flex items-center gap-1 bg-[#12121a]/90 backdrop-blur-xl border border-white/20 rounded-2xl p-1.5 shadow-[0_0_30px_rgba(0,0,0,0.8)] z-30">
                    {extraReactions.map(r => {
                      const isActive = post.userReactionType === r.type;
                      return (
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} key={r.type} onClick={() => { if (reactionLoadingId !== post.id) { onReact(post.id, r.type); setShowAllReactions(false); } }} className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${isActive ? r.activeColor : 'hover:bg-white/20 text-zinc-300'}`}>
                          {r.icon}
                        </motion.button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Comment Toggle */}
        <button onClick={toggleComments} className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all ml-auto group/btn">
          <MessageSquare size={14} className="text-zinc-400 group-hover/btn:text-cyan-400 transition-colors" />
          <span className="text-xs font-bold text-zinc-300">{post._count.comments}</span>
          <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-300 ${showComments ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Animated Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-black/20 border-t border-white/5">
            <div className="p-5">
              {/* Comment Input */}
              <div className="flex gap-3 mb-5">
                <Avatar user={{ id: currentUserId || 'guest', ign: session?.user?.name || 'You', photo: session?.user?.image || null }} size={32} />
                <div className="flex-1 relative">
                  <input
                    type="text" value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
                    placeholder="Add your voice to the lore..."
                    className="w-full bg-[#1a1a24] border border-white/10 rounded-xl pl-4 pr-12 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#e8a000]/50 focus:bg-[#1a1a24]/80 transition-all shadow-inner"
                  />
                  <button onClick={submitComment} disabled={submitting || !commentText.trim()} className="absolute right-1 top-1 bottom-1 aspect-square rounded-lg bg-[#e8a000] flex items-center justify-center text-black hover:bg-[#ffb800] disabled:opacity-30 transition-colors">
                    <Send size={14} className="ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Comments Thread */}
              {loadingComments ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-lg bg-white/5" />
                      <div className="flex-1 space-y-2"><div className="h-3 w-24 bg-white/5 rounded" /><div className="h-3 w-3/4 bg-white/5 rounded" /></div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-4 bg-white/5 border border-white/5 rounded-xl border-dashed">
                  <p className="text-zinc-500 text-xs font-semibold">The battlefield is quiet. Be the first to speak.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {comments.map(c => <CommentItem key={c.id} comment={c} />)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
};

const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => (
  <div className={`flex gap-3 ${depth > 0 ? 'ml-8 mt-3 relative before:absolute before:-left-5 before:top-4 before:w-4 before:h-px before:bg-white/10' : ''}`}>
    <Avatar user={comment.user} size={depth === 0 ? 32 : 24} />
    <div className="flex-1">
      <div className="flex items-baseline gap-2 bg-white/5 rounded-xl rounded-tl-sm px-3 py-2 border border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white text-xs font-bold tracking-wide">{comment.user.ign ?? 'anon'}</span>
            <span className="text-zinc-500 text-[10px] font-medium">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-zinc-300 text-[13px] leading-relaxed">{comment.content}</p>
        </div>
      </div>
      {comment.replies?.length > 0 && (
        <div className="mt-2 border-l-2 border-white/5 pl-2 relative left-4">
          {comment.replies.map(r => <CommentItem key={r.id} comment={r} depth={depth + 1} />)}
        </div>
      )}
    </div>
  </div>
);

/* ================================================================
   Cinematic Compose Modal
   ================================================================ */
const ComposeModal = ({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: () => void }) => {
  const { data: session } = useSession();
  const [type, setType] = useState<PostType>('HOT_TAKE');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [showTitle, setShowTitle] = useState(false);
  const [heroSlug, setHeroSlug] = useState('');
  const [showHero, setShowHero] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const MAX = 500;

  useEffect(() => () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); }, []);
  useEffect(() => { if (open) setTimeout(() => textareaRef.current?.focus(), 150); }, [open]);

  const pickFile = (f: File | null) => {
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
    setFile(f); setMediaError('');
    if (!f) { setPreview(null); return; }
    if (f.type.startsWith('image')) { previewUrlRef.current = URL.createObjectURL(f); setPreview(previewUrlRef.current); }
    else { setPreview('video'); }
  };

  const submit = async () => {
    if (!session) { toast.error('Authentication required'); return; }
    if (!content.trim() || submitting || content.length > MAX) return;
    let uploadedUrl = '';
    if (file) {
      const isVideo = file.type.startsWith('video') || isVideoUrl(file.name);
      const isImage = file.type.startsWith('image') || isImageUrl(file.name);
      if (!isVideo && !isImage) { setMediaError('Invalid media protocol.'); return; }
      setSubmitting(true);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const bucket = isVideo ? STORAGE_BUCKETS.VIDEOS : STORAGE_BUCKETS.IMAGES;
      const { url, error } = await uploadImage(bucket, `intel/${Date.now()}-${safeName}`, file);
      if (error || !url) { setMediaError('Upload failed.'); setSubmitting(false); return; }
      uploadedUrl = url;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content, title: title.trim() || undefined, mediaUrl: uploadedUrl || undefined, heroSlug: heroSlug.trim() || undefined }),
      });
      if (res.ok) {
        setContent(''); setTitle(''); setFile(null); setPreview(null); setMediaError('');
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        setHeroSlug(''); setShowTitle(false); setShowHero(false); onPosted(); onClose();
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const activeType = POST_TYPES.find(t => t.value === type);
  const glowColor = activeType?.glow || 'rgba(232, 160, 0, 0.5)';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center sm:px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#020205]/80 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full h-full sm:h-auto sm:max-w-xl bg-[#0b0b12] sm:rounded-[2rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden"
            style={{ boxShadow: `0 0 80px ${glowColor}, inset 0 0 20px rgba(255,255,255,0.02)` }}
          >
            {/* Scanline overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px]" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20">
              <h2 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <Sparkles size={16} style={{ color: activeType?.color.split('-')[1] || '#e8a000' }} /> Create Post
              </h2>
              <button onClick={onClose} className="p-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 rounded-xl transition-colors"><X size={16} /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 relative z-10">

              {/* Gamified Type Selector */}
              <div className="bg-black/40 p-1.5 rounded-2xl border border-white/5 flex gap-1 overflow-x-auto hide-scrollbar">
                {POST_TYPES.filter(t => t.value !== 'ALL').map(t => {
                  const isActive = type === t.value;
                  return (
                    <button
                      key={t.value} onClick={() => setType(t.value as PostType)}
                      className={`relative flex-1 min-w-[80px] flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                    >
                      {isActive && <motion.div layoutId="activeType" className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl" style={{ boxShadow: `inset 0 0 20px ${t.glow}` }} />}
                      <span className={`relative z-10 ${isActive ? t.color : ''}`}>{t.icon}</span>
                      <span className="relative z-10 text-[10px] font-bold uppercase tracking-wider">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Inputs */}
              <div className="space-y-3">
                <AnimatePresence>
                  {showTitle && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold placeholder-zinc-600 outline-none focus:border-white/30 transition-all" />
                    </motion.div>
                  )}
                  {showHero && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus-within:border-white/30 transition-all">
                      <Gamepad2 size={16} className="text-[#e8a000]" />
                      <input value={heroSlug} onChange={e => setHeroSlug(e.target.value)} placeholder="Hero Tag (e.g. Fanny)" className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative">
                  <textarea
                    ref={textareaRef} value={content} onChange={e => setContent(e.target.value)}
                    placeholder={`Write your ${activeType?.label.toLowerCase()}...`}
                    rows={5}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-zinc-200 text-[15px] leading-relaxed placeholder-zinc-600 outline-none resize-none focus:border-white/30 transition-all"
                  />
                  <div className={`absolute bottom-3 right-4 text-[10px] font-bold ${content.length > MAX ? 'text-rose-400' : 'text-zinc-500'}`}>
                    {content.length} / {MAX}
                  </div>
                </div>
              </div>

              {/* Media Preview */}
              <AnimatePresence>
                {file && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative rounded-xl border border-white/10 bg-black/40 p-2 flex items-center gap-3">
                    {preview && preview !== 'video' ? <Image src={preview} alt="" width={48} height={48} className="rounded-lg object-cover w-12 h-12" /> : <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center"><Film size={20} className="text-cyan-400" /></div>}
                    <div className="flex-1 min-w-0"><p className="text-xs text-white font-medium truncate">{file.name}</p><p className="text-[10px] text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div>
                    <button onClick={() => pickFile(null)} className="p-2 bg-white/5 rounded-lg text-rose-400 hover:bg-rose-500/20"><Trash size={14} /></button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer / Toolbar */}
            <div className="p-4 bg-black/40 border-t border-white/10 flex items-center gap-2 z-10">
              <label className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center cursor-pointer transition-colors group">
                <Camera size={18} className={file ? 'text-cyan-400' : 'text-zinc-400 group-hover:text-white'} />
                <input type="file" accept="image/*,video/*" className="hidden" onChange={e => pickFile(e.target.files?.[0] ?? null)} />
              </label>
              <button onClick={() => setShowTitle(!showTitle)} className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${showTitle ? 'bg-[#e8a000]/20 border-[#e8a000]/40 text-[#e8a000]' : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}><Type size={18} /></button>
              <button onClick={() => setShowHero(!showHero)} className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${showHero ? 'bg-[#e8a000]/20 border-[#e8a000]/40 text-[#e8a000]' : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}><Gamepad2 size={18} /></button>

              <div className="flex-1" />

              <button
                onClick={submit} disabled={!content.trim() || submitting || content.length > MAX}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-black font-black uppercase tracking-wider text-xs hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              >
                {submitting ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full" /> : <Zap size={16} />}
                {submitting ? 'Posting' : 'Post'}
              </button>
            </div>
            {/* Mobile safe area */}
            <div className="pb-[env(safe-area-inset-bottom)] sm:hidden" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ================================================================
   Main Page Layout
   ================================================================ */

export default function CommunityPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const [posts, setPosts] = useState<Post[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [memes, setMemes] = useState<MemeData[]>([]);
  const [clipOfWeek, setClipOfWeek] = useState<ClipOfWeekData | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [heroesWithImages, setHeroesWithImages] = useState<{ imageUrl: string }[]>([]);
  const [triviaState, setTriviaState] = useState<TriviaState>({ trivias: [], currentIndex: 0, userTotalXp: 0, todayXp: 0, dailyAnswered: 0, dailyLimit: 5, countdown: null, allCompletedToday: false });
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
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingEditId, setSavingEditId] = useState<string | null>(null);

  const loadPosts = useCallback(async (reset = false) => {
    if (reset) { setLoading(true); skipRef.current = 0; } else { setLoadingMore(true); }
    try {
      const params = new URLSearchParams({ limit: '20', skip: String(skipRef.current) });
      if (filter !== 'ALL') params.set('type', filter);
      const res = await fetch('/api/community/posts?' + params.toString());
      const data = await res.json();
      const newPosts: Post[] = data?.posts ?? [];
      const total = data?.pagination?.total ?? 0;
      if (reset) setPosts(newPosts); else setPosts(prev => [...prev, ...newPosts]);
      setTotalPosts(total); setHasMore(skipRef.current + newPosts.length < total);
      skipRef.current += newPosts.length;
    } catch { /* ignore */ }
    setLoading(false); setLoadingMore(false);
  }, [filter]);

  const sorted = useMemo(() => {
    const arr = [...posts];
    if (sortBy === 'new') arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else arr.sort((a, b) => b.reactionScore - a.reactionScore);
    return arr;
  }, [posts, sortBy]);

  useEffect(() => { loadPosts(true); }, [filter, loadPosts]);

  useEffect(() => {
    Promise.all([
      fetch('/api/memes').then(r => r.ok ? r.json() : null),
      fetch('/api/clips/weekly').then(r => r.ok ? r.json() : null),
    ]).then(([memeData, clipData]) => {
      if (memeData?.memes) setMemes(memeData.memes);
      if (clipData?.featured) setClipOfWeek(clipData.featured);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    setTriviaLoading(true);
    (async () => {
      try {
        const [triviaRes, pollsRes, streamersRes, heroesRes] = await Promise.all([
          fetch('/api/trivia/current', { cache: 'no-store' }), fetch('/api/polls'), fetch('/api/streamers/spotlight'), fetch('/api/heroes/catalog'),
        ]);
        const [data, pollsData, streamersData, heroesData] = await Promise.all([triviaRes.json(), pollsRes.json(), streamersRes.json(), heroesRes.json()]);
        const trivias = (data?.trivias ?? []) as TriviaFact[];
        setTriviaState(prev => ({ ...prev, trivias, currentIndex: 0, userTotalXp: data?.userTotalXp ?? 0, todayXp: data?.todayXp ?? 0, dailyAnswered: data?.dailyAnswered ?? 0, dailyLimit: data?.dailyLimit ?? 5, allCompletedToday: data?.allCompletedToday ?? false }));
        setPolls(Array.isArray(pollsData?.polls) ? pollsData.polls.slice(0, 1) : []);
        setStreamers(Array.isArray(streamersData?.streamers) ? streamersData.streamers : []);
        setHeroesWithImages(Array.isArray(heroesData?.heroes) ? heroesData.heroes : []);
      } catch { setTriviaState(prev => ({ ...prev, trivias: [] })); }
      setTriviaLoading(false);
    })();
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  useEffect(() => {
    const currentTrivia = triviaState.trivias[triviaState.currentIndex];
    if (!currentTrivia || heroesWithImages.length === 0) { setTriviaImage(null); return; }
    setTriviaImage(heroesWithImages[Math.floor(Math.random() * heroesWithImages.length)].imageUrl);
  }, [triviaState.trivias, triviaState.currentIndex, heroesWithImages]);

  useEffect(() => {
    const handleNewPost = (payload: unknown) => {
      const post = payload as Post;
      if (!post?.id) return;
      setPosts(prev => prev.some(p => p.id === post.id) ? prev : [post, ...prev]);
      setTotalPosts(prev => prev + 1);
      if (post.author?.id !== currentUserId && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`${post.author?.ign ?? 'Someone'} posted in Community`, { body: post.title ? post.title : post.content.slice(0, 80), icon: '/mlbb_logo.png' });
      }
    };
    subscribeToCommunityPosts(handleNewPost);
    return () => { unsubscribeFromChannel('community'); };
  }, [currentUserId]);

  const startEditPost = (post: Post) => { setEditingPostId(post.id); setEditTitle(post.title ?? ''); setEditContent(post.content); };
  const cancelEdit = () => { setEditingPostId(null); setEditTitle(''); setEditContent(''); };
  const saveEditPost = async (postId: string) => {
    if (!editingPostId || postId !== editingPostId) return;
    setSavingEditId(postId);
    try {
      const res = await fetch('/api/community/posts/' + postId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: editTitle || null, content: editContent }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error || 'Failed to save'); return; }
      const updatedPost = data?.post ?? { title: data?.title, content: data?.content };
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...(updatedPost || {}) } : p));
      toast.success('Post updated'); cancelEdit();
    } catch { toast.error('Failed to save'); } finally { setSavingEditId(null); }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Delete this post? This action cannot be undone.')) return;
    try {
      const res = await fetch('/api/community/posts/' + postId, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setPosts(prev => prev.filter(p => p.id !== postId)); setTotalPosts(prev => Math.max(0, prev - 1));
      toast.success('Post deleted.');
    } catch { toast.error('Failed to delete.'); }
  };

  const handleReact = async (postId: string, type: ReactionType) => {
    if (!session) { toast.error('Authentication required'); return; }
    if (reactionLoadingId === postId) return;
    setReactionLoadingId(postId);
    try {
      const res = await fetch('/api/community/posts/' + postId + '/reactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) });
      const data = await res.json();
      if (res.ok) {
        const up = typeof data?.upvoteCount === 'number' ? data.upvoteCount : undefined;
        const down = typeof data?.downvoteCount === 'number' ? data.downvoteCount : undefined;
        setPosts(prev => prev.map(p => {
          if (p.id !== postId || up === undefined || down === undefined) return p;
          return { ...p, upvoteCount: up, downvoteCount: down, reactionScore: up - down, userReactionType: data?.reaction?.type ?? type, _count: { ...p._count, reactions: Math.max(p._count?.reactions ?? 0, up + down) } };
        }));
      }
    } catch { /* ignore */ }
    setReactionLoadingId(null);
  };

  const startCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setTriviaState(prev => ({ ...prev, countdown: 10 }));
    countdownRef.current = setInterval(() => {
      setTriviaState(prev => {
        if (prev.countdown === null || prev.countdown <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return { ...prev, countdown: null, currentIndex: prev.currentIndex + 1 < prev.trivias.length ? prev.currentIndex + 1 : prev.currentIndex };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
  };

  const handleTriviaAnswer = async (answer: string) => {
    if (!session) { toast.error('Login to participate'); return; }
    const currentTrivia = triviaState.trivias[triviaState.currentIndex];
    if (!currentTrivia?.id || triviaAnswerLoading || currentTrivia.hasAnswered) return;
    setTriviaAnswerLoading(true); setTriviaError(null);
    try {
      const res = await fetch('/api/trivia/' + currentTrivia.id + '/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer }) });
      const data = await res.json();
      const handleData = (d: any) => {
        setTriviaState(prev => {
          const updated = [...prev.trivias];
          updated[prev.currentIndex] = { ...updated[prev.currentIndex], hasAnswered: true, userAnswer: d.userAnswer, isCorrect: d.isCorrect, correctAnswer: d.correctAnswer, xpAwarded: d.xpAwarded, reveal: d.reveal, totalAttempts: d.totalAttempts ?? updated[prev.currentIndex].totalAttempts, correctCount: d.correctCount ?? updated[prev.currentIndex].correctCount };
          return { ...prev, trivias: updated, userTotalXp: prev.userTotalXp + (d.xpAwarded ?? 0), todayXp: prev.todayXp + (d.xpAwarded ?? 0), dailyAnswered: prev.dailyAnswered + 1 };
        });
        startCountdown();
      };
      if (!res.ok) {
        try { const parsed = typeof data?.error === 'string' ? JSON.parse(data.error) : null; if (parsed?.userAnswer) handleData(parsed); else setTriviaError(parsed?.message || data?.error || 'Error'); }
        catch { setTriviaError(data?.error ?? 'Error'); }
      } else { handleData(data); }
    } catch { setTriviaError('Error submitting answer.'); }
    setTriviaAnswerLoading(false);
  };

  const skipToNextTrivia = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setTriviaState(prev => ({ ...prev, countdown: null, currentIndex: prev.currentIndex + 1 < prev.trivias.length ? prev.currentIndex + 1 : prev.currentIndex }));
  };

  return (
    <main className="relative min-h-screen bg-[#030308] text-white selection:bg-[#e8a000]/30 selection:text-white">
      <AnimatedBackground />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-linear-to-br from-white via-zinc-200 to-zinc-500 mb-2">
              Community Feed
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-zinc-400 font-medium tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse" />
              Live Feed • {totalPosts.toLocaleString()} Posts
            </motion.p>
          </div>

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            onClick={() => setComposeOpen(true)}
            className="hidden md:flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-black uppercase tracking-wider text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            <Zap size={18} /> Create Post
          </motion.button>
        </div>

        {/* Top Bento Grid - Cinematic Stage */}
        <div className="grid grid-cols-12 gap-6 mb-10">
          <TriviaCinematicStage triviaState={triviaState} imageUrl={triviaImage} onAnswer={handleTriviaAnswer} onSkip={skipToNextTrivia} error={triviaError} answerLoading={triviaAnswerLoading} />
          <MissionControlSidebar clip={clipOfWeek ? { id: clipOfWeek.post.id, title: clipOfWeek.post.title, content: clipOfWeek.post.content, author: { ign: clipOfWeek.post.author.ign ?? 'Anonymous', photo: clipOfWeek.post.author.photo }, mediaUrl: clipOfWeek.post.mediaUrl } : null} polls={polls} streamers={streamers} />
        </div>

        {/* Gamified Sticky Filter Bar */}
        <div className="sticky top-[72px] z-30 -mx-4 px-4 py-4 sm:mx-0 sm:px-0 mb-6 bg-[#030308]/80 backdrop-blur-xl border-b border-white/5 sm:border-none sm:bg-transparent sm:backdrop-blur-none">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex bg-[#0a0a0f] p-1.5 rounded-2xl border border-white/10 shadow-lg w-full sm:w-auto overflow-x-auto hide-scrollbar">
              {POST_TYPES.map(t => {
                const isActive = filter === t.value;
                return (
                  <button key={t.value} onClick={() => setFilter(t.value as PostType | 'ALL')} className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    {isActive && <motion.div layoutId="filterActive" className="absolute inset-0 bg-white/10 rounded-xl" style={{ boxShadow: `inset 0 0 10px ${t.glow}` }} />}
                    <span className="relative z-10">{t.icon}</span>
                    <span className="relative z-10 hidden md:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sort Toggle */}
            <div className="flex bg-[#0a0a0f] p-1 rounded-xl border border-white/10 shadow-lg w-full sm:w-auto">
              <button onClick={() => setSortBy('new')} className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${sortBy === 'new' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <Clock size={14} /> Newest
              </button>
              <button onClick={() => setSortBy('score')} className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${sortBy === 'score' ? 'bg-[#e8a000]/20 text-[#e8a000]' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <TrendingUp size={14} /> Top
              </button>
            </div>
          </div>
        </div>

        {/* Main Feed Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">

          {/* Feed Column */}
          <div className="space-y-6">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-3xl bg-[#08080c] border border-white/5 p-6 animate-pulse">
                  <div className="flex gap-4 mb-4"><div className="w-12 h-12 bg-white/5 rounded-lg" /><div className="flex-1 space-y-2 py-1"><div className="h-4 w-32 bg-white/5 rounded" /><div className="h-3 w-20 bg-white/5 rounded" /></div></div>
                  <div className="h-24 w-full bg-white/5 rounded-xl mb-4" />
                  <div className="flex gap-2"><div className="h-8 w-20 bg-white/5 rounded-lg" /><div className="h-8 w-8 bg-white/5 rounded-lg" /></div>
                </div>
              ))
            ) : sorted.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center">
                <div className="w-24 h-24 mb-6 relative">
                  <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl" />
                  <div className="relative w-full h-full border border-white/10 rounded-3xl flex items-center justify-center bg-[#0a0a0f] rotate-3"><Zap size={32} className="text-cyan-400" /></div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Posts Found</h3>
                <p className="text-zinc-500 text-sm mb-6 max-w-sm">There are no posts here yet. Be the first to share something!</p>
                <button onClick={() => setComposeOpen(true)} className="px-6 py-2.5 rounded-xl border border-[#e8a000]/40 text-[#e8a000] font-bold uppercase tracking-wider text-xs hover:bg-[#e8a000]/10 transition-colors">Create Post</button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {sorted.map(post => (
                  <PostCard key={post.id} post={post} onReact={handleReact} reactionLoadingId={reactionLoadingId} currentUserId={currentUserId} editingPostId={editingPostId} editTitle={editTitle} setEditTitle={setEditTitle} editContent={editContent} setEditContent={setEditContent} startEditPost={startEditPost} cancelEdit={cancelEdit} saveEditPost={saveEditPost} deletePost={deletePost} savingEditId={savingEditId} />
                ))}
              </AnimatePresence>
            )}

            {/* Load More Trigger */}
            {!loading && hasMore && sorted.length > 0 && (
              <div className="flex justify-center pt-8 pb-10">
                <button onClick={() => loadPosts(false)} disabled={loadingMore} className="group relative flex items-center gap-2 px-8 py-3 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-bold text-xs uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50">
                  {loadingMore ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full" /> : <ChevronDown size={16} className="group-hover:translate-y-1 transition-transform" />}
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>

          {/* Right Sidebar - Sticky Arsenal */}
          <div className="hidden lg:flex flex-col gap-6 sticky top-28">

            {/* Trending Memes */}
            {memes.length > 0 && (
              <div className="bg-[#08080c]/80 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative group">
                <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-yellow-500/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="px-5 py-4 flex items-center gap-2 border-b border-white/5">
                  <Flame size={16} className="text-yellow-500 animate-pulse" />
                  <h3 className="text-white font-black uppercase tracking-widest text-xs">Trending Memes</h3>
                </div>
                <div className="p-2 space-y-1">
                  {memes.slice(0, 4).map((meme, i) => (
                    <div key={meme.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group/item">
                      <span className={`font-black text-sm w-4 text-center ${i === 0 ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-orange-400' : 'text-zinc-600'}`}>{i + 1}</span>
                      <div className="w-12 h-12 rounded-lg bg-black border border-white/10 overflow-hidden shrink-0 relative group-hover/item:border-white/30 transition-colors">
                        <Image src={meme.imageUrl} alt="" fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-zinc-200 text-xs font-bold truncate">{meme.caption ?? meme.template?.name ?? 'Unknown Relic'}</p>
                        <p className="text-cyan-400/70 text-[10px] uppercase font-bold mt-0.5">@{meme.user.ign ?? 'anon'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Travel Nav */}
            <div className="bg-[#08080c]/80 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative group">
              <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-cyan-500/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="px-5 py-4 flex items-center gap-2 border-b border-white/5">
                <Sparkles size={16} className="text-cyan-400" />
                <h3 className="text-white font-black uppercase tracking-widest text-xs">Quick Links</h3>
              </div>
              <div className="p-2 flex flex-col gap-1">
                {[
                  { label: 'Meme Generator', href: '/memes', icon: <Laugh size={16} />, color: 'group-hover/link:text-yellow-400' },
                  { label: 'Leaderboard', href: '/leaderboard', icon: <Trophy size={16} />, color: 'group-hover/link:text-[#e8a000]' },
                  { label: 'Active Polls', href: '/polls', icon: <MessageSquare size={16} />, color: 'group-hover/link:text-emerald-400' },
                  { label: 'Streamers', href: '/streamers', icon: <Film size={16} />, color: 'group-hover/link:text-purple-400' },
                ].map(link => (
                  <a key={link.href} href={link.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all group/link">
                    <span className={`text-zinc-500 transition-colors ${link.color}`}>{link.icon}</span>
                    <span className="text-zinc-300 text-xs font-bold tracking-wide flex-1 group-hover/link:text-white transition-colors">{link.label}</span>
                    <ChevronRight size={14} className="text-zinc-700 group-hover/link:text-white transition-colors group-hover/link:translate-x-1" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button (Mobile Ultimate) */}
      <motion.button
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}
        onClick={() => setComposeOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
      >
        <Zap size={24} className="fill-black" />
      </motion.button>

      {/* Modals */}
      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} onPosted={() => loadPosts(true)} />
    </main>
  );
}