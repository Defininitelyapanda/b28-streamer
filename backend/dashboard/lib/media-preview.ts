const EXT_TO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  webm: "video/webm",
  avi: "video/x-msvideo",
  m3u8: "application/vnd.apple.mpegurl",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function captureVideoPosterFrame(file: File, seekSeconds = 0.25): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const target = Number.isFinite(video.duration)
        ? Math.min(seekSeconds, Math.max(0, video.duration - 0.05))
        : seekSeconds;
      video.currentTime = target;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (!blob) {
              reject(new Error("Could not capture video frame"));
              return;
            }
            resolve(URL.createObjectURL(blob));
          },
          "image/jpeg",
          0.88,
        );
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error("Could not capture video frame"));
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not load video for preview"));
    };
  });
}

export function isImagePreviewUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("blob:") || url.startsWith("http") || url.startsWith("/");
}
