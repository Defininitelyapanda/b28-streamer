import {
  requestUploadUrl,
  type CatalogAssetKind,
} from "@/lib/api-client";

export type { CatalogAssetKind };

export type UploadStatus = "idle" | "uploading" | "done" | "error";

export interface UploadedAsset {
  key: string;
  publicUrl?: string;
  fileName: string;
  previewUrl?: string;
}

const EXT_TO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  webm: "video/webm",
  avi: "video/x-msvideo",
  m3u8: "application/vnd.apple.mpegurl",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function extensionFromFileName(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext ?? null;
}

export function resolveContentType(assetKind: CatalogAssetKind, file: File): string {
  if (file.type) return file.type;
  const ext = extensionFromFileName(file.name);
  if (ext && EXT_TO_MIME[ext]) return EXT_TO_MIME[ext];
  if (assetKind === "thumbnail" || assetKind === "poster") return "image/jpeg";
  return "video/mp4";
}

export async function uploadCatalogAsset(
  slug: string,
  file: File,
  assetKind: CatalogAssetKind,
  previewUrl?: string,
): Promise<UploadedAsset> {
  const contentType = resolveContentType(assetKind, file);
  const presign = await requestUploadUrl(slug, contentType, assetKind, file.name);
  const putRes = await fetch(presign.url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(
      `R2 upload failed (${putRes.status}). Check bucket CORS allows this dashboard origin.`,
    );
  }
  return {
    key: presign.key,
    publicUrl: presign.publicUrl,
    fileName: file.name,
    previewUrl: presign.publicUrl ?? previewUrl,
  };
}

export function trailerSlugForBase(slug: string): string {
  return `${slug}-trailer`;
}

export function acceptForAssetKind(assetKind: CatalogAssetKind): string {
  if (assetKind === "thumbnail" || assetKind === "poster") {
    return "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
  }
  return "video/mp4,video/quicktime,video/x-matroska,video/webm,video/x-msvideo,.mp4,.mov,.mkv,.webm,.avi,.m3u8";
}

export const ASSET_LABELS: Record<
  CatalogAssetKind,
  { title: string; required: boolean; help: string }
> = {
  thumbnail: {
    title: "Thumbnail",
    required: true,
    help: "Browse and search cards (~16:9, at least 640px wide).",
  },
  poster: {
    title: "Poster",
    required: false,
    help: "Watch page hero image. Falls back to thumbnail if omitted.",
  },
  film: {
    title: "Full film",
    required: true,
    help: "Subscriber-only video — MP4, MOV, MKV, WebM, or AVI.",
  },
  trailer: {
    title: "Trailer",
    required: false,
    help: "Public preview — MP4, MOV, MKV, etc. Creates a row at {slug}-trailer.",
  },
};
