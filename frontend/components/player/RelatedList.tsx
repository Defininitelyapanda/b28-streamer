import WatchLink from "@/components/links/WatchLink";
import type { CatalogVideo } from "@/lib/types";

interface RelatedListProps {
  videos: CatalogVideo[];
  currentVideoId: string;
}

export default function RelatedList({ videos, currentVideoId }: RelatedListProps) {
  const related = videos.filter((v) => v.videoId !== currentVideoId).slice(0, 8);

  if (!related.length) {
    return <div className="py-10 text-center text-muted">No related videos available</div>;
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto">
      {related.map((video) => (
        <WatchLink
          key={video.id}
          slug={video.id}
          className="flex items-center gap-3 rounded-[10px] border border-transparent bg-white/[0.02] p-2 transition hover:border-accent/35 hover:bg-white/5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={video.thumbnail}
            alt={video.title}
            className="h-[68px] w-[110px] min-w-[110px] rounded-lg object-cover max-md:h-[50px] max-md:w-20 max-md:min-w-[80px]"
          />
          <div>
            <div className="line-clamp-2 text-[0.78rem] leading-snug">{video.title}</div>
            <div className="mt-1 text-[0.72rem] text-muted">
              {video.date.slice(0, 4)} • {video.genre} • {video.type}
            </div>
          </div>
        </WatchLink>
      ))}
    </div>
  );
}
