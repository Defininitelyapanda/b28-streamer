"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { getOverview, OverviewStats } from "@/lib/api-client";

export default function OverviewPage() {
  const [data, setData] = useState<OverviewStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getOverview()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  if (!data) {
    return <p className="text-gray-400">Loading overview...</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={data.users.total} />
        <StatCard
          label="API status"
          value={data.health.status === "ready" ? "Ready" : "Degraded"}
          sub={`DB: ${data.health.checks.database ? "OK" : "Down"} · Redis: ${data.health.checks.redis ? "OK" : "Down"}`}
        />
        <StatCard
          label="Monthly price"
          value={`${data.settings.currency} ${data.settings.monthlyPrice}`}
        />
        <StatCard
          label="Revenue split"
          value={`${data.settings.filmmakerShare}% / ${data.settings.platformShare}%`}
          sub="Filmmaker / Platform"
        />
      </div>
      <div className="mt-8 rounded-xl border border-surface-border bg-surface-card p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Users by role</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.entries(data.users.byRole).map(([role, count]) => (
            <div key={role} className="flex justify-between rounded-lg bg-surface px-3 py-2 text-sm">
              <span className="text-gray-400">{role}</span>
              <span className="font-medium text-white">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
