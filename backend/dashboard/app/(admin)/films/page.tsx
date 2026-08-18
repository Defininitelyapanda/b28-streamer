"use client";

import { useEffect, useState } from "react";
import {
  listCatalogVideos,
  updateCatalogVideo,
  unpublishCatalogVideo,
  upsertCatalogVideo,
  requestUploadUrl,
  syncYoutubeCatalog,
  CatalogVideo,
} from "@/lib/api-client";

const emptyForm: {
  slug: string;
  title: string;
  thumbnail: string;
  date: string;
  genre: string;
  description: string;
  rating: string;
  sourceType: string;
  videoId: string;
  type: string;
  seriesGroup: string;
  accessTier: "FREE" | "PREMIUM";
  playbackFormat: "YOUTUBE" | "MP4" | "HLS";
  storageKey: string;
} = {
  slug: "",
  title: "",
  thumbnail: "",
  date: new Date().toISOString().slice(0, 10),
  genre: "Drama",
  description: "",
  rating: "8.0",
  sourceType: "youtube",
  videoId: "",
  type: "film",
  seriesGroup: "",
  accessTier: "FREE",
  playbackFormat: "YOUTUBE",
  storageKey: "",
};

export default function FilmsPage() {
  const [videos, setVideos] = useState<CatalogVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<CatalogVideo | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    listCatalogVideos()
      .then(setVideos)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load catalog"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const togglePublished = async (video: CatalogVideo) => {
    try {
      if (video.published !== false) {
        await unpublishCatalogVideo(video.id);
        setMsg(`Unpublished "${video.title}"`);
      } else {
        await updateCatalogVideo(video.id, { published: true });
        setMsg(`Published "${video.title}"`);
      }
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await updateCatalogVideo(editing.id, {
        title: editing.title,
        genre: editing.genre,
        description: editing.desc,
        rating: editing.rating,
        type: editing.type,
        seriesGroup: editing.seriesGroup,
        accessTier: editing.accessTier,
        playbackFormat: editing.playbackFormat,
        storageKey: editing.storageKey ?? undefined,
        videoId: editing.videoId,
      });
      setMsg(`Saved "${editing.title}"`);
      setEditing(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleCreate = async () => {
    if (!form.slug || !form.title) {
      alert("Slug and title are required");
      return;
    }
    setBusy(true);
    try {
      let storageKey = form.storageKey || undefined;
      if (uploadFile && form.playbackFormat !== "YOUTUBE") {
        const presign = await requestUploadUrl(form.slug, uploadFile.type || "video/mp4");
        await fetch(presign.url, {
          method: "PUT",
          headers: { "Content-Type": uploadFile.type || "video/mp4" },
          body: uploadFile,
        });
        storageKey = presign.key;
      }

      await upsertCatalogVideo({
        slug: form.slug,
        title: form.title,
        thumbnail: form.thumbnail || `https://i.ytimg.com/vi/${form.videoId || form.slug}/hqdefault.jpg`,
        date: form.date,
        genre: form.genre,
        description: form.description,
        rating: form.rating,
        sourceType: form.playbackFormat === "YOUTUBE" ? "youtube" : "r2",
        videoId: form.videoId || form.slug,
        type: form.type,
        seriesGroup: form.seriesGroup || form.title,
        accessTier: form.accessTier,
        playbackFormat: form.playbackFormat,
        storageKey,
        published: true,
      });
      setMsg(`Created "${form.title}"`);
      setCreating(false);
      setForm(emptyForm);
      setUploadFile(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const handleYoutubeSync = async () => {
    setBusy(true);
    try {
      const result = await syncYoutubeCatalog();
      setMsg(`Synced ${result.count} videos from YouTube`);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "YouTube sync failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-gray-400">Loading catalog...</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-white">Films & Catalog</h1>
          <p className="text-sm text-gray-400">{videos.length} videos in Postgres catalog</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-black hover:opacity-90"
          >
            Create film
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleYoutubeSync}
            className="rounded border border-surface-border px-4 py-2 text-sm text-gray-300 hover:text-white"
          >
            Sync YouTube
          </button>
        </div>
      </div>

      {msg && <p className="mb-4 text-sm text-green-400">{msg}</p>}

      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-card text-gray-400">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Genre</th>
              <th className="px-4 py-3">Format</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v.id} className="border-t border-surface-border">
                <td className="max-w-xs truncate px-4 py-3 text-gray-200">{v.title}</td>
                <td className="px-4 py-3 text-gray-400">{v.genre}</td>
                <td className="px-4 py-3 text-gray-400">{v.playbackFormat ?? "YOUTUBE"}</td>
                <td className="px-4 py-3 text-gray-400">{v.accessTier ?? "FREE"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      v.published !== false
                        ? "bg-green-900/40 text-green-300"
                        : "bg-red-900/40 text-red-300"
                    }`}
                  >
                    {v.published !== false ? "Published" : "Hidden"}
                  </span>
                </td>
                <td className="space-x-3 px-4 py-3">
                  <button type="button" onClick={() => setEditing(v)} className="text-xs text-accent hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => togglePublished(v)} className="text-xs text-gray-400 hover:underline">
                    {v.published !== false ? "Hide" : "Publish"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-surface-border bg-surface-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Create film</h2>
            <div className="space-y-3">
              {(["slug", "title", "videoId", "genre", "description"] as const).map((field) => (
                <label key={field} className="block text-sm capitalize">
                  <span className="text-gray-400">{field}</span>
                  {field === "description" ? (
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
                    />
                  ) : (
                    <input
                      value={form[field]}
                      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
                    />
                  )}
                </label>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-gray-400">Access tier</span>
                  <select
                    value={form.accessTier}
                    onChange={(e) => setForm({ ...form, accessTier: e.target.value as "FREE" | "PREMIUM" })}
                    className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
                  >
                    <option value="FREE">FREE</option>
                    <option value="PREMIUM">PREMIUM</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-gray-400">Playback</span>
                  <select
                    value={form.playbackFormat}
                    onChange={(e) =>
                      setForm({ ...form, playbackFormat: e.target.value as "YOUTUBE" | "MP4" | "HLS" })
                    }
                    className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
                  >
                    <option value="YOUTUBE">YouTube</option>
                    <option value="MP4">MP4 (R2)</option>
                    <option value="HLS">HLS (R2)</option>
                  </select>
                </label>
              </div>
              {form.playbackFormat !== "YOUTUBE" && (
                <label className="block text-sm">
                  <span className="text-gray-400">Upload MP4</span>
                  <input
                    type="file"
                    accept="video/mp4,video/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    className="mt-1 w-full text-gray-300"
                  />
                </label>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setCreating(false)} className="rounded px-4 py-2 text-sm text-gray-400">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleCreate}
                className="rounded bg-accent px-4 py-2 text-sm font-medium text-black"
              >
                {busy ? "Saving…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-surface-border bg-surface-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Edit video</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-gray-400">Title</span>
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-400">Genre</span>
                <input
                  value={editing.genre}
                  onChange={(e) => setEditing({ ...editing, genre: e.target.value })}
                  className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-400">Description</span>
                <textarea
                  value={editing.desc}
                  onChange={(e) => setEditing({ ...editing, desc: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-gray-400">Access tier</span>
                  <select
                    value={editing.accessTier ?? "FREE"}
                    onChange={(e) =>
                      setEditing({ ...editing, accessTier: e.target.value as "FREE" | "PREMIUM" })
                    }
                    className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
                  >
                    <option value="FREE">FREE</option>
                    <option value="PREMIUM">PREMIUM</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-gray-400">Playback</span>
                  <select
                    value={editing.playbackFormat ?? "YOUTUBE"}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        playbackFormat: e.target.value as "YOUTUBE" | "MP4" | "HLS",
                      })
                    }
                    className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
                  >
                    <option value="YOUTUBE">YouTube</option>
                    <option value="MP4">MP4</option>
                    <option value="HLS">HLS</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(null)} className="rounded px-4 py-2 text-sm text-gray-400">
                Cancel
              </button>
              <button type="button" onClick={saveEdit} className="rounded bg-accent px-4 py-2 text-sm font-medium text-black">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
