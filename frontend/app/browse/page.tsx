import { getCatalogPage, isCatalogUnavailable } from "@/lib/catalog";
import BrowseClient from "@/components/browse/BrowseClient";

export const metadata = {
  title: "Browse | B28 Entertainment",
  description: "Browse Kenyan films and B28 Entertainment originals by genre and decade.",
};

interface BrowsePageProps {
  searchParams: Promise<{ genre?: string; page?: string }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const genre = params.genre ?? "All";

  const catalog = await getCatalogPage({ page, limit: 24, genre });

  return (
    <BrowseClient
      videos={catalog.videos}
      page={catalog.page ?? page}
      total={catalog.total ?? catalog.videos.length}
      limit={catalog.limit ?? 24}
      genre={genre}
      unavailable={isCatalogUnavailable(catalog)}
    />
  );
}
