"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CatalogVideo } from "@/lib/types";
import YouTubePlayer from "@/components/player/YouTubePlayer";
import RelatedList from "@/components/player/RelatedList";
import WatchlistButton from "@/components/cards/WatchlistButton";
import { addToHistory, getProgressMap, saveProgress } from "@/lib/watchHistory";
import { useShowAds } from "@/lib/auth-context";

interface WatchClientProps {
  video: CatalogVideo;
  allVideos: CatalogVideo[];
}

export default function WatchClient({ video, allVideos }: WatchClientProps) {
  const showAds = useShowAds();
  const [startSeconds, setStartSeconds] = useState(0);
  const [adDismissed, setAdDismissed] = useState(false);

  useEffect(() => {
    addToHistory(video.videoId);
    setStartSeconds(getProgressMap()[video.videoId]?.progressSeconds ?? 0);
  }, [video.videoId]);

  const handleProgress = useCallback(
    (seconds: number) => {
      saveProgress(video.videoId, seconds);
    },
    [video.videoId],
  );

  const showAdOverlay = showAds && !adDismissed;

  return (
    <div className="px-[2.2%] py-6 max-md:px-3">
      <Link href="/" className="mb-4 inline-block text-sm text-muted transition hover:text-white">
        ← Back to Home
      </Link>

      <div className="glass-panel grid gap-0 overflow-hidden rounded-2xl lg:grid-cols-[1fr_280px]">
        <div>
          <div className="relative aspect-video w-full bg-black">
            {showAdOverlay && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 p-6 text-center backdrop-blur-sm">
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-accent">Advertisement</p>
                <p className="mb-4 max-w-md text-sm text-muted">
                  You&apos;re on the free plan. Upgrade for ad-free streaming or continue watching with ads.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/offers" className="btn btn-primary text-sm">
                    Go ad-free
                  </Link>
                  <button
                    type="button"
                    onClick={() => setAdDismissed(true)}
                    className="btn btn-secondary text-sm"
                  >
                    Continue with ads
                  </button>
                </div>
              </div>
            )}
            {!showAdOverlay && (
              <YouTubePlayer
                videoId={video.videoId}
                startSeconds={startSeconds}
                onProgress={handleProgress}
              />
            )}
          </div>
          <div className="p-5">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-xl font-bold leading-snug md:text-2xl">{video.title}</h1>
              <WatchlistButton videoId={video.videoId} compact />
            </div>
            <div className="mb-3 flex flex-wrap gap-2 text-sm text-muted">
              <span>{video.date}</span>
              <span>•</span>
              <span>{video.genre}</span>
              <span>•</span>
              <span className="capitalize">{video.type}</span>
              <span>•</span>
              <span className="text-[#ffd166]">★ {video.rating}</span>
            </div>
            <p className="text-sm leading-relaxed text-muted">{video.desc}</p>
          </div>
        </div>

        <aside className="flex min-h-[280px] flex-col border-white/10 p-4 lg:border-l max-lg:border-t max-lg:max-h-[220px]">
          <h3 className="mb-3 shrink-0 text-[0.7rem] font-bold uppercase tracking-wider text-muted">
            More from B28
          </h3>
          <RelatedList videos={allVideos} currentVideoId={video.videoId} />
        </aside>
      </div>
    </div>
  );
}
