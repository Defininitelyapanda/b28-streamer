"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { CatalogVideo } from "@/lib/types";
import { sortFeaturedVideos } from "@/lib/catalog-utils";
import type { Persona } from "@/app/login/login-utils";

interface LoginBackdropProps {
  videos: CatalogVideo[];
  persona: Persona | null;
  parallax: { x: number; y: number };
}

function MarqueeRow({
  items,
  reverse = false,
  reducedMotion,
}: {
  items: CatalogVideo[];
  reverse?: boolean;
  reducedMotion: boolean;
}) {
  const doubled = [...items, ...items];

  return (
    <div className="marquee-row overflow-hidden py-2">
      <div
        className={`marquee-track flex gap-3 ${reverse ? "marquee-reverse" : ""} ${reducedMotion ? "marquee-static" : ""}`}
      >
        {doubled.map((video, index) => (
          <div
            key={`${video.id}-${index}`}
            className="relative h-28 w-48 shrink-0 overflow-hidden rounded-xl border border-white/10 opacity-70 md:h-32 md:w-56"
          >
            <Image
              src={video.thumbnail}
              alt=""
              fill
              sizes="224px"
              className="object-cover"
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LoginBackdrop({ videos, persona, parallax }: LoginBackdropProps) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const heroSlides = useMemo(() => sortFeaturedVideos(videos, 4), [videos]);
  const rowA = useMemo(() => videos.slice(0, Math.ceil(videos.length / 2)), [videos]);
  const rowB = useMemo(() => videos.slice(Math.ceil(videos.length / 2)), [videos]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion || heroSlides.length <= 1) return;
    const id = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroSlides.length);
    }, 8000);
    return () => clearInterval(id);
  }, [heroSlides.length, reducedMotion]);

  const currentHero = heroSlides[heroIndex] ?? heroSlides[0];
  const tintClass =
    persona === "filmmaker"
      ? "from-amber-500/10 via-transparent to-blue-500/10"
      : persona === "streamer"
        ? "from-accent/15 via-transparent to-transparent"
        : "from-transparent via-transparent to-transparent";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
      style={{
        transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
      }}
    >
      {currentHero && (
        <div
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${reducedMotion ? "" : "login-ken-burns"}`}
          style={{
            backgroundImage: `url("${currentHero.thumbnail}")`,
          }}
        />
      )}

      <div className="absolute inset-0 bg-black/75" />
      <div className={`absolute inset-0 bg-gradient-to-br ${tintClass}`} />
      <div className="login-vignette absolute inset-0" />
      <div className="film-grain absolute inset-0" />

      <div className="absolute inset-0 flex flex-col justify-center gap-4 opacity-40 blur-[2px]">
        {rowA.length > 0 && <MarqueeRow items={rowA} reducedMotion={reducedMotion} />}
        {rowB.length > 0 && <MarqueeRow items={rowB} reverse reducedMotion={reducedMotion} />}
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90" />
    </div>
  );
}
