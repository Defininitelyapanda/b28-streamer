import { getCatalog } from "@/lib/catalog";
import BrowseClient from "@/components/browse/BrowseClient";

export const metadata = {
  title: "Browse | B28 Entertainment",
  description: "Browse Kenyan films and B28 Entertainment originals by genre and decade.",
};

export default async function BrowsePage() {
  const catalog = await getCatalog();
  return <BrowseClient videos={catalog.videos} />;
}
