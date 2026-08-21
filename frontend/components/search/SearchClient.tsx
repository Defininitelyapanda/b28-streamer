"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { CatalogVideo } from "@/lib/types";
import { filterVideos } from "@/lib/catalog-utils";
import FilterBar from "@/components/browse/FilterBar";
import VideoGrid from "@/components/browse/VideoGrid";

function SearchContent({
  videos,
  serverQuery,
}: {
  videos: CatalogVideo[];
  serverQuery: string;
}) {
  const params = useSearchParams();
  const query = serverQuery || params.get("q") || "";
  const genre = params.get("genre") || "All";
  const type = params.get("type") || "All";

  const filtered = serverQuery
    ? filterVideos(videos, { query: "", genre, type })
    : filterVideos(videos, { query, genre, type });

  return (
    <>
      <FilterBar />
      <VideoGrid
        videos={filtered}
        emptyMessage={query ? `No results for "${query}"` : "Enter a search term above."}
      />
    </>
  );
}

export default function SearchClient({
  videos,
  serverQuery = "",
}: {
  videos: CatalogVideo[];
  serverQuery?: string;
}) {
  return (
    <section className="px-[2.2%] py-8 max-md:px-4">
      <h1 className="row-title mb-8">Search B28</h1>
      <Suspense fallback={<div className="py-10 text-muted">Searching…</div>}>
        <SearchContent videos={videos} serverQuery={serverQuery} />
      </Suspense>
    </section>
  );
}
