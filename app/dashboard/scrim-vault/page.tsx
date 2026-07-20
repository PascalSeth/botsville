"use client";


import { useRoleGuard } from "../lib/useRole";
import { useState, useEffect, useCallback } from "react";
import { dashboardFetch } from "../lib/api";
import { Check, X, Loader2, Pencil, Trash2, ExternalLink } from "lucide-react";
import { generateFilePath, STORAGE_BUCKETS, uploadImage } from "@/lib/supabase";

type VideoItem = {
  id: string;
  title: string;
  videoUrl: string;
  matchup: string | null;
  status: string;
  featured: boolean;
  category: string;
  duration: string | null;
  rejectionReason: string | null;
  createdAt: string;
  tournament?: { id: string; name: string } | null;
  submittedBy?: { id: string; ign: string } | null;
};

type Payload = {
  videos: VideoItem[];
  pagination: { total: number; limit: number; skip: number };
};

type TournamentOption = { id: string; name: string; status: string };

export default function DashboardScrimVaultPage() {
  const { role, userId } = useRoleGuard(["CONTENT_ADMIN", "EDITOR", "STREAMER"]);
  const canModerate = ["SUPER_ADMIN", "CONTENT_ADMIN", "EDITOR"].includes(role ?? "");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, skip: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [matchup, setMatchup] = useState("");
  const [featured, setFeatured] = useState(false);
  const [sourceType, setSourceType] = useState<"link" | "upload">("link");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [popupVideo, setPopupVideo] = useState<VideoItem | null>(null);
  const [category, setCategory] = useState("SCRIM");
  const [filterCategory, setFilterCategory] = useState("");
  const [tournamentMatches, setTournamentMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchId, setMatchId] = useState("");
  // Tournament linking: "" = plain scrim, otherwise VOD for that tournament
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [tournamentId, setTournamentId] = useState("");

  useEffect(() => {
    setMatchId("");
    if (!tournamentId) {
      setTournamentMatches([]);
      return;
    }
    (async () => {
      setLoadingMatches(true);
      const { data } = await dashboardFetch<any[]>(`/api/tournaments/${tournamentId}/matches`);
      const matches = data ?? [];
      setTournamentMatches(matches);
      setLoadingMatches(false);

      if (editingId && youtubeUrl) {
        const found = matches.find((m) => m.streamUrl === youtubeUrl);
        if (found) {
          setMatchId(found.id);
        }
      }
    })();
  }, [tournamentId, editingId, youtubeUrl]);

  useEffect(() => {
    (async () => {
      const { data } = await dashboardFetch<{ tournaments: TournamentOption[] }>("/api/tournaments?limit=100");
      const list = data?.tournaments ?? [];
      // Active/upcoming first so streamers find the current tournament quickly
      list.sort((a, b) => {
        const rank = (s: string) => (s === "COMPLETED" ? 1 : 0);
        return rank(a.status) - rank(b.status);
      });
      setTournaments(list);
    })();
  }, []);

  const isYouTubeUrl = (url: string) => /(?:youtube\.com|youtu\.be)/i.test(url);
  const isTwitchUrl = (url: string) => /(?:twitch\.tv)/i.test(url);

  const getYouTubeEmbedUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtu.be")) {
        const id = parsed.pathname.slice(1);
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (parsed.hostname.includes("youtube.com")) {
        const id = parsed.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const getTwitchEmbedUrl = (url: string, forPopup = false) => {
    try {
      const parsed = new URL(url);
      const parent = typeof window !== "undefined" ? window.location.hostname : "localhost";
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      
      // Handle different Twitch URL formats
      // Live channel: twitch.tv/channelname
      // VOD: twitch.tv/videos/123456789
      // Clip: twitch.tv/channelname/clip/ClipSlug or clips.twitch.tv/ClipSlug
      
      if (parsed.hostname === "clips.twitch.tv") {
        // Clip URL format: clips.twitch.tv/ClipSlug
        const clipSlug = pathParts[0];
        return clipSlug ? `https://clips.twitch.tv/embed?clip=${clipSlug}&parent=${parent}` : null;
      }
      
      if (pathParts[0] === "videos" && pathParts[1]) {
        // VOD URL format: twitch.tv/videos/123456789
        return `https://player.twitch.tv/?video=${pathParts[1]}&parent=${parent}`;
      }
      
      if (pathParts[1] === "clip" && pathParts[2]) {
        // Clip URL format: twitch.tv/channelname/clip/ClipSlug
        return `https://clips.twitch.tv/embed?clip=${pathParts[2]}&parent=${parent}`;
      }
      
      if (pathParts[0] && !pathParts[1]) {
        // Live channel URL format: twitch.tv/channelname
        return `https://player.twitch.tv/?channel=${pathParts[0]}&parent=${parent}`;
      }
      
      return null;
    } catch {
      return null;
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setMatchup("");
    setFeatured(false);
    setSourceType("link");
    setYoutubeUrl("");
    setVideoFile(null);
    setTournamentId("");
    setCategory("SCRIM");
    setMatchId("");
  };

  const uploadVideoToStorage = async (file: File): Promise<string> => {
    const extension = (file.name.split(".").pop() || "mp4").toLowerCase();
    const path = generateFilePath("scrim-vault", crypto.randomUUID(), `video-${extension}`);
    const { url, error: uploadError } = await uploadImage(STORAGE_BUCKETS.SCRIM_VAULT, path, file, { upsert: false });
    if (uploadError || !url) {
      throw new Error(uploadError?.message || "Failed to upload video file");
    }
    return url;
  };

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (status) params.set("status", status);
    if (filterCategory) params.set("category", filterCategory);
    const { data, error: err } = await dashboardFetch<Payload>(`/api/scrim-vault?${params}`);
    setLoading(false);
    if (err) {
      setError(err);
      setVideos([]);
      return;
    }
    setError(null);
    setVideos(data?.videos ?? []);
    if (data?.pagination) setPagination(data.pagination);
  }, [status, filterCategory]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateOrUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setActing(editingId ?? "create");
    try {
      let finalVideoUrl = youtubeUrl.trim();

      if (sourceType === "upload") {
        if (videoFile) {
          if (!videoFile.type.startsWith("video/")) {
            throw new Error("Please select a valid video file");
          }
          finalVideoUrl = await uploadVideoToStorage(videoFile);
        } else if (!editingId) {
          throw new Error("Video file is required");
        }
      }

      if (!finalVideoUrl) {
        throw new Error("Video URL is required");
      }

      if (editingId) {
        const { error: updateError } = await dashboardFetch("/api/scrim-vault", {
          method: "PUT",
          body: JSON.stringify({
            videoId: editingId,
            action: "update",
            title: title.trim(),
            matchup: matchup.trim() || null,
            featured,
            videoUrl: finalVideoUrl,
            tournamentId: tournamentId || null,
            category,
          }),
        });
        if (updateError) throw new Error(updateError);
      } else {
        const { error: createError } = await dashboardFetch("/api/scrim-vault", {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            matchup: matchup.trim() || null,
            featured,
            videoUrl: finalVideoUrl,
            tournamentId: tournamentId || null,
            category,
          }),
        });
        if (createError) throw new Error(createError);
      }

      if (matchId) {
        await dashboardFetch(`/api/matches/${matchId}/stream`, {
          method: "PATCH",
          body: JSON.stringify({ streamUrl: finalVideoUrl }),
        });
      }

      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save video");
    } finally {
      setActing(null);
    }
  };

  const handleApproveReject = async (videoId: string, action: "approve" | "reject", rejectionReason?: string) => {
    setActing(videoId);
    setError(null);
    const { error: err } = await dashboardFetch("/api/scrim-vault", {
      method: "PUT",
      body: JSON.stringify({ videoId, action, rejectionReason: action === "reject" ? rejectionReason || "Rejected by admin" : undefined }),
    });
    setActing(null);
    if (err) {
      setError(err);
      return;
    }
    await load();
  };

  const handleDelete = async (videoId: string) => {
    setActing(videoId);
    setError(null);
    const { error: deleteError } = await dashboardFetch("/api/scrim-vault", {
      method: "DELETE",
      body: JSON.stringify({ videoId }),
    });
    setActing(null);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    await load();
  };

  const startEdit = (video: VideoItem) => {
    setEditingId(video.id);
    setTitle(video.title);
    setMatchup(video.matchup ?? "");
    setFeatured(video.featured);
    setTournamentId(video.tournament?.id ?? "");
    setCategory(video.category ?? "SCRIM");
    if (isYouTubeUrl(video.videoUrl) || isTwitchUrl(video.videoUrl)) {
      setSourceType("link");
      setYoutubeUrl(video.videoUrl);
    } else {
      setSourceType("upload");
      setYoutubeUrl(video.videoUrl);
    }
    setVideoFile(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black text-2xl text-white uppercase tracking-[0.08em]">
            Scrim vault
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            Create, edit, approve, reject, and delete scrim videos. Supports uploaded files and YouTube links with in-site playback.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          >
            <option value="">All categories</option>
            <option value="SCRIM">SCRIM</option>
            <option value="TOURNAMENT">TOURNAMENT</option>
            <option value="COMMUNITY">COMMUNITY</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          >
            <option value="">All statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleCreateOrUpdate} className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-4 sm:p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Video title"
            className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            required
          />
          <input
            value={matchup}
            onChange={(event) => setMatchup(event.target.value)}
            placeholder="Matchup (optional)"
            className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          />
          <select
            value={tournamentId}
            onChange={(event) => {
              const val = event.target.value;
              setTournamentId(val);
              if (val) {
                setCategory("TOURNAMENT");
              } else if (category === "TOURNAMENT") {
                setCategory("SCRIM");
              }
            }}
            className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          >
            <option value="">Scrim — no tournament</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}{t.status !== "COMPLETED" ? " (active)" : ""}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
          >
            <option value="SCRIM">Scrim VOD</option>
            <option value="TOURNAMENT">Tournament VOD</option>
            <option value="COMMUNITY">Community / Random Video</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="text-xs text-[#aaa] uppercase tracking-wider font-bold">Source</label>
          <label className="flex items-center gap-2 text-sm text-[#aaa]">
            <input
              type="radio"
              name="sourceType"
              checked={sourceType === "link"}
              onChange={() => setSourceType("link")}
              className="accent-[#e8a000]"
            />
            YouTube / Twitch Link
          </label>
          <label className="flex items-center gap-2 text-sm text-[#aaa]">
            <input
              type="radio"
              name="sourceType"
              checked={sourceType === "upload"}
              onChange={() => setSourceType("upload")}
              className="accent-[#e8a000]"
            />
            Upload video
          </label>
          <label className="flex items-center gap-2 text-sm text-[#aaa]">
            <input
              type="checkbox"
              checked={featured}
              onChange={(event) => setFeatured(event.target.checked)}
              className="accent-[#e8a000]"
            />
            Featured
          </label>
        </div>

        {sourceType === "link" ? (
          <input
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=... or https://www.twitch.tv/videos/..."
            className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
            required
          />
        ) : (
          <div className="space-y-2">
            <input
              type="file"
              accept="video/*"
              onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
              className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none file:mr-3 file:px-2 file:py-1 file:border file:border-white/20 file:bg-transparent file:text-[10px] file:uppercase file:tracking-wider file:text-white"
              required={!editingId}
            />
            {editingId && (
              <p className="text-[11px] text-[#666]">Leave file empty to keep current uploaded video URL.</p>
            )}
          </div>
        )}

        {tournamentId && (
          <div className="flex flex-col gap-1.5 bg-[#0d0d14]/40 p-3 rounded border border-white/5">
            <label className="text-[10px] font-bold text-[#e8a000] uppercase tracking-wide">
              Link to Match (optional)
            </label>
            {loadingMatches ? (
              <span className="text-xs text-[#666] flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Loading tournament matches...
              </span>
            ) : (
              <select
                value={matchId}
                onChange={(event) => {
                  const mId = event.target.value;
                  setMatchId(mId);
                  const m = tournamentMatches.find((x) => x.id === mId);
                  if (m) {
                    setTitle(`${m.teamA?.name ?? "TBD"} vs ${m.teamB?.name ?? "TBD"}`);
                    setMatchup(`${m.teamA?.tag ?? "TBD"} vs ${m.teamB?.tag ?? "TBD"}`);
                    if (m.streamUrl) {
                      setYoutubeUrl(m.streamUrl);
                    }
                  }
                }}
                className="w-full bg-[#0d0d14] border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-[#e8a000]/50"
              >
                <option value="">-- Select a Match to link/set stream link --</option>
                {tournamentMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.stage ? `[${m.stage}] ` : ""}{m.teamA?.name ?? "TBD"} vs {m.teamB?.name ?? "TBD"} ({new Date(m.scheduledTime).toLocaleDateString()}) {m.streamUrl ? "🔗" : ""}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[10px] text-[#666]">
              Linking a match will automatically set the stream link for that match and fill the title/matchup fields.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={acting === "create" || Boolean(editingId && acting === editingId)}
            className="px-4 py-2 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800] disabled:opacity-50 inline-flex items-center gap-2"
          >
            {(acting === "create" || Boolean(editingId && acting === editingId)) ? <Loader2 size={14} className="animate-spin" /> : null}
            {editingId ? "Update video" : "Create video"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-white/20 text-[#aaa] text-xs font-bold uppercase tracking-wider hover:bg-white/5"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#666]">Loading...</div>
        ) : videos.length === 0 ? (
          <div className="p-8 text-center text-[#666]">No videos found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                  <th className="p-3">Title</th>
                  <th className="p-3">Preview</th>
                  <th className="p-3">Tournament</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Submitted by</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Featured</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((v) => (
                  <tr key={v.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="p-3 text-white font-semibold">{v.title}</td>
                    <td className="p-3">
                      <div className="w-52 h-28 bg-black/40 border border-white/10 overflow-hidden relative group">
                        {isYouTubeUrl(v.videoUrl) ? (
                          (() => {
                            const embedUrl = getYouTubeEmbedUrl(v.videoUrl);
                            return embedUrl ? (
                              <iframe
                                src={embedUrl}
                                title={v.title}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] text-[#666]">Invalid YouTube URL</div>
                            );
                          })()
                        ) : isTwitchUrl(v.videoUrl) ? (
                          <div className="relative w-full h-full">
                            <div className="absolute inset-0 bg-[#9146ff]/20 flex flex-col items-center justify-center">
                              <svg className="w-8 h-8 text-[#9146ff] mb-1" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                              </svg>
                              <span className="text-[10px] text-[#9146ff] font-bold uppercase">Twitch</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPopupVideo(v)}
                              className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <span className="flex items-center gap-1 text-white text-xs font-bold uppercase">
                                <ExternalLink size={14} /> Open Popup
                              </span>
                            </button>
                          </div>
                        ) : (
                          <video src={v.videoUrl} controls preload="metadata" className="w-full h-full object-cover" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-[#aaa] text-sm">{v.tournament?.name ?? "Scrim"}</td>
                    <td className="p-3 text-[#aaa] text-sm">{v.category}</td>
                    <td className="p-3 text-[#aaa] text-sm">{v.submittedBy?.ign ?? "—"}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          v.status === "APPROVED"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : v.status === "REJECTED"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-[#e8a000]/20 text-[#e8a000]"
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#666] text-sm">{v.featured ? "Yes" : "No"}</td>
                    <td className="p-3 text-[#666] text-sm">{new Date(v.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex gap-2 flex-wrap">
                        {canModerate && v.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              disabled={acting === v.id}
                              onClick={() => handleApproveReject(v.id, "approve")}
                              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs font-bold uppercase disabled:opacity-50"
                            >
                              {acting === v.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={acting === v.id}
                              onClick={() => handleApproveReject(v.id, "reject")}
                              className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs font-bold uppercase disabled:opacity-50"
                            >
                              <X size={12} /> Reject
                            </button>
                          </>
                        )}
                        {(canModerate || v.submittedBy?.id === userId) && (
                          <>
                            <button
                              type="button"
                              disabled={acting === v.id}
                              onClick={() => startEdit(v)}
                              className="flex items-center gap-1 text-[#e8a000] hover:text-[#ffb800] text-xs font-bold uppercase disabled:opacity-50"
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              disabled={acting === v.id}
                              onClick={() => handleDelete(v.id)}
                              className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs font-bold uppercase disabled:opacity-50"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.total > 0 && (
          <div className="p-3 border-t border-white/10 text-[10px] text-[#666] uppercase tracking-wider">
            Total: {pagination.total}
          </div>
        )}
      </div>

      {/* Twitch Popup Modal */}
      {popupVideo && isTwitchUrl(popupVideo.videoUrl) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPopupVideo(null)}
        >
          <div 
            className="relative w-full max-w-5xl mx-4 bg-[#0a0a0f] border border-white/10 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-[#9146ff]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                </svg>
                <div>
                  <h3 className="text-white font-bold">{popupVideo.title}</h3>
                  {popupVideo.matchup && (
                    <p className="text-xs text-[#aaa]">{popupVideo.matchup}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPopupVideo(null)}
                className="p-2 text-[#aaa] hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              {(() => {
                const embedUrl = getTwitchEmbedUrl(popupVideo.videoUrl, true);
                return embedUrl ? (
                  <iframe
                    src={embedUrl}
                    title={popupVideo.title}
                    className="w-full h-full"
                    allowFullScreen
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-[#666]">
                    Invalid Twitch URL
                  </div>
                );
              })()}
            </div>
            <div className="p-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-[#666]">
                {popupVideo.submittedBy?.ign ? `Submitted by ${popupVideo.submittedBy.ign}` : ""}
              </span>
              <a
                href={popupVideo.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#9146ff] hover:text-[#a970ff] text-xs font-bold uppercase"
              >
                <ExternalLink size={12} /> Open on Twitch
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
