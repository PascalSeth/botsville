'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import {
  CheckCircle2,
  ExternalLink,
  PlayCircle,
  Twitch,
  Youtube,
  Music2,
  Facebook,
  Instagram,
  Twitter,
  MessageCircle,
  BadgeCheck,
  X,
} from 'lucide-react'

type StreamPlatform = 'YOUTUBE' | 'TWITCH' | 'TIKTOK' | 'FACEBOOK'

type StreamerVideo = {
  id: string
  title: string
  description?: string | null
  platform: StreamPlatform
  videoId: string
  videoUrl: string
  thumbnail?: string | null
  pinned: boolean
  createdAt: string
}

type Streamer = {
  id: string
  user?: { id: string; ign?: string | null; photo?: string | null } | null
  name: string
  bio?: string | null
  photo?: string | null
  coverImage?: string | null
  featured: boolean
  verified: boolean
  youtube?: string | null
  twitch?: string | null
  tiktok?: string | null
  facebook?: string | null
  instagram?: string | null
  twitter?: string | null
  discord?: string | null
  videos: StreamerVideo[]
  _count?: { videos: number }
}

type StreamersResponse = { streamers: Streamer[] }

function parseVideoInput(platform: StreamPlatform, url: string): { videoId: string; videoUrl: string } | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)

    if (platform === 'YOUTUBE') {
      const v = parsed.searchParams.get('v')
      if (v) return { videoId: v, videoUrl: trimmed }

      const parts = parsed.pathname.split('/').filter(Boolean)
      const shortId = parsed.hostname.includes('youtu.be') ? parts[0] : undefined
      const shortsId = parts[0] === 'shorts' ? parts[1] : undefined
      const embedId = parts[0] === 'embed' ? parts[1] : undefined
      const id = shortId || shortsId || embedId
      if (id) return { videoId: id, videoUrl: trimmed }
      return null
    }

    if (platform === 'TWITCH') {
      const parts = parsed.pathname.split('/').filter(Boolean)
      const videosIndex = parts.findIndex((part) => part === 'videos')
      const rawId = videosIndex >= 0 ? parts[videosIndex + 1] : ''
      if (!rawId) return null
      return { videoId: rawId.startsWith('v') ? rawId : `v${rawId}`, videoUrl: trimmed }
    }

    if (platform === 'TIKTOK') {
      const parts = parsed.pathname.split('/').filter(Boolean)
      const idx = parts.findIndex((part) => part === 'video')
      const id = idx >= 0 ? parts[idx + 1] : ''
      if (!id) return null
      return { videoId: id, videoUrl: trimmed }
    }

    return { videoId: 'fb-video', videoUrl: trimmed }
  } catch {
    return null
  }
}

