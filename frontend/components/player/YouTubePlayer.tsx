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
            onError?: (event: { data: number }) => void;
            onStateChange?: (event: { data: number }) => void;
          };
        }
      ) => {
        destroy: () => void;
        getCurrentTime: () => number;
        seekTo: (seconds: number, allowSeekAhead: boolean) => void;
      };
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
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
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ destroy: () => void; getCurrentTime: () => number } | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;

      try {
        await loadYouTubeApi();
        if (cancelled || !containerRef.current || !window.YT?.Player) return;

        const player = new window.YT.Player(containerRef.current, {
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
              if (startSeconds > 0 && playerRef.current) {
                (player as unknown as { seekTo: (s: number, a: boolean) => void }).seekTo(
                  startSeconds,
                  true
                );
              }
            },
            onError: () => setUseFallback(true),
          },
        });

        playerRef.current = player;

        if (onProgress) {
          progressInterval.current = setInterval(() => {
            try {
              const time = player.getCurrentTime();
              if (time > 0) onProgress(time);
            } catch {
              // player may be destroyed
            }
          }, 5000);
        }
      } catch {
        setUseFallback(true);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }
      playerRef.current = null;
    };
  }, [videoId, autoplay, startSeconds, onProgress]);

  if (useFallback) {
    const start = startSeconds > 0 ? `&start=${Math.floor(startSeconds)}` : "";
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&fs=1&playsinline=1&enablejsapi=1${start}`}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
        title="B28 video player"
      />
    );
  }

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}
