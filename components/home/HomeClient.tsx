"use client";

import { useEffect, useState } from "react";
import type { CatalogVideo } from "@/lib/types";
import type { ContentRow } from "@/lib/catalog-utils";
import { getRowsFor } from "@/lib/catalog-utils";
import Hero from "@/components/home/Hero";
import ContentRowSection from "@/components/home/ContentRow";
import { getContinueWatching, getProgressMap, getWatchlistVideos } from "@/lib/watchHistory";

interface HomeClientProps {
  videos: CatalogVideo[];
}

export default function HomeClient({ videos }: HomeClientProps) {
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [continueWatching, setContinueWatching] = useState<CatalogVideo[]>([]);
  const [watchlist, setWatchlist] = useState<CatalogVideo[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  useEffect(() => {
    setRows(getRowsFor(videos, "All"));
    setContinueWatching(getContinueWatching(videos));
    setWatchlist(getWatchlistVideos(videos));
    const map = getProgressMap();
    const progress: Record<string, number> = {};
    Object.values(map).forEach((entry) => {
      progress[entry.videoId] = entry.progressSeconds;
    });
    setProgressMap(progress);
  }, [videos]);

  const featured = videos[0];

  return (
    <>
      {featured && <Hero video={featured} />}
      <section className="px-[2.2%] pb-16 pt-8 max-md:px-4">
        {continueWatching.length > 0 && (
          <ContentRowSection
            row={{ title: "Continue Watching", items: continueWatching }}
            progressMap={progressMap}
          />
        )}
        {watchlist.length > 0 && (
          <ContentRowSection row={{ title: "My List", items: watchlist }} />
        )}
        {rows.map((row) => (
          <ContentRowSection key={row.title} row={row} />
        ))}
      </section>
    </>
  );
}
