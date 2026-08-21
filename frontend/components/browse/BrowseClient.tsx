"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CatalogVideo } from "@/lib/types";
import { filterVideos } from "@/lib/catalog-utils";
import FilterBar from "@/components/browse/FilterBar";
import VideoGrid from "@/components/browse/VideoGrid";

interface BrowseClientProps {
  videos: CatalogVideo[];
  page: number;
  total: number;
  limit: number;
  genre: string;
  unavailable?: boolean;
}

function BrowseContent({
  videos,
  decade,
  type,
}: {
  videos: CatalogVideo[];
  decade: string;
  type: string;
}) {
  const filtered = filterVideos(videos, { genre: "All", decade, type });

  return <VideoGrid videos={filtered} emptyMessage="No titles match your filters." />;
}

function Pagination({
  page,
  total,
  limit,
}: {
  page: number;
  total: number;
  limit: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (totalPages <= 1) return null;

  function pageHref(nextPage: number) {
    const next = new URLSearchParams(params.toString());
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <nav className="mt-10 flex items-center justify-center gap-4 text-sm">
      {page > 1 ? (
        <Link href={pageHref(page - 1)} className="btn btn-secondary text-xs">
          ← Previous
        </Link>
      ) : (
        <span className="text-muted">← Previous</span>
      )}
      <span className="text-muted">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={pageHref(page + 1)} className="btn btn-secondary text-xs">
          Next →
        </Link>
      ) : (
        <span className="text-muted">Next →</span>
      )}
    </nav>
  );
}

export default function BrowseClient({
  videos,
  page,
  total,
  limit,
  unavailable = false,
}: BrowseClientProps) {
  const params = useSearchParams();
  const decade = params.get("decade") || "All";
  const type = params.get("type") || "All";

  return (
    <section className="px-[2.2%] py-8 max-md:px-4">
      <h1 className="row-title mb-2">Discover something new</h1>
      <p className="mb-8 max-w-2xl text-muted">
        Browse B28 originals by genre, decade, and format — films and trailers from Kenyan cinema.
      </p>

      {unavailable ? (
        <div className="glass-panel rounded-2xl p-10 text-center">
          <p className="text-lg font-semibold text-white">Catalog temporarily unavailable</p>
          <p className="mt-2 text-sm text-muted">
            We could not reach the catalog service. Please try again shortly.
          </p>
        </div>
      ) : (
        <>
          <FilterBar />
          <Suspense fallback={<div className="py-10 text-muted">Loading filters…</div>}>
            <BrowseContent videos={videos} decade={decade} type={type} />
          </Suspense>
          <Pagination page={page} total={total} limit={limit} />
        </>
      )}
    </section>
  );
}
