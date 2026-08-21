"use client";

import { useState } from "react";
import AssetUploadCard from "@/components/AssetUploadCard";
import {
  upsertCatalogVideo,
  updateCatalogVideo,
  type CatalogVideo,
} from "@/lib/api-client";
import {
  trailerSlugForBase,
  type CatalogAssetKind,
  type UploadedAsset,
} from "@/lib/upload-assets";

interface EditAssetsPanelProps {
  video: CatalogVideo;
  trailer: CatalogVideo | null;
  onUpdated: () => void;
}

export default function EditAssetsPanel({ video, trailer, onUpdated }: EditAssetsPanelProps) {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function applyAssetUpdate(
    kind: CatalogAssetKind,
    asset: UploadedAsset,
    target: "film" | "trailer",
  ) {
    setError("");
    setMsg("");
    try {
      if (target === "film") {
        if (kind === "thumbnail") {
          await updateCatalogVideo(video.id, {
            thumbnail: asset.publicUrl ?? video.thumbnail,
          });
        } else if (kind === "poster") {
          await updateCatalogVideo(video.id, {
            posterUrl: asset.publicUrl ?? video.posterUrl ?? undefined,
          });
        } else if (kind === "film") {
          await updateCatalogVideo(video.id, { storageKey: asset.key });
        }
      } else if (kind === "trailer") {
        const trailerSlug = trailerSlugForBase(video.id);
        await upsertCatalogVideo({
          slug: trailerSlug,
          title: `${video.title} (Trailer)`,
          thumbnail: video.thumbnail,
          date: video.date,
          genre: video.genre,
          description: video.desc,
          rating: video.rating,
          sourceType: "r2",
          videoId: trailerSlug,
          type: "trailer",
          seriesGroup: video.seriesGroup || video.title,
          accessTier: video.accessTier ?? "FREE",
          playbackFormat: video.playbackFormat ?? "MP4",
          storageKey: asset.key,
          posterUrl: video.posterUrl ?? video.thumbnail,
          published: video.published !== false,
        });
      }
      setMsg(`Updated ${kind} for ${target === "trailer" ? "trailer" : video.title}.`);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  const isFilmRow = video.type !== "trailer";

  return (
    <div className="mt-4 border-t border-surface-border pt-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Replace assets</h3>
      {msg && <p className="mb-2 text-xs text-green-400">{msg}</p>}
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      {isFilmRow ? (
        <div className="grid gap-3">
          <AssetUploadCard
            slug={video.id}
            assetKind="thumbnail"
            initialPreviewUrl={video.thumbnail}
            onUploaded={(asset) => applyAssetUpdate("thumbnail", asset, "film")}
          />
          <AssetUploadCard
            slug={video.id}
            assetKind="poster"
            initialPreviewUrl={video.posterUrl ?? video.thumbnail}
            onUploaded={(asset) => applyAssetUpdate("poster", asset, "film")}
          />
          <AssetUploadCard
            slug={video.id}
            assetKind="film"
            initialPreviewUrl={video.thumbnail || null}
            onUploaded={(asset) => applyAssetUpdate("film", asset, "film")}
          />
          <div>
            <p className="mb-2 text-xs text-gray-400">
              Trailer row:{" "}
              {trailer ? (
                <span className="text-gray-200">{trailer.id}</span>
              ) : (
                <span className="text-amber-300">None — upload below to create</span>
              )}
            </p>
            <AssetUploadCard
              slug={video.id}
              assetKind="trailer"
              initialPreviewUrl={trailer?.thumbnail ?? video.thumbnail}
              onUploaded={(asset) => applyAssetUpdate("trailer", asset, "trailer")}
            />
          </div>
        </div>
      ) : (
        <AssetUploadCard
          slug={video.id.replace(/-trailer$/, "") || video.id}
          assetKind="trailer"
          initialPreviewUrl={video.thumbnail || null}
          onUploaded={(asset) =>
            updateCatalogVideo(video.id, { storageKey: asset.key }).then(onUpdated)
          }
        />
      )}
    </div>
  );
}
