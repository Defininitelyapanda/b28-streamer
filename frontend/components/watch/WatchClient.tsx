"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { CatalogVideo, PlaybackInfo } from "@/lib/types";
import YouTubePlayer from "@/components/player/YouTubePlayer";
import VideoPlayer from "@/components/player/VideoPlayer";
import RelatedList from "@/components/player/RelatedList";
import WatchlistButton from "@/components/cards/WatchlistButton";
import { addToHistory, getProgressMap, saveProgress } from "@/lib/watchHistory";
import { useAuth } from "@/lib/auth-context";
import { canWatchVideo, isFreeYoutubeVideo } from "@/lib/streaming-access";
import { getPlaybackInfo } from "@/lib/api-client";

interface WatchClientProps {
  video: CatalogVideo;
  allVideos: CatalogVideo[];
  canWatch: boolean;
  initialPlayback: PlaybackInfo | null;
}

export default function WatchClient({
  video,
  allVideos,
  canWatch: canWatchFromServer,
  initialPlayback,
}: WatchClientProps) {
  const { user, subscription, loading: authLoading } = useAuth();
  const { data: session, status: sessionStatus } = useSession();
  const roles = user?.roles ?? [];
  const accessToken = session?.accessToken;
  const isFreeYoutube = isFreeYoutubeVideo(video);

  const [startSeconds, setStartSeconds] = useState(0);
  const [playbackError, setPlaybackError] = useState("");
  const [playback, setPlayback] = useState<PlaybackInfo | null>(initialPlayback);
  const [loadingPlayback, setLoadingPlayback] = useState(
    canWatchFromServer && !initialPlayback,
  );

  const slug = video.id;
  const watchPath = `/watch/${encodeURIComponent(slug)}`;
  const posterUrl = video.posterUrl ?? video.thumbnail;

  const canWatchNow =
    canWatchFromServer || canWatchVideo(video, subscription, roles);
  const needsUpsell = !canWatchNow && !authLoading && sessionStatus !== "loading";
  const needsSignIn =
    canWatchNow &&
    !isFreeYoutube &&
    !authLoading &&
    sessionStatus === "unauthenticated";
  const showPlayer = canWatchNow && !loadingPlayback && !playbackError && playback !== null;

  useEffect(() => {
    if (initialPlayback) {
      setPlayback(initialPlayback);
      setLoadingPlayback(false);
      return;
    }

    if (!canWatchNow) {
      setLoadingPlayback(false);
      return;
    }

    if (!isFreeYoutube && (sessionStatus === "loading" || authLoading)) {
      return;
    }

    if (!isFreeYoutube && !accessToken) {
      setPlayback(null);
      setPlaybackError("signin");
      setLoadingPlayback(false);
      return;
    }

    setLoadingPlayback(true);
    setPlaybackError("");

    getPlaybackInfo(slug, isFreeYoutube ? null : accessToken)
      .then(setPlayback)
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Playback unavailable";
        if (
          message.toLowerCase().includes("premium") ||
          message.toLowerCase().includes("subscription")
        ) {
          setPlaybackError("subscription");
        } else if (message.toLowerCase().includes("authentication")) {
          setPlaybackError("signin");
        } else {
          setPlaybackError(message);
        }
      })
      .finally(() => setLoadingPlayback(false));
  }, [
    slug,
    canWatchNow,
    initialPlayback,
    accessToken,
    sessionStatus,
    authLoading,
    isFreeYoutube,
  ]);

  useEffect(() => {
    addToHistory(slug);
    setStartSeconds(getProgressMap()[slug]?.progressSeconds ?? 0);
  }, [slug]);

  const handleProgress = useCallback(
    (seconds: number) => {
      saveProgress(slug, seconds);
    },
    [slug],
  );

  let overlay: React.ReactNode = null;

  if (needsUpsell || playbackError === "subscription") {
    overlay = (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
        <p className="mb-2 text-lg font-bold text-white">Subscribe to watch</p>
        <p className="mb-4 max-w-md text-sm text-muted">
          A B28 subscription is required to stream this title.
        </p>
        <Link href={`/offers?redirect=${encodeURIComponent(watchPath)}`} className="btn btn-primary text-sm">
          View plans
        </Link>
      </div>
    );
  } else if (needsSignIn || playbackError === "signin") {
    overlay = (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
        <p className="mb-2 text-lg font-bold text-white">Sign in to watch</p>
        <p className="mb-4 max-w-md text-sm text-muted">
          Log in to your B28 account to start playback.
        </p>
        <Link
          href={`/login?redirect=${encodeURIComponent(watchPath)}`}
          className="btn btn-primary text-sm"
        >
          Sign in
        </Link>
      </div>
    );
  } else if (loadingPlayback) {
    overlay = (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-sm text-white">
        Loading player…
      </div>
    );
  } else if (playbackError) {
    overlay = (
      <div className="absolute inset-0 z-20 flex items-center justify-center p-6 text-center text-sm text-red-300">
        {playbackError}
      </div>
    );
  }

  return (
    <div className="px-[2.2%] py-6 max-md:px-3">
      <Link href="/browse" className="mb-4 inline-block text-sm text-muted transition hover:text-white">
        ← Back to Browse
      </Link>

      <div className="glass-panel grid gap-0 overflow-hidden rounded-2xl lg:grid-cols-[1fr_280px]">
        <div>
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
            {overlay}
            {showPlayer && playback?.playbackFormat === "YOUTUBE" && playback.videoId && (
              <YouTubePlayer
                key={`${slug}-${playback.videoId}`}
                videoId={playback.videoId}
                startSeconds={startSeconds}
                onProgress={handleProgress}
              />
            )}
            {showPlayer && playback?.url && (
              <VideoPlayer
                key={`${slug}-video`}
                src={playback.url}
                startSeconds={startSeconds}
                onProgress={handleProgress}
                poster={posterUrl}
              />
            )}
            {showPlayer &&
              playback &&
              playback.playbackFormat !== "YOUTUBE" &&
              !playback.url && (
                <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted">
                  Playback format not supported
                </div>
              )}
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
