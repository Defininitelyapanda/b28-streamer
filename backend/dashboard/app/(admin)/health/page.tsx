"use client";

import { useEffect, useState } from "react";
import { apiHealthReady } from "@/lib/api-client";
import { StatCard } from "@/components/StatCard";

export default function HealthPage() {
  const [health, setHealth] = useState<{
    status: string;
    checks: { database: boolean; redis: boolean };
  } | null>(null);

  useEffect(() => {
    apiHealthReady().then(setHealth).catch(console.error);
    const id = setInterval(() => apiHealthReady().then(setHealth).catch(console.error), 10000);
    return () => clearInterval(id);
  }, []);

  if (!health) return <p className="text-gray-400">Checking health...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">System Health</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Overall" value={health.status} />
        <StatCard label="Database" value={health.checks.database ? "Connected" : "Down"} />
        <StatCard label="Redis" value={health.checks.redis ? "Connected" : "Down"} />
      </div>
    </div>
  );
}
