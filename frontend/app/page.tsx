import { getCatalogPage, isCatalogUnavailable } from "@/lib/catalog";
import HomeClient from "@/components/home/HomeClient";

export default async function HomePage() {
  const catalog = await getCatalogPage({ limit: 24 });
  return (
    <HomeClient videos={catalog.videos} unavailable={isCatalogUnavailable(catalog)} />
  );
}
