"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: {
      Player: new (
        element: HTMLElement | string,
        config: {
          height: string;
          width: string;
          videoId: string;
          playerVars: Record<string, number | string>;
          events: {
            onReady?: () => void;
            onError?: () => void;
          };
        },
      ) => {
        destroy: () => void;
        getCurrentTime: () => number;
        seekTo: (seconds: number, allowSeekAhead: boolean) => void;
      };
    };
  }
}

interface YouTubePlayerProps {
  videoId: string;
  autoplay?: boolean;
  startSeconds?: number;
  onProgress?: (seconds: number) => void;
}

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();

  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve, reject) => {
    if (document.getElementById("youtube-iframe-api")) {
      const check = () => {
        if (window.YT?.Player) resolve();
        else setTimeout(check, 100);
      };
      check();
      return;
    }

    const tag = document.createElement("script");
    tag.id = "youtube-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => reject(new Error("Failed to load YouTube API"));

    window.onYouTubeIframeAPIReady = () => resolve();
    document.head.appendChild(tag);

    setTimeout(() => {
      if (!window.YT?.Player) reject(new Error("YouTube API load timeout"));
    }, 15000);
  });

  return apiLoadPromise;
}

export default function YouTubePlayer({
  videoId,
  autoplay = true,
  startSeconds = 0,
  onProgress,
}: YouTubePlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{
    destroy: () => void;
    getCurrentTime: () => number;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  } | null>(null);
  const onProgressRef = useRef(onProgress);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    setUseFallback(false);
  }, [videoId]);

  function clearPlayer() {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch {
        // YouTube API may already have removed the iframe
      }
      playerRef.current = null;
    }

    if (mountRef.current) {
      mountRef.current.innerHTML = "";
    }
  }

  useEffect(() => {
    if (useFallback) return undefined;

    let cancelled = false;
    const mountNode = mountRef.current;

    async function init() {
      if (!mountNode) return;

      try {
        await loadYouTubeApi();
        if (cancelled || !mountRef.current || !window.YT?.Player) return;

        mountRef.current.innerHTML = "";

        const player = new window.YT.Player(mountRef.current, {
          height: "100%",
          width: "100%",
          videoId,
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            fs: 1,
            controls: 1,
            start: startSeconds,
          },
          events: {
            onReady: () => {
              if (cancelled || !playerRef.current) return;
              if (startSeconds > 0) {
                playerRef.current.seekTo(startSeconds, true);
              }
            },
            onError: () => {
              clearPlayer();
              if (!cancelled) setUseFallback(true);
            },
          },
        });

        playerRef.current = player;

        progressInterval.current = setInterval(() => {
          try {
            const time = player.getCurrentTime();
            if (time > 0) onProgressRef.current?.(time);
          } catch {
            // player destroyed
          }
        }, 5000);
      } catch {
        clearPlayer();
        if (!cancelled) setUseFallback(true);
      }
    }

    void init();

    return () => {
      cancelled = true;
      clearPlayer();
    };
  }, [videoId, autoplay, startSeconds, useFallback]);

  const start = startSeconds > 0 ? `&start=${Math.floor(startSeconds)}` : "";

  return (
    <div className="absolute inset-0 h-full w-full">
      {useFallback ? (
        <iframe
          key={`fallback-${videoId}`}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&fs=1&playsinline=1&enablejsapi=1${start}`}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
          title="B28 video player"
        />
      ) : (
        <div key={`yt-${videoId}`} ref={mountRef} className="absolute inset-0 h-full w-full" />
      )}
    </div>
  );
}
