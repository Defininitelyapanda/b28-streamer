"use client";

import { useState } from "react";
import Link from "next/link";
import FilmsSubNav from "@/components/FilmsSubNav";
import AssetUploadCard from "@/components/AssetUploadCard";
import { publishTitleBundle } from "@/lib/api-client";
import type { CatalogAssetKind, UploadedAsset } from "@/lib/upload-assets";

const STREAMER_ORIGIN =
  process.env.NEXT_PUBLIC_STREAMER_ORIGIN ?? "http://localhost:3000";

const emptyMeta: {
  slug: string;
  title: string;
  genre: string;
  description: string;
  date: string;
  rating: string;
  accessTier: "FREE" | "PREMIUM";
  playbackFormat: "MP4" | "HLS";
} = {
  slug: "",
  title: "",
  genre: "Drama",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  rating: "8.0",
  accessTier: "FREE" as const,
  playbackFormat: "MP4" as const,
};

export default function FilmsUploadPage() {
  const [meta, setMeta] = useState(emptyMeta);
  const [assets, setAssets] = useState<Partial<Record<CatalogAssetKind, UploadedAsset>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ filmSlug: string; trailerSlug: string | null } | null>(
    null,
  );

  function setAsset(kind: CatalogAssetKind, asset: UploadedAsset) {
    setAssets((prev) => ({ ...prev, [kind]: asset }));
  }

  function clearAsset(kind: CatalogAssetKind) {
    setAssets((prev) => {
      const next = { ...prev };
      delete next[kind];
      return next;
    });
  }

  async function handlePublish() {
    setError("");
    setResult(null);

    if (!meta.slug.trim() || !meta.title.trim()) {
      setError("Slug and title are required.");
      return;
    }
    if (!assets.thumbnail?.key) {
      setError("Upload a thumbnail before publishing.");
      return;
    }
    if (!assets.film?.key) {
      setError("Upload the full film before publishing.");
      return;
    }

    setBusy(true);
    try {
      const response = await publishTitleBundle({
        slug: meta.slug.trim(),
        title: meta.title.trim(),
        date: meta.date,
        genre: meta.genre,
        description: meta.description,
        rating: meta.rating,
        thumbnailKey: assets.thumbnail.key,
        posterKey: assets.poster?.key,
        filmStorageKey: assets.film.key,
        trailerStorageKey: assets.trailer?.key,
        accessTier: meta.accessTier,
        playbackFormat: meta.playbackFormat,
        seriesGroup: meta.title.trim(),
        published: true,
      });
      setResult({ filmSlug: response.film.id, trailerSlug: response.trailerSlug });
      setMeta(emptyMeta);
      setAssets({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <FilmsSubNav />

      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-white">Upload title</h1>
        <p className="text-sm text-gray-400">
          Upload thumbnail, poster, full film, and optional trailer in one flow. Images require{" "}
          <code className="text-gray-300">R2_PUBLIC_DOMAIN</code> on the API.
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {result && (
        <div className="mb-6 rounded-xl border border-green-500/30 bg-green-950/30 p-4 text-sm text-green-200">
          <p className="font-semibold">Published successfully.</p>
          <p className="mt-2">
            Film:{" "}
            <a
              href={`${STREAMER_ORIGIN}/watch/${encodeURIComponent(result.filmSlug)}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              /watch/{result.filmSlug}
            </a>
          </p>
          {result.trailerSlug && (
            <p className="mt-1">
              Trailer:{" "}
              <a
                href={`${STREAMER_ORIGIN}/watch/${encodeURIComponent(result.trailerSlug)}`}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                /watch/{result.trailerSlug}
              </a>
            </p>
          )}
          <Link href="/films" className="mt-3 inline-block text-accent underline">
            Back to catalog
          </Link>
        </div>
      )}

      <section className="mb-8 rounded-xl border border-surface-border bg-surface-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Metadata</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(["slug", "title", "genre", "rating"] as const).map((field) => (
            <label key={field} className="block text-sm capitalize">
              <span className="text-gray-400">{field}</span>
              <input
                value={meta[field]}
                onChange={(e) => setMeta({ ...meta, [field]: e.target.value })}
                className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
              />
            </label>
          ))}
          <label className="block text-sm md:col-span-2">
            <span className="text-gray-400">Description</span>
            <textarea
              value={meta.description}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-400">Release date</span>
            <input
              type="date"
              value={meta.date}
              onChange={(e) => setMeta({ ...meta, date: e.target.value })}
              className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-400">Access tier</span>
            <select
              value={meta.accessTier}
              onChange={(e) =>
                setMeta({ ...meta, accessTier: e.target.value as "FREE" | "PREMIUM" })
              }
              className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
            >
              <option value="FREE">FREE</option>
              <option value="PREMIUM">PREMIUM</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-gray-400">Playback format</span>
            <select
              value={meta.playbackFormat}
              onChange={(e) =>
                setMeta({ ...meta, playbackFormat: e.target.value as "MP4" | "HLS" })
              }
              className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
            >
              <option value="MP4">MP4 (R2)</option>
              <option value="HLS">HLS (R2)</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-2">
        {(["thumbnail", "poster", "film", "trailer"] as CatalogAssetKind[]).map((kind) => (
          <AssetUploadCard
            key={kind}
            slug={meta.slug}
            assetKind={kind}
            disabled={busy}
            onUploaded={(asset) => setAsset(kind, asset)}
            onClear={() => clearAsset(kind)}
          />
        ))}
      </section>

      <button
        type="button"
        disabled={busy}
        onClick={handlePublish}
        className="rounded bg-accent px-6 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Publishing…" : "Publish title"}
      </button>
    </div>
  );
}
