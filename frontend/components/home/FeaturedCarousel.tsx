"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogVideo } from "@/lib/types";
import WatchlistButton from "@/components/cards/WatchlistButton";

interface FeaturedCarouselProps {
  videos: CatalogVideo[];
}

function scoreVideo(v: CatalogVideo) {
  return parseFloat(v.rating || "0") || 0;
}

export default function FeaturedCarousel({ videos }: FeaturedCarouselProps) {
  const slides = useMemo(
    () =>
      [...videos]
        .sort((a, b) => {
          const scoreDiff = scoreVideo(b) - scoreVideo(a);
          if (Math.abs(scoreDiff) > 0.3) return scoreDiff;
          return b.date.localeCompare(a.date);
        })
        .slice(0, 6),
    [videos],
  );

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 6000);
    return () => clearInterval(id);
  }, [slides.length]);

  if (!slides.length) return null;

  const current = slides[index];
  const bgStyle = {
    backgroundImage: `linear-gradient(90deg, rgba(8,9,13,0.92) 0%, rgba(8,9,13,0.64) 30%, rgba(8,9,13,0.18) 60%, rgba(8,9,13,0.74) 100%), url("${current.thumbnail}")`,
  };

  return (
    <section
      className="relative flex min-h-[620px] items-end overflow-hidden border-b border-white/10 bg-cover bg-center px-[4%] pb-16 transition-[background-image] duration-700 max-md:min-h-[400px] max-md:px-[18px] max-md:pb-12"
      style={bgStyle}
    >
      <div className="relative z-10 w-full max-w-[660px]">
        <div className="mb-3.5 inline-block rounded-md bg-accent px-3 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-widest text-white shadow-[0_0_18px_rgba(229,9,20,0.4)]">
          Featured Release
        </div>
        <h1 className="mb-3 text-[clamp(2rem,4vw,3.6rem)] font-black leading-none tracking-tighter max-sm:text-[1.8rem]">
          {current.title}
        </h1>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>{current.date.slice(0, 4)}</span>
          <span>•</span>
          <span className="text-[#ffd166]">★ {current.rating}</span>
          <span>•</span>
          <span className="capitalize">{current.type}</span>
          <span>•</span>
          <span>{current.genre}</span>
        </div>
        <p className="mb-6 line-clamp-3 max-w-[560px] text-[0.96rem] text-[#dfe3eb]">{current.desc}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/watch/${current.id}`} className="btn btn-primary">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Watch Now
          </Link>
          <WatchlistButton key={current.videoId} videoId={current.videoId} />
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-6 right-[4%] z-10 flex gap-2 max-md:bottom-4">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Show ${slide.title}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-8 bg-accent" : "w-4 bg-white/25 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
