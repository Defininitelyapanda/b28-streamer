import Link from "next/link";
import type { ContentRow } from "@/lib/catalog-utils";
import VideoCard from "@/components/cards/VideoCard";

const EXPLORE_MAP: Record<string, string> = {
  "Trending B28 Originals": "Popular",
  Drama: "Drama",
  Action: "Action",
  Thriller: "Thriller",
  Horror: "Horror",
  "Popular on B28": "Popular",
};

interface ContentRowSectionProps {
  row: ContentRow;
  progressMap?: Record<string, number>;
  onRemove?: (videoId: string) => void;
}

export default function ContentRowSection({ row, progressMap, onRemove }: ContentRowSectionProps) {
  const exploreGenre = EXPLORE_MAP[row.title];
  const isContinueRow = row.title === "Continue Watching";

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="row-title">{row.title}</h2>
        {exploreGenre && (
          <Link
            href={`/browse?genre=${encodeURIComponent(exploreGenre)}`}
            className="text-xs font-semibold text-muted transition hover:text-white"
          >
            Explore All
          </Link>
        )}
      </div>
      <div className="card-row">
        {row.items.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            showProgress={progressMap?.[video.videoId]}
            showRemove={isContinueRow}
            onRemove={onRemove ? () => onRemove(video.videoId) : undefined}
          />
        ))}
      </div>
    </section>
  );
}
