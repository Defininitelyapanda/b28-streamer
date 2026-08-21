"use client";

import { useEffect, useRef, useState } from "react";
import { captureVideoPosterFrame, isImagePreviewUrl } from "@/lib/media-preview";
import {
  ASSET_LABELS,
  acceptForAssetKind,
  type CatalogAssetKind,
  type UploadedAsset,
  type UploadStatus,
  uploadCatalogAsset,
} from "@/lib/upload-assets";

interface AssetUploadCardProps {
  slug: string;
  assetKind: CatalogAssetKind;
  disabled?: boolean;
  onUploaded: (asset: UploadedAsset) => void;
  onClear?: () => void;
  initialPreviewUrl?: string | null;
}

function isVideoKind(kind: CatalogAssetKind): boolean {
  return kind === "film" || kind === "trailer";
}

export default function AssetUploadCard({
  slug,
  assetKind,
  disabled,
  onUploaded,
  onClear,
  initialPreviewUrl,
}: AssetUploadCardProps) {
  const meta = ASSET_LABELS[assetKind];
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const blobPreviewRef = useRef<string | null>(null);

  function revokeBlobPreview() {
    if (blobPreviewRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(blobPreviewRef.current);
    }
    blobPreviewRef.current = null;
  }

  function setPreview(next: string | null, trackBlob = false) {
    revokeBlobPreview();
    if (trackBlob && next?.startsWith("blob:")) {
      blobPreviewRef.current = next;
    }
    setPreviewUrl(next);
  }

  useEffect(() => {
    revokeBlobPreview();
    setPreview(initialPreviewUrl ?? null);
    setFileName(null);
    setStatus("idle");
    setError("");
  }, [slug, assetKind, initialPreviewUrl]);

  useEffect(() => () => revokeBlobPreview(), []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !slug.trim()) return;

    setStatus("uploading");
    setError("");
    setFileName(file.name);

    let localPreview: string | undefined;

    try {
      if (assetKind === "thumbnail" || assetKind === "poster") {
        setPreview(URL.createObjectURL(file), true);
      } else if (isVideoKind(assetKind)) {
        const frameUrl = await captureVideoPosterFrame(file);
        setPreview(frameUrl, true);
        localPreview = frameUrl;
      }

      const uploaded = await uploadCatalogAsset(slug.trim(), file, assetKind, localPreview);
      if (uploaded.previewUrl && (assetKind === "thumbnail" || assetKind === "poster")) {
        setPreview(uploaded.previewUrl);
      }
      setStatus("done");
      onUploaded(uploaded);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreview(initialPreviewUrl ?? null);
      setFileName(null);
      onClear?.();
    }
  }

  const showPreview = isImagePreviewUrl(previewUrl);

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-white">
            {meta.title}
            {meta.required ? (
              <span className="ml-1 text-xs text-accent">Required</span>
            ) : (
              <span className="ml-1 text-xs text-gray-500">Optional</span>
            )}
          </h3>
          <p className="mt-1 text-xs text-gray-400">{meta.help}</p>
        </div>
        {status === "done" && <span className="text-xs text-green-400">Uploaded</span>}
        {status === "uploading" && <span className="text-xs text-gray-400">Uploading…</span>}
      </div>

      {showPreview && previewUrl && (
        <div className="mb-3 overflow-hidden rounded-lg border border-surface-border bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={`${meta.title} preview`}
            className="aspect-video w-full object-cover"
          />
          {isVideoKind(assetKind) && (
            <p className="bg-black/60 px-2 py-1 text-center text-[0.65rem] text-gray-400">
              First-frame preview
            </p>
          )}
        </div>
      )}

      {!showPreview && fileName && status === "uploading" && (
        <p className="mb-2 text-xs text-gray-400">Processing {fileName}…</p>
      )}

      <input
        type="file"
        accept={acceptForAssetKind(assetKind)}
        disabled={disabled || status === "uploading" || !slug.trim()}
        onChange={handleFileChange}
        className="w-full text-sm text-gray-300 file:mr-3 file:rounded file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-black"
      />

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
