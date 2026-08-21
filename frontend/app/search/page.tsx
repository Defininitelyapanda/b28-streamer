import { Suspense } from "react";
import { searchCatalog } from "@/lib/catalog";
import SearchClient from "@/components/search/SearchClient";

export const metadata = {
  title: "Search | B28 Entertainment",
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const catalog = query ? await searchCatalog(query) : { videos: [], syncedAt: null, source: "api" };

  return (
    <Suspense>
      <SearchClient videos={catalog.videos} serverQuery={query} />
    </Suspense>
  );
}
