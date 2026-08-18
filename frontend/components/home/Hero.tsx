import Link from "next/link";
import type { CatalogVideo } from "@/lib/types";
import WatchlistButton from "@/components/cards/WatchlistButton";

interface HeroProps {
  video: CatalogVideo;
}

export default function Hero({ video }: HeroProps) {
  const bgStyle = {
    backgroundImage: `linear-gradient(90deg, rgba(8,9,13,0.92) 0%, rgba(8,9,13,0.64) 30%, rgba(8,9,13,0.18) 60%, rgba(8,9,13,0.74) 100%), url("${video.thumbnail}")`,
  };

  return (
    <section
      className="relative flex min-h-[620px] items-end overflow-hidden border-b border-white/10 bg-cover bg-center px-[4%] pb-16 transition-[background-image] duration-500 max-md:min-h-[400px] max-md:px-[18px]"
      style={bgStyle}
    >
      <div className="relative z-10 max-w-[660px]">
        <div className="mb-3.5 inline-block rounded-md bg-accent px-3 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-widest text-white shadow-[0_0_18px_rgba(229,9,20,0.4)]">
          Featured Release
        </div>
        <h1 className="mb-3 text-[clamp(2.2rem,4vw,4rem)] font-black leading-none tracking-tighter max-sm:text-[1.8rem]">
          {video.title}
        </h1>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>{video.date.slice(0, 4)}</span>
          <span>•</span>
          <strong className="font-bold text-accent">B28 Exclusive</strong>
          <span>•</span>
          <span className="capitalize">{video.type}</span>
        </div>
        <p className="mb-6 line-clamp-3 max-w-[560px] text-[0.96rem] text-[#dfe3eb]">
          {video.desc}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/watch/${video.id}`} className="btn btn-primary">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Watch Now
          </Link>
          <WatchlistButton videoId={video.videoId} />
        </div>
      </div>
    </section>
  );
}
