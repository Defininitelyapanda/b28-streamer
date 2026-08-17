"use client";

import { useEffect, useState } from "react";
import { isInWatchlist, toggleWatchlist } from "@/lib/watchHistory";

export default function WatchlistButton({ videoId }: { videoId: string }) {
  const [inList, setInList] = useState(false);

  useEffect(() => {
    setInList(isInWatchlist(videoId));
  }, [videoId]);

  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={() => setInList(toggleWatchlist(videoId))}
    >
      {inList ? "✓ In My List" : "My List"}
    </button>
  );
}
