"use client";

import { useEffect, useState } from "react";
import {
  listSettings,
  listFeatureFlags,
  upsertSetting,
  updateFeatureFlag,
  PlatformSetting,
  FeatureFlag,
} from "@/lib/api-client";

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const [s, f] = await Promise.all([listSettings(), listFeatureFlags()]);
      setSettings(s);
      setFlags(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveSetting = async (key: string, value: unknown, type: string) => {
    try {
      await upsertSetting(key, value, type);
      setMsg(`Saved ${key}`);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    }
  };

  const toggleFlag = async (key: string, enabled: boolean) => {
    try {
      await updateFeatureFlag(key, enabled);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  };

  const getVal = (key: string) => settings.find((s) => s.key === key)?.value;

  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Platform Settings</h1>
      {msg && <p className="mb-4 text-sm text-green-400">{msg}</p>}

      <section className="mb-8 rounded-xl border border-surface-border bg-surface-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Subscriptions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-gray-400">Monthly price (KES)</span>
            <input
              type="number"
              defaultValue={Number(getVal("subscription.monthly_price") ?? 400)}
              className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
              onBlur={(e) =>
                saveSetting("subscription.monthly_price", Number(e.target.value), "number")
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-400">Annual price (KES)</span>
            <input
              type="number"
              defaultValue={Number(getVal("subscription.annual_price") ?? 4320)}
              className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
              onBlur={(e) =>
                saveSetting("subscription.annual_price", Number(e.target.value), "number")
              }
            />
          </label>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-surface-border bg-surface-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Revenue split (%)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-gray-400">Filmmaker</span>
            <input
              type="number"
              defaultValue={Number(getVal("revenue.filmmaker_percentage") ?? 70)}
              className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
              onBlur={(e) =>
                saveSetting("revenue.filmmaker_percentage", Number(e.target.value), "number")
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-400">Platform</span>
            <input
              type="number"
              defaultValue={Number(getVal("revenue.platform_percentage") ?? 30)}
              className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
              onBlur={(e) =>
                saveSetting("revenue.platform_percentage", Number(e.target.value), "number")
              }
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-500">Must sum to 100%</p>
      </section>

      <section className="rounded-xl border border-surface-border bg-surface-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Feature flags</h2>
        <div className="space-y-2">
          {flags.map((f) => (
            <label key={f.key} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
              <span className="text-sm text-gray-300">{f.key}</span>
              <input
                type="checkbox"
                checked={f.enabled}
                onChange={(e) => toggleFlag(f.key, e.target.checked)}
                className="h-4 w-4"
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
