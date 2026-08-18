"use client";

import { useEffect, useState } from "react";
import type { CatalogVideo } from "@/lib/types";
import type { ContentRow } from "@/lib/catalog-utils";
import { getRowsFor } from "@/lib/catalog-utils";
import FeaturedCarousel from "@/components/home/FeaturedCarousel";
import ContentRowSection from "@/components/home/ContentRow";
import {
  removeFromContinueWatching,
  syncContinueWatchingFromApi,
  syncWatchlistFromApi,
} from "@/lib/watchHistory";
import { useAuth } from "@/lib/auth-context";

interface HomeClientProps {
  videos: CatalogVideo[];
}

export default function HomeClient({ videos }: HomeClientProps) {
  const { user } = useAuth();
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [continueWatching, setContinueWatching] = useState<CatalogVideo[]>([]);
  const [watchlist, setWatchlist] = useState<CatalogVideo[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  const loadPersonal = async () => {
    setRows(getRowsFor(videos, "All"));
    const cw = await syncContinueWatchingFromApi(videos);
    setContinueWatching(cw.videos);
    setProgressMap(cw.progressMap);
    setWatchlist(await syncWatchlistFromApi(videos));
  };

  useEffect(() => {
    loadPersonal();
  }, [videos, user]);

  async function handleRemoveContinue(videoId: string) {
    await removeFromContinueWatching(videoId);
    setContinueWatching((prev) => prev.filter((v) => v.videoId !== videoId));
    setProgressMap((prev) => {
      const next = { ...prev };
      delete next[videoId];
      return next;
    });
  }

  return (
    <>
      <FeaturedCarousel videos={videos} />
      <section className="px-[2.2%] pb-16 pt-8 max-md:px-4">
        {continueWatching.length > 0 && (
          <ContentRowSection
            row={{ title: "Continue Watching", items: continueWatching }}
            progressMap={progressMap}
            onRemove={handleRemoveContinue}
          />
        )}
        {watchlist.length > 0 && (
          <ContentRowSection row={{ title: "Watch Later", items: watchlist }} />
        )}
        {rows.map((row) => (
          <ContentRowSection key={row.title} row={row} />
        ))}
      </section>
    </>
  );
}
