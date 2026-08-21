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
  unavailable?: boolean;
}

export default function HomeClient({ videos, unavailable = false }: HomeClientProps) {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<ContentRow[]>(() => getRowsFor(videos, "All"));
  const [continueWatching, setContinueWatching] = useState<CatalogVideo[]>([]);
  const [watchlist, setWatchlist] = useState<CatalogVideo[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  useEffect(() => {
    setRows(getRowsFor(videos, "All"));
  }, [videos]);

  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    async function loadPersonal() {
      const cw = await syncContinueWatchingFromApi(videos);
      if (cancelled) return;
      setContinueWatching(cw.videos);
      setProgressMap(cw.progressMap);
      setWatchlist(await syncWatchlistFromApi(videos));
    }

    void loadPersonal();
    return () => {
      cancelled = true;
    };
  }, [videos, user?.id, loading]);

  async function handleRemoveContinue(videoId: string) {
    await removeFromContinueWatching(videoId);
    setContinueWatching((prev) => prev.filter((v) => v.id !== videoId));
    setProgressMap((prev) => {
      const next = { ...prev };
      delete next[videoId];
      return next;
    });
  }

  return (
    <>
      {unavailable ? (
        <section className="px-[2.2%] py-16 text-center max-md:px-4">
          <h1 className="mb-3 text-2xl font-bold">Catalog temporarily unavailable</h1>
          <p className="text-muted">We could not load titles from the catalog service. Please try again shortly.</p>
        </section>
      ) : (
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
      )}
    </>
  );
}
