"use client";

import Link from "next/link";
import type { CatalogVideo } from "@/lib/types";
import WatchlistButton from "@/components/cards/WatchlistButton";

interface VideoCardProps {
  video: CatalogVideo;
  showProgress?: number;
  showRemove?: boolean;
  onRemove?: () => void;
}

export default function VideoCard({ video, showProgress, showRemove, onRemove }: VideoCardProps) {
  const progressPct =
    showProgress && showProgress > 0 ? Math.min(100, (showProgress / 3600) * 100) : 0;

  return (
    <div className="movie-card group relative">
      {showRemove && onRemove && (
        <button
          type="button"
          aria-label="Remove from continue watching"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white opacity-0 transition hover:bg-accent group-hover:opacity-100"
        >
          ×
        </button>
      )}
      <div
        className="absolute left-2 top-2 z-10 opacity-0 transition group-hover:opacity-100"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <WatchlistButton videoId={video.videoId} compact />
      </div>
      <Link href={`/watch/${video.videoId}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden bg-[#0b0d12]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={video.thumbnail}
            alt={video.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://via.placeholder.com/220x330/1a1a2e/888?text=No+Image";
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/90 shadow-accent">
              <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          {progressPct > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div className="h-full bg-accent" style={{ width: `${progressPct}%` }} />
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[0.62rem] font-bold uppercase tracking-wider text-muted">
            <span>{video.genre}</span>
            <span className="text-[#ffd166]">★ {video.rating}</span>
          </div>
          <h3 className="line-clamp-2 min-h-[2.4em] text-[0.85rem] leading-snug">{video.title}</h3>
        </div>
      </Link>
    </div>
  );
}
