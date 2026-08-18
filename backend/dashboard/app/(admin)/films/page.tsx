"use client";

import { useEffect, useState } from "react";
import {
  listCatalogVideos,
  updateCatalogVideo,
  unpublishCatalogVideo,
  CatalogVideo,
} from "@/lib/api-client";

export default function FilmsPage() {
  const [videos, setVideos] = useState<CatalogVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<CatalogVideo | null>(null);

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
      });
      setMsg(`Saved "${editing.title}" — refresh the streaming site to see changes`);
      setEditing(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    }
  };

  if (loading) return <p className="text-gray-400">Loading catalog...</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">Films & Catalog</h1>
      <p className="mb-6 text-sm text-gray-400">
        {videos.length} videos — edits here appear on the streaming frontend within ~30 seconds
      </p>
      {msg && <p className="mb-4 text-sm text-green-400">{msg}</p>}

      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-card text-gray-400">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Genre</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v.id} className="border-t border-surface-border">
                <td className="max-w-xs truncate px-4 py-3 text-gray-200">{v.title}</td>
                <td className="px-4 py-3 text-gray-400">{v.genre}</td>
                <td className="px-4 py-3 text-gray-400">{v.type}</td>
                <td className="px-4 py-3 text-gray-400">{v.rating}</td>
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
                  <button
                    type="button"
                    onClick={() => setEditing(v)}
                    className="text-xs text-accent hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePublished(v)}
                    className="text-xs text-gray-400 hover:underline"
                  >
                    {v.published !== false ? "Hide" : "Publish"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                  <span className="text-gray-400">Rating</span>
                  <input
                    value={editing.rating}
                    onChange={(e) => setEditing({ ...editing, rating: e.target.value })}
                    className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-400">Type</span>
                  <select
                    value={editing.type}
                    onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                    className="mt-1 w-full rounded border border-surface-border bg-surface px-3 py-2 text-white"
                  >
                    <option value="film">film</option>
                    <option value="trailer">trailer</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="rounded bg-accent px-4 py-2 text-sm font-medium text-black hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
