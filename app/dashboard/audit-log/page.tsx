"use client";

import { useState, useEffect, useCallback } from "react";
import { dashboardFetch } from "../lib/api";
import { FileText } from "lucide-react";

type LogEntry = {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string | null;
  createdAt: string;
  actor: { id: string; email: string; ign: string } | null;
};

type Payload = {
  logs: LogEntry[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export default function DashboardAuditLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actorId, setActorId] = useState("");
  const [targetType, setTargetType] = useState("");
  const [targetId, setTargetId] = useState("");

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (actorId.trim()) params.set("actorId", actorId.trim());
    if (targetType.trim()) params.set("targetType", targetType.trim());
    if (targetId.trim()) params.set("targetId", targetId.trim());
    const { data, error: err } = await dashboardFetch<Payload>(`/api/admin/audit-log?${params}`);
    setLoading(false);
    if (err) {
      setError(err);
      setLogs([]);
      return;
    }
    setError(null);
    if (data?.logs) setLogs(data.logs);
    if (data?.pagination) setPagination(data.pagination);
  }, [actorId, targetType, targetId]);

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-black text-2xl tracking-tight text-white uppercase tracking-[0.08em]">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-[#888]">
          Admin actions: role assignments, bans, sensitive overrides. Filter by actor, target type, or target ID.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#e8a000] mb-3 flex items-center gap-2">
          <FileText size={16} /> Filters
        </h2>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Actor ID"
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            className="bg-[#0d0d14] border border-white/10 text-white px-3 py-1.5 text-sm w-48 outline-none focus:border-[#e8a000]/50"
          />
          <input
            type="text"
            placeholder="Target type"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="bg-[#0d0d14] border border-white/10 text-white px-3 py-1.5 text-sm w-48 outline-none focus:border-[#e8a000]/50"
          />
          <input
            type="text"
            placeholder="Target ID"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="bg-[#0d0d14] border border-white/10 text-white px-3 py-1.5 text-sm w-48 outline-none focus:border-[#e8a000]/50"
          />
          <button
            type="button"
            onClick={() => load(1)}
            className="px-4 py-1.5 bg-[#e8a000] text-black text-xs font-black uppercase tracking-wider hover:bg-[#ffb800]"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#666]">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-[#666]">No audit log entries.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-[#666]">
                    <th className="p-3">Time</th>
                    <th className="p-3">Actor</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3 text-[#666] text-sm whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-white text-sm">
                        {log.actor?.ign ?? log.actorId}
                      </td>
                      <td className="p-3 text-[#e8a000] text-sm font-semibold">{log.action}</td>
                      <td className="p-3 text-[#aaa] text-sm">
                        {log.targetType} · {log.targetId.slice(0, 8)}…
                      </td>
                      <td className="p-3 text-[#666] text-xs max-w-xs truncate">
                        {log.details ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-white/10 text-sm text-[#666]">
                <span>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => load(pagination.page - 1)}
                    className="px-3 py-1 border border-white/10 text-white disabled:opacity-50 hover:bg-white/5"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => load(pagination.page + 1)}
                    className="px-3 py-1 border border-white/10 text-white disabled:opacity-50 hover:bg-white/5"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
