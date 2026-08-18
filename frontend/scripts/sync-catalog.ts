import { saveCatalog } from "@/lib/catalog";
import { syncFromYouTubeChannel } from "@/lib/youtube";

async function main() {
  console.log("Syncing B28 catalog from YouTube...");
  const videos = await syncFromYouTubeChannel();
  const catalog = {
    videos,
    syncedAt: new Date().toISOString(),
    source: "youtube channel sync",
  };
  await saveCatalog(catalog);
  console.log(`Synced ${videos.length} videos.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
