"use client";

import { useEffect, useState } from "react";
import {
  approveFilmmakerApplication,
  FilmmakerApplication,
  listFilmmakerApplications,
  rejectFilmmakerApplication,
} from "@/lib/api-client";

export default function FilmmakersPage() {
  const [applications, setApplications] = useState<FilmmakerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");

  const load = () => {
    setLoading(true);
    listFilmmakerApplications(filter)
      .then(setApplications)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load applications"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filter]);

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await approveFilmmakerApplication(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      await rejectFilmmakerApplication(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">Filmmaker applications</h1>
      <p className="mb-6 text-sm text-gray-400">
        Review and approve filmmaker signups. Approved users receive the FILMMAKER role and
        complimentary streaming.
      </p>

      <div className="mb-6 flex gap-2">
        {(["PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              filter === status
                ? "bg-accent text-white"
                : "border border-surface-border bg-surface-card text-gray-400"
            }`}
          >
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-400">Loading applications…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && applications.length === 0 && (
        <p className="text-gray-400">No {filter.toLowerCase()} applications.</p>
      )}

      {!loading && applications.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-surface-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-card text-gray-400">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-t border-surface-border">
                  <td className="px-4 py-3 text-gray-200">{app.email ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-400">{app.displayName ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded px-2 py-0.5 text-xs uppercase text-gray-300">
                      {app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {app.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === app.id}
                          onClick={() => handleApprove(app.id)}
                          className="text-xs text-green-400 hover:underline disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyId === app.id}
                          onClick={() => handleReject(app.id)}
                          className="text-xs text-red-400 hover:underline disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
