"use client";

import { useCallback, useEffect, useRef } from "react";

interface VideoPlayerProps {
  src: string;
  startSeconds?: number;
  onProgress?: (seconds: number) => void;
  poster?: string;
}

export default function VideoPlayer({
  src,
  startSeconds = 0,
  onProgress,
  poster,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReportRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || startSeconds <= 0) return;
    video.currentTime = startSeconds;
  }, [startSeconds, src]);

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
      src={src}
      poster={poster}
      controls
      playsInline
      className="h-full w-full bg-black"
      onTimeUpdate={handleTimeUpdate}
    />
  );
}
