"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PlaybackFormat } from "@/lib/types";

interface VideoPlayerProps {
  src: string;
  startSeconds?: number;
  onProgress?: (seconds: number) => void;
  poster?: string;
  playbackFormat?: PlaybackFormat;
}

export default function VideoPlayer({
  src,
  startSeconds = 0,
  onProgress,
  poster,
  playbackFormat = "MP4",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReportRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || startSeconds <= 0) return;
    video.currentTime = startSeconds;
  }, [startSeconds, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (playbackFormat !== "HLS") {
      video.src = src;
      return;
    }

    let hlsInstance: { destroy: () => void } | null = null;
    let cancelled = false;

    void (async () => {
      const { default: Hls } = await import("hls.js");
      if (cancelled) return;

      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
        hlsInstance = hls;
        return;
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      }
    })();

    return () => {
      cancelled = true;
      hlsInstance?.destroy();
    };
  }, [src, playbackFormat]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !onProgress) return;
    const now = Math.floor(video.currentTime);
    if (now - lastReportRef.current >= 5) {
      lastReportRef.current = now;
      onProgress(now);
    }
  }, [onProgress]);

  return (
    <video
      ref={videoRef}
      src={playbackFormat === "HLS" ? undefined : src}
      poster={poster}
      controls
      playsInline
      className="h-full w-full bg-black"
      onTimeUpdate={handleTimeUpdate}
    />
  );
}
