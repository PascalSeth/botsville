"use client";

import { useEffect, useMemo, useState } from "react";
import { dashboardFetch } from "../lib/api";
import { Sparkles, Plus, Loader2, Trash2, RefreshCcw, CheckCircle2, CircleDashed, Lock } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  DRAFT: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  CLOSED: "text-zinc-300 bg-zinc-500/10 border-zinc-500/30",
  ALL: "text-white bg-white/10 border-white/20",
};

type PollOption = { id: string; text: string; voteCount: number };
type Poll = {
  id: string;
  question: string;
  status: "ACTIVE" | "DRAFT" | "CLOSED";
  expiresAt: string | null;
  createdAt: string;
  options: PollOption[];
  _count?: { votes: number };
};

type ApiList = { polls: Poll[] };
type ApiSingle = { poll: Poll };

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export default function DashboardPollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DRAFT" | "CLOSED">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["Yes", "No"]);
  const [status, setStatus] = useState<"ACTIVE" | "DRAFT" | "CLOSED">("ACTIVE");
  const [expiresAt, setExpiresAt] = useState("");

  const totalActive = useMemo(() => polls.filter((p) => p.status === "ACTIVE").length, [polls]);

  const load = async () => {
    setLoading(true);
    const { data, error: err } = await dashboardFetch<ApiList>(`/api/polls?status=${statusFilter}`);
    setLoading(false);
    if (err) {
      setError(err);
      setPolls([]);
      return;
    }
    setError(null);
    setPolls((data as ApiList | undefined)?.polls ?? []);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleAddOption = () => setOptions((prev) => [...prev, ""]);
  const handleRemoveOption = (idx: number) => setOptions((prev) => prev.filter((_, i) => i !== idx));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleaned.length < 2) {
      setError("Question and at least 2 options are required.");
      return;
    }
    setSaving(true);
    const { data, error: err } = await dashboardFetch<ApiSingle>("/api/polls", {
      method: "POST",
      body: JSON.stringify({ question, options: cleaned, status, expiresAt: expiresAt || undefined }),
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    const created = (data as ApiSingle | undefined)?.poll;
    if (created) {
      setPolls((prev) => [created, ...prev]);
      setQuestion("");
      setOptions(["Yes", "No"]);
      setStatus("ACTIVE");
      setExpiresAt("");
    }
  };

  const updatePoll = (id: string, payload: Partial<Poll>) => {
    setPolls((prev) => prev.map((p) => (p.id === id ? { ...p, ...payload } : p)));
  };

  const handleStatusChange = async (poll: Poll, next: Poll["status"]) => {
    setActionId(poll.id + next);
    const { data, error: err } = await dashboardFetch<ApiSingle>(`/api/polls/${poll.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    setActionId(null);
    if (err) {
      setError(err);
      return;
    }
    const updated = (data as ApiSingle | undefined)?.poll;
    if (updated) updatePoll(poll.id, updated);
  };

  const handleDelete = async (poll: Poll) => {
    if (!confirm("Delete this poll? This removes votes and options.")) return;
    setActionId(poll.id + "delete");
    const { error: err } = await dashboardFetch(`/api/polls/${poll.id}`, { method: "DELETE" });
    setActionId(null);
    if (err) {
      setError(err);
      return;
    }
    setPolls((prev) => prev.filter((p) => p.id !== poll.id));
  };

  const handleAddOptionToPoll = async (poll: Poll) => {
    const text = prompt("New option text?");
    if (!text) return;
    setActionId(poll.id + "opt");
    const { data, error: err } = await dashboardFetch<ApiSingle>(`/api/polls/${poll.id}`, {
      method: "PATCH",
      body: JSON.stringify({ optionsToAdd: [text] }),
    });
    setActionId(null);
    if (err) {
      setError(err);
      return;
    }
    const updated = (data as ApiSingle | undefined)?.poll;
    if (updated) updatePoll(poll.id, updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-black text-2xl sm:text-3xl text-white uppercase tracking-[0.08em] flex items-center gap-2">
            <Sparkles size={22} className="text-[#e8a000]" /> Polls
          </h1>
          <p className="mt-1 text-sm text-[#888]">Create, activate, close, and enrich polls for the community.</p>
          <p className="mt-1 text-xs text-[#666]">Active now: {totalActive} / {polls.length}</p>
        </div>
        <button
          onClick={() => load()}
          className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-[#0d0d14] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#aaa] hover:border-[#e8a000]/40 hover:text-white"
        >
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <form onSubmit={handleCreate} className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666]">Create poll</p>
              <p className="text-xs text-[#555]">Minimum two options, optional expiry.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-[#e8a000] px-3 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-[#d4900a] disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-zinc-400">Question</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Who wins the next scrim?"
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-zinc-400">Options</label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={(e) => setOptions((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))}
                    className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]/50"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-2 text-xs text-zinc-400 hover:text-white"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddOption}
                className="inline-flex items-center gap-2 rounded-md border border-dashed border-white/15 px-3 py-2 text-xs text-zinc-400 hover:text-white"
              >
                <Plus size={12} /> Add option
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Poll["status"])}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]/50"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Expires at (optional)</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#e8a000]/50"
              />
            </div>
          </div>
        </form>

        <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {["ALL", "ACTIVE", "DRAFT", "CLOSED"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s as typeof statusFilter)}
                className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                  statusFilter === s
                    ? STATUS_COLORS[s]
                    : "border-white/10 text-zinc-400 hover:border-[#e8a000]/40 hover:text-white"
                }`}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-lg border border-white/5 bg-white/5 p-4 space-y-3">
                  <div className="h-4 w-2/3 rounded bg-white/10" />
                  <div className="h-3 w-1/3 rounded bg-white/10" />
                  <div className="h-10 w-full rounded bg-white/10" />
                </div>
              ))}
            </div>
          ) : polls.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">No polls yet.</div>
          ) : (
            <div className="space-y-4">
              {polls.map((poll) => {
                const totalVotes = poll.options.reduce((sum, o) => sum + o.voteCount, 0);
                return (
                  <div
                    key={poll.id}
                    className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[poll.status] ?? ""}`}>
                            {poll.status}
                          </span>
                          <span className="text-[11px] text-zinc-500">Expires: {formatDate(poll.expiresAt)}</span>
                        </div>
                        <p className="text-lg font-bold text-white leading-tight">{poll.question}</p>
                        <p className="text-xs text-zinc-500">{totalVotes.toLocaleString()} votes</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleStatusChange(poll, "ACTIVE")}
                          disabled={poll.status === "ACTIVE" || !!actionId}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 disabled:opacity-40"
                        >
                          <CheckCircle2 size={14} /> Activate
                        </button>
                        <button
                          onClick={() => handleStatusChange(poll, "DRAFT")}
                          disabled={poll.status === "DRAFT" || !!actionId}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 disabled:opacity-40"
                        >
                          <CircleDashed size={14} /> Draft
                        </button>
                        <button
                          onClick={() => handleStatusChange(poll, "CLOSED")}
                          disabled={poll.status === "CLOSED" || !!actionId}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-500/30 bg-zinc-500/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 disabled:opacity-40"
                        >
                          <Lock size={14} /> Close
                        </button>
                        <button
                          onClick={() => handleAddOptionToPoll(poll)}
                          disabled={!!actionId}
                          className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:border-[#e8a000]/40 disabled:opacity-40"
                        >
                          <Plus size={14} /> Add option
                        </button>
                        <button
                          onClick={() => handleDelete(poll)}
                          disabled={!!actionId}
                          className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 disabled:opacity-40"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {poll.options.map((opt) => {
                        const percent = totalVotes ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
                        return (
                          <div key={opt.id} className="relative overflow-hidden rounded-md border border-white/10 bg-white/3 px-3 py-2">
                            <div
                              className="absolute inset-0 bg-gradient-to-r from-[#e8a000]/15 via-[#e8a000]/10 to-transparent"
                              style={{ width: `${Math.max(percent, 4)}%` }}
                            />
                            <div className="relative flex items-center justify-between text-sm text-white">
                              <span>{opt.text}</span>
                              <span className="text-xs text-zinc-300">{opt.voteCount.toLocaleString()} · {percent}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
