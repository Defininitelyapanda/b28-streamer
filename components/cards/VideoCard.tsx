"use client";

import Link from "next/link";
import type { CatalogVideo } from "@/lib/types";

interface VideoCardProps {
  video: CatalogVideo;
  showProgress?: number;
}

export default function VideoCard({ video, showProgress }: VideoCardProps) {
  const progressPct =
    showProgress && showProgress > 0 ? Math.min(100, (showProgress / 3600) * 100) : 0;

  return (
    <Link href={`/watch/${video.videoId}`} className="movie-card group block">
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
          <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-accent shadow-accent">
            <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
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
      <div className="p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2 text-[0.69rem] font-bold uppercase tracking-wider text-muted">
          <span>{video.genre}</span>
          <span className="text-[#ffd166]">★ {video.rating}</span>
        </div>
        <h3 className="line-clamp-2 min-h-[2.55em] text-[0.92rem] leading-snug">{video.title}</h3>
        <div className="mt-3 flex items-center justify-between text-xs text-muted">
          <span>{video.date.slice(0, 4)}</span>
          <span className="capitalize">{video.type}</span>
        </div>
      </div>
    </Link>
  );
}
