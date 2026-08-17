import VideoCard from "@/components/cards/VideoCard";
import type { CatalogVideo } from "@/lib/types";

interface VideoGridProps {
  videos: CatalogVideo[];
  emptyMessage?: string;
}

export default function VideoGrid({
  videos,
  emptyMessage = "No content available",
}: VideoGridProps) {
  if (!videos.length) {
    return <div className="py-16 text-center text-muted">{emptyMessage}</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {videos.map((video) => (
        <div key={video.id} className="[&_.movie-card]:w-full [&_.movie-card]:min-w-0">
          <VideoCard video={video} />
        </div>
      ))}
    </div>
  );
}
