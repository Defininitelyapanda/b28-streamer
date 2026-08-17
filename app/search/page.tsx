import { Suspense } from "react";
import { getCatalog } from "@/lib/catalog";
import SearchClient from "@/components/search/SearchClient";

export const metadata = {
  title: "Search | B28 Entertainment",
};

export default async function SearchPage() {
  const catalog = await getCatalog();
  return (
    <Suspense>
      <SearchClient videos={catalog.videos} />
    </Suspense>
  );
}
