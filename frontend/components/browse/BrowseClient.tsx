"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { CatalogVideo } from "@/lib/types";
import { filterVideos } from "@/lib/catalog-utils";
import FilterBar from "@/components/browse/FilterBar";
import VideoGrid from "@/components/browse/VideoGrid";

function BrowseContent({ videos }: { videos: CatalogVideo[] }) {
  const params = useSearchParams();
  const genre = params.get("genre") || "All";
  const decade = params.get("decade") || "All";
  const type = params.get("type") || "All";

  const filtered = filterVideos(videos, { genre, decade, type });

  return (
    <>
      <FilterBar />
      <VideoGrid videos={filtered} emptyMessage="No titles match your filters." />
    </>
  );
}

export default function BrowseClient({ videos }: { videos: CatalogVideo[] }) {
  return (
    <section className="px-[2.2%] py-8 max-md:px-4">
      <h1 className="row-title mb-2">Discover something new</h1>
      <p className="mb-8 max-w-2xl text-muted">
        Browse B28 originals by genre, decade, and format — films and trailers from Kenyan cinema.
      </p>
      <Suspense fallback={<div className="py-10 text-muted">Loading filters…</div>}>
        <BrowseContent videos={videos} />
      </Suspense>
    </section>
  );
}
