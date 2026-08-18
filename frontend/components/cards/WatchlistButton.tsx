"use client";

import { useEffect, useState } from "react";
import { isInWatchlist, toggleWatchlist } from "@/lib/watchHistory";

interface WatchlistButtonProps {
  videoId: string;
  compact?: boolean;
}

export default function WatchlistButton({ videoId, compact }: WatchlistButtonProps) {
  const [inList, setInList] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInList(isInWatchlist(videoId));
  }, [videoId]);

  async function handleClick() {
    setBusy(true);
    try {
      setInList(await toggleWatchlist(videoId));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      className={compact ? "nav-btn-sm" : "btn btn-secondary"}
      onClick={handleClick}
    >
      {inList ? "✓ Saved" : "+ Watch Later"}
    </button>
  );
}
