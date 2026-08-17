"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CatalogVideo } from "@/lib/types";
import YouTubePlayer from "@/components/player/YouTubePlayer";
import RelatedList from "@/components/player/RelatedList";
import WatchlistButton from "@/components/cards/WatchlistButton";
import { addToHistory, getProgressMap, saveProgress } from "@/lib/watchHistory";

interface WatchClientProps {
  video: CatalogVideo;
  allVideos: CatalogVideo[];
}

export default function WatchClient({ video, allVideos }: WatchClientProps) {
  const [startSeconds, setStartSeconds] = useState(0);

  useEffect(() => {
    addToHistory(video.videoId);
    setStartSeconds(getProgressMap()[video.videoId]?.progressSeconds ?? 0);
  }, [video.videoId]);

  const handleProgress = useCallback(
    (seconds: number) => {
      saveProgress(video.videoId, seconds);
    },
    [video.videoId]
  );

  return (
    <div className="px-[2.2%] py-6 max-md:px-3">
      <Link href="/" className="mb-4 inline-block text-sm text-muted transition hover:text-white">
        ← Back to Home
      </Link>

      <div className="grid gap-0 overflow-hidden rounded-[22px] border border-white/10 bg-panel lg:grid-cols-[1fr_300px]">
        <div>
          <div className="relative aspect-video w-full bg-black">
            <YouTubePlayer
              videoId={video.videoId}
              startSeconds={startSeconds}
              onProgress={handleProgress}
            />
          </div>
          <div className="p-5">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-xl font-bold leading-snug md:text-2xl">{video.title}</h1>
              <WatchlistButton videoId={video.videoId} />
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

        <aside className="flex min-h-[300px] flex-col border-white/10 bg-white/[0.01] p-4 lg:border-l max-lg:border-t max-lg:max-h-[250px]">
          <h3 className="mb-3 shrink-0 text-[0.76rem] font-bold uppercase tracking-wider text-muted">
            More from B28
          </h3>
          <RelatedList videos={allVideos} currentVideoId={video.videoId} />
        </aside>
      </div>
    </div>
  );
}
