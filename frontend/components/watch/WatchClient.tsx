"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CatalogVideo } from "@/lib/types";
import YouTubePlayer from "@/components/player/YouTubePlayer";
import VideoPlayer from "@/components/player/VideoPlayer";
import RelatedList from "@/components/player/RelatedList";
import WatchlistButton from "@/components/cards/WatchlistButton";
import { addToHistory, getProgressMap, saveProgress } from "@/lib/watchHistory";
import { useShowAds, useIsPremium } from "@/lib/auth-context";
import { getPlaybackInfo } from "@/lib/api-client";

interface WatchClientProps {
  video: CatalogVideo;
  allVideos: CatalogVideo[];
}

export default function WatchClient({ video, allVideos }: WatchClientProps) {
  const showAds = useShowAds();
  const isPremium = useIsPremium();
  const [startSeconds, setStartSeconds] = useState(0);
  const [adDismissed, setAdDismissed] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [playback, setPlayback] = useState<Awaited<ReturnType<typeof getPlaybackInfo>> | null>(null);
  const [loadingPlayback, setLoadingPlayback] = useState(true);

  const slug = video.id;
  const isPremiumTitle = video.accessTier === "PREMIUM";
  const needsUpsell = isPremiumTitle && !isPremium;

  useEffect(() => {
    addToHistory(slug);
    setStartSeconds(getProgressMap()[slug]?.progressSeconds ?? 0);
  }, [slug]);

  useEffect(() => {
    if (needsUpsell) {
      setLoadingPlayback(false);
      return;
    }

    setLoadingPlayback(true);
    setPlaybackError("");
    getPlaybackInfo(slug)
      .then(setPlayback)
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Playback unavailable";
        if (message.toLowerCase().includes("premium")) {
          setPlaybackError("premium");
        } else {
          setPlaybackError(message);
        }
      })
      .finally(() => setLoadingPlayback(false));
  }, [slug, needsUpsell]);

  const handleProgress = useCallback(
    (seconds: number) => {
      saveProgress(slug, seconds);
    },
    [slug],
  );

  const showAdOverlay = showAds && !adDismissed && !needsUpsell;

  function renderPlayer() {
    if (needsUpsell || playbackError === "premium") {
      return (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
          <p className="mb-2 text-lg font-bold text-white">Premium title</p>
          <p className="mb-4 max-w-md text-sm text-muted">
            Upgrade to B28 Premium to watch this title ad-free.
          </p>
          <Link href={`/offers?redirect=/watch/${encodeURIComponent(slug)}`} className="btn btn-primary text-sm">
            View plans
          </Link>
        </div>
      );
    }

    if (loadingPlayback) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-muted">
          Loading player…
        </div>
      );
    }

    if (playbackError) {
      return (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-red-300">
          {playbackError}
        </div>
      );
    }

    if (!playback) return null;

    if (playback.playbackFormat === "YOUTUBE" && playback.videoId) {
      return (
        <YouTubePlayer
          videoId={playback.videoId}
          startSeconds={startSeconds}
          onProgress={handleProgress}
        />
      );
    }

    if (playback.url) {
      return (
        <VideoPlayer
          src={playback.url}
          startSeconds={startSeconds}
          onProgress={handleProgress}
          poster={video.posterUrl ?? video.thumbnail}
        />
      );
    }

    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Playback format not supported
      </div>
    );
  }

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
            {!showAdOverlay && renderPlayer()}
          </div>
          <div className="p-5">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-xl font-bold leading-snug md:text-2xl">{video.title}</h1>
              <WatchlistButton videoId={slug} compact />
            </div>
            <div className="mb-3 flex flex-wrap gap-2 text-sm text-muted">
              <span>{video.date}</span>
              <span>•</span>
              <span>{video.genre}</span>
              <span>•</span>
              <span className="capitalize">{video.type}</span>
              {isPremiumTitle && (
                <>
                  <span>•</span>
                  <span className="text-accent">Premium</span>
                </>
              )}
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
          <RelatedList videos={allVideos} currentVideoId={slug} />
        </aside>
      </div>
    </div>
  );
}
