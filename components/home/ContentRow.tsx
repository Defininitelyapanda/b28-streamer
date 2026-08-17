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
}

export default function ContentRowSection({ row, progressMap }: ContentRowSectionProps) {
  const exploreGenre = EXPLORE_MAP[row.title];

  return (
    <section className="mb-9">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="row-title">{row.title}</h2>
        {exploreGenre && (
          <Link
            href={`/browse?genre=${encodeURIComponent(exploreGenre)}`}
            className="font-semibold text-muted transition hover:text-white"
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
          />
        ))}
      </div>
    </section>
  );
}