function getEmbedUrl(video: StreamerVideo): string {
  if (video.platform === 'YOUTUBE') {
    return `https://www.youtube.com/embed/${video.videoId}`
  }

  if (video.platform === 'TWITCH') {
    const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    return `https://player.twitch.tv/?video=${video.videoId}&parent=${parent}&autoplay=false`
  }

  if (video.platform === 'TIKTOK') {
    return `https://www.tiktok.com/player/v1/${video.videoId}`
  }

  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(video.videoUrl)}&show_text=false`
}

function PlatformTag({ platform }: { platform: StreamPlatform }) {
  if (platform === 'YOUTUBE') {
    return <span className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[10px] font-black text-red-300"><Youtube size={12} />YouTube</span>
  }
  if (platform === 'TWITCH') {
    return <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-400/10 px-2 py-0.5 text-[10px] font-black text-purple-300"><Twitch size={12} />Twitch</span>
  }
  if (platform === 'TIKTOK') {
    return <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-black text-cyan-300"><Music2 size={12} />TikTok</span>
  }
  return <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-400/10 px-2 py-0.5 text-[10px] font-black text-blue-300"><Facebook size={12} />Facebook</span>
}

export default function StreamersPage() {
  const { data: session, status } = useSession()
  const [streamers, setStreamers] = useState<Streamer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeVideo, setActiveVideo] = useState<{ streamerName: string; video: StreamerVideo } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [profileName, setProfileName] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [profilePhoto, setProfilePhoto] = useState('')
  const [profileCover, setProfileCover] = useState('')
  const [youtube, setYoutube] = useState('')
  const [twitch, setTwitch] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [facebook, setFacebook] = useState('')
  const [instagram, setInstagram] = useState('')
  const [twitter, setTwitter] = useState('')
  const [discord, setDiscord] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [videoPlatform, setVideoPlatform] = useState<StreamPlatform>('YOUTUBE')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoDescription, setVideoDescription] = useState('')
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null)
  const [videoThumb, setVideoThumb] = useState('')
  const [workingVideoId, setWorkingVideoId] = useState<string | null>(null)

  const meId = session?.user?.id
  const myProfile = streamers.find((streamer) => streamer.user?.id === meId) ?? null

  const loadStreamers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/streamers?limit=30')
      const data: StreamersResponse = await response.json()
      const list = Array.isArray(data?.streamers) ? data.streamers : []
      setStreamers(list)
      setError(null)

      const mine = list.find((streamer) => streamer.user?.id === meId)
      if (mine) {
        setProfileName(mine.name ?? '')
        setProfileBio(mine.bio ?? '')
        setProfilePhoto(mine.photo ?? '')
        setProfileCover(mine.coverImage ?? '')
        setYoutube(mine.youtube ?? '')
        setTwitch(mine.twitch ?? '')
        setTiktok(mine.tiktok ?? '')
        setFacebook(mine.facebook ?? '')
        setInstagram(mine.instagram ?? '')
        setTwitter(mine.twitter ?? '')
        setDiscord(mine.discord ?? '')
      } else if (session?.user?.name) {
        setProfileName(session.user.name)
      }
    } catch {
      setError('Failed to load streamers right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStreamers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId])

  const saveMyProfile = async () => {
    if (!meId) {
      setError('Please login to create your streamer profile.')
      return
    }
    if (!profileName.trim()) {
      setError('Profile name is required.')
      return
    }

    setSavingProfile(true)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch('/api/streamers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName.trim(),
          bio: profileBio.trim() || null,
          photo: profilePhoto.trim() || null,
          coverImage: profileCover.trim() || null,
          youtube: youtube.trim() || null,
          twitch: twitch.trim() || null,
          tiktok: tiktok.trim() || null,
          facebook: facebook.trim() || null,
          instagram: instagram.trim() || null,
          twitter: twitter.trim() || null,
          discord: discord.trim() || null,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Could not save streamer profile.')
        return
      }

      setNotice(data?.message || 'Streamer profile saved.')
      await loadStreamers()
    } catch {
      setError('Could not save streamer profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const uploadMyVideo = async () => {
    if (!myProfile?.id) {
      setError('Create your streamer profile first before adding videos.')
      return
    }

    if (!videoTitle.trim() || !videoUrl.trim()) {
      setError('Video title and video URL are required.')
      return
    }

    const parsed = parseVideoInput(videoPlatform, videoUrl)
    if (!parsed) {
      setError('Invalid video URL for selected platform.')
      return
    }

    setUploadingVideo(true)
    setWorkingVideoId(editingVideoId)
    setError(null)
    setNotice(null)

    try {
      const isEditing = Boolean(editingVideoId)
      const url = isEditing
        ? `/api/streamers/${myProfile.id}/videos/${editingVideoId}`
        : `/api/streamers/${myProfile.id}/videos`

      const response = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: videoPlatform,
          title: videoTitle.trim(),
          description: videoDescription.trim() || null,
          videoId: parsed.videoId,
          videoUrl: parsed.videoUrl,
          thumbnail: videoThumb.trim() || null,
          pinned: false,
          active: true,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data?.error || 'Could not upload video link.')
        return
      }

      setNotice(isEditing ? 'Video updated successfully.' : 'Video link added successfully.')
      setVideoTitle('')
      setVideoUrl('')
      setVideoDescription('')
      setVideoThumb('')
      setEditingVideoId(null)
      await loadStreamers()
    } catch {
      setError(editingVideoId ? 'Could not update video.' : 'Could not upload video link.')
    } finally {
      setUploadingVideo(false)
      setWorkingVideoId(null)
    }
  }

  const startEditVideo = (video: StreamerVideo) => {
    setEditingVideoId(video.id)
    setVideoPlatform(video.platform)
    setVideoTitle(video.title)
    setVideoUrl(video.videoUrl)
    setVideoDescription(video.description ?? '')
    setVideoThumb(video.thumbnail ?? '')
    setNotice(null)
    setError(null)
  }

  const cancelEditVideo = () => {
    setEditingVideoId(null)
    setVideoPlatform('YOUTUBE')
    setVideoTitle('')
    setVideoUrl('')
    setVideoDescription('')
    setVideoThumb('')
  }

  const deleteVideo = async (streamerId: string, videoId: string) => {
    if (!confirm('Delete this video?')) return

    setWorkingVideoId(videoId)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch(`/api/streamers/${streamerId}/videos/${videoId}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || 'Could not delete video.')
        return
      }

      setNotice('Video deleted successfully.')
      if (editingVideoId === videoId) {
        cancelEditVideo()
      }
      await loadStreamers()
    } catch {
      setError('Could not delete video.')
    } finally {
      setWorkingVideoId(null)
    }
  }

  const COMING_SOON = true

  if (COMING_SOON) {
    return (
      <main className="min-h-screen bg-[#08080d] text-white p-4 sm:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-[#e8a000]/30 bg-[#0d0d14] p-6 sm:p-8">
            <p className="text-[10px] font-black tracking-[0.24em] uppercase text-[#e8a000]">Creator Arena</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black uppercase tracking-[0.08em]">Streamers Mode: Coming Soon</h1>
            <p className="mt-3 text-sm text-[#a1a1aa] max-w-2xl">
              We are powering up streamer profiles, social links, and in-site playable videos for Ghanaian creators.
            </p>

            <div className="mt-6 grid sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-[#10101a] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#666] font-black">XP Progress</p>
                <p className="text-xl font-black mt-1">78%</p>
                <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-[78%] bg-[#e8a000]" />
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#10101a] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#666] font-black">Quests Complete</p>
                <p className="text-xl font-black mt-1">7 / 9</p>
                <p className="text-xs text-[#888] mt-1">Profile + social + video engine</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#10101a] p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#666] font-black">Reward</p>
                <p className="text-xl font-black mt-1">Creator Spotlight</p>
                <p className="text-xs text-[#888] mt-1">Get discovered by the community</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-[#10101a] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#e8a000] font-black">Launch Checklist</p>
              <ul className="mt-2 space-y-2 text-sm text-[#d4d4d8]">
                <li>✅ Creator profile system</li>
                <li>✅ Social links support</li>
                <li>✅ In-site video playback</li>
                <li>⏳ Final polish + moderation flow</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#08080d] text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-widest uppercase">Ghana Streamers</h1>
          <p className="text-[#777] mt-2">Support Ghanaian creators, follow their socials, and watch videos directly on Botsville.</p>
        </div>

        <section className="rounded-xl border border-white/10 bg-[#0d0d14] p-4 sm:p-5">
          <p className="text-[10px] tracking-[0.2em] uppercase font-black text-[#e8a000]">Creator Portal</p>
          {status !== 'authenticated' ? (
            <p className="text-sm text-[#aaa] mt-2">Login to create your streamer profile and add video links.</p>
          ) : (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-sm font-semibold text-white">{myProfile ? 'Update Your Streamer Profile' : 'Create Your Streamer Profile'}</p>
                <p className="text-xs text-[#777] mt-1">Your socials and videos will be shown publicly on this page.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Streamer name" className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]/50" />
                <input value={profilePhoto} onChange={(e) => setProfilePhoto(e.target.value)} placeholder="Profile image URL" className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]/50" />
                <input value={profileCover} onChange={(e) => setProfileCover(e.target.value)} placeholder="Cover image URL" className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]/50 md:col-span-2" />
                <textarea value={profileBio} onChange={(e) => setProfileBio(e.target.value)} placeholder="Short bio" rows={3} className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]/50 md:col-span-2" />
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                <input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="YouTube channel URL" className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#e8a000]/50" />
                <input value={twitch} onChange={(e) => setTwitch(e.target.value)} placeholder="Twitch URL" className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#e8a000]/50" />
                <input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="TikTok URL" className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#e8a000]/50" />
                <input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="Facebook URL" className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#e8a000]/50" />
                <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="Instagram URL" className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#e8a000]/50" />
                <input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="X / Twitter URL" className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#e8a000]/50" />
                <input value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="Discord invite URL" className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#e8a000]/50 lg:col-span-3" />
              </div>

              <button
                type="button"
                onClick={saveMyProfile}
                disabled={savingProfile}
                className="inline-flex items-center justify-center rounded-lg bg-[#e8a000] px-4 py-2 text-xs font-black uppercase tracking-wider text-black hover:bg-[#ffb800] disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : myProfile ? 'Update Profile' : 'Create Profile'}
              </button>

              {myProfile && (
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <p className="text-sm font-semibold text-white">{editingVideoId ? 'Edit Video' : 'Add Video Link'}</p>
                  <div className="grid md:grid-cols-2 gap-2">
                    <select value={videoPlatform} onChange={(e) => setVideoPlatform(e.target.value as StreamPlatform)} className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]/50">
                      <option value="YOUTUBE">YouTube</option>
                      <option value="TWITCH">Twitch</option>
                      <option value="TIKTOK">TikTok</option>
                      <option value="FACEBOOK">Facebook</option>
                    </select>
                    <input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Video title" className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]/50" />
                    <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Video URL" className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]/50 md:col-span-2" />
                    <input value={videoThumb} onChange={(e) => setVideoThumb(e.target.value)} placeholder="Thumbnail URL (optional)" className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]/50 md:col-span-2" />
                    <textarea value={videoDescription} onChange={(e) => setVideoDescription(e.target.value)} placeholder="Video description (optional)" rows={2} className="bg-[#08080d] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]/50 md:col-span-2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={uploadMyVideo}
                      disabled={uploadingVideo}
                      className="inline-flex items-center justify-center rounded-lg border border-[#e8a000]/50 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#e8a000] hover:bg-[#e8a000]/10 disabled:opacity-50"
                    >
                      {uploadingVideo ? (editingVideoId ? 'Saving...' : 'Uploading...') : (editingVideoId ? 'Save Video' : 'Add Video')}
                    </button>
                    {editingVideoId && (
                      <button
                        type="button"
                        onClick={cancelEditVideo}
                        disabled={uploadingVideo}
                        className="inline-flex items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-300 hover:border-white/40 disabled:opacity-50"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {notice && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</div>
        )}

        {activeVideo && (
          <section className="rounded-xl border border-[#e8a000]/30 bg-[#0d0d14] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase font-black text-[#e8a000]">Now Playing</p>
                <p className="text-sm text-white font-semibold mt-1">{activeVideo.streamerName} · {activeVideo.video.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="w-8 h-8 rounded-lg border border-white/10 hover:border-white/30 flex items-center justify-center text-zinc-300"
              >
                <X size={14} />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                title={activeVideo.video.title}
                src={getEmbedUrl(activeVideo.video)}
                className="w-full h-full"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        {loading ? (
          <div className="rounded-xl border border-white/10 bg-[#0d0d14] p-6 text-[#777]">Loading streamers...</div>
        ) : streamers.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#0d0d14] p-6 text-[#777]">No streamer profiles yet. Check back soon.</div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-5">
            {streamers.map((streamer) => {
              const socials = [
                { label: 'YouTube', href: streamer.youtube, icon: <Youtube size={14} /> },
                { label: 'Twitch', href: streamer.twitch, icon: <Twitch size={14} /> },
                { label: 'TikTok', href: streamer.tiktok, icon: <Music2 size={14} /> },
                { label: 'Facebook', href: streamer.facebook, icon: <Facebook size={14} /> },
                { label: 'Instagram', href: streamer.instagram, icon: <Instagram size={14} /> },
                { label: 'X', href: streamer.twitter, icon: <Twitter size={14} /> },
                { label: 'Discord', href: streamer.discord, icon: <MessageCircle size={14} /> },
              ].filter((item) => Boolean(item.href))

              return (
                <article key={streamer.id} className="rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden">
                  <div className="h-28 bg-[#11111a] relative">
                    {streamer.coverImage ? (
                      <Image src={streamer.coverImage} alt={streamer.name} fill className="object-cover opacity-90" />
                    ) : null}
                    <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/10 to-[#0d0d14]" />
                  </div>

                  <div className="px-4 pb-4 -mt-8 relative z-10">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/15 bg-[#151520] shrink-0 relative">
                        {streamer.photo ? (
                          <Image src={streamer.photo} alt={streamer.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl font-black text-[#e8a000]">
                            {streamer.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="pt-8 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-black truncate">{streamer.name}</h2>
                          {streamer.verified && <BadgeCheck size={14} className="text-sky-400" />}
                          {streamer.featured && <span className="text-[10px] font-black rounded-full px-2 py-0.5 border border-[#e8a000]/40 bg-[#e8a000]/10 text-[#e8a000]">Featured</span>}
                        </div>
                        {streamer.bio ? <p className="text-sm text-[#aaa] mt-1 line-clamp-2">{streamer.bio}</p> : null}
                      </div>
                    </div>

                    {socials.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {socials.map((social) => (
                          <a
                            key={`${streamer.id}-${social.label}`}
                            href={social.href as string}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-zinc-200 hover:border-[#e8a000]/40 hover:text-white"
                          >
                            {social.icon}
                            {social.label}
                            <ExternalLink size={11} />
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-[#777]">Videos</p>
                        <span className="text-[10px] text-[#666]">{streamer._count?.videos ?? streamer.videos.length} total</span>
                      </div>

                      {streamer.videos.length === 0 ? (
                        <p className="text-xs text-[#666]">No videos added yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {streamer.videos.slice(0, 4).map((video) => (
                            <button
                              key={video.id}
                              type="button"
                              onClick={() => setActiveVideo({ streamerName: streamer.name, video })}
                              className="w-full text-left rounded-lg border border-white/10 bg-white/2 p-2.5 hover:border-[#e8a000]/40 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-white truncate">{video.title}</p>
                                <PlayCircle size={16} className="text-[#e8a000] shrink-0" />
                              </div>
                              <div className="mt-1 flex items-center justify-between gap-2">
                                <PlatformTag platform={video.platform} />
                                {video.pinned ? <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-300"><CheckCircle2 size={11} />Pinned</span> : null}
                              </div>
                              {myProfile?.id === streamer.id && (
                                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-end gap-2">
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      startEditVideo(video)
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        startEditVideo(video)
                                      }
                                    }}
                                    className="text-[10px] font-black uppercase tracking-wider text-[#e8a000] hover:underline"
                                  >
                                    Edit
                                  </span>
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      void deleteVideo(streamer.id, video.id)
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        void deleteVideo(streamer.id, video.id)
                                      }
                                    }}
                                    className="text-[10px] font-black uppercase tracking-wider text-red-400 hover:underline"
                                  >
                                    {workingVideoId === video.id ? 'Deleting...' : 'Delete'}
                                  </span>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
