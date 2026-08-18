import { getCatalog } from "@/lib/catalog";
import HomeClient from "@/components/home/HomeClient";

export default async function HomePage() {
  const catalog = await getCatalog();
  return <HomeClient videos={catalog.videos} />;
}
