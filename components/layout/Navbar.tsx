"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { GENRES } from "@/lib/types";

function NavbarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [syncStatus, setSyncStatus] = useState("Syncing B28 catalog…");

  const browseGenre = searchParams.get("genre");

  useEffect(() => {
    fetch("/api/catalog")
      .then((res) => res.json())
      .then((data) => {
        const count = data.videos?.length ?? 0;
        const source = data.source || "catalog";
        setSyncStatus(`Auto-sync active • ${count} titles • ${source}`);
      })
      .catch(() => setSyncStatus("Built-in catalog active"));
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function isGenreActive(genre: string) {
    if (genre === "All") return pathname === "/";
    if (pathname === "/browse") return browseGenre === genre;
    return false;
  }

  return (
    <header className="sticky top-0 z-50 flex flex-wrap items-center gap-3 border-b border-white/10 bg-bg/80 px-[2.2%] py-3.5 backdrop-blur-xl">
      <Link href="/" className="shrink-0 text-xl font-black uppercase tracking-tighter">
        B28 <span className="text-accent">Entertainment</span>
      </Link>

      <div className="shrink-0 rounded-full border border-white/10 bg-accent/10 px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-[#ffd9dc]">
        {syncStatus}
      </div>

      <nav className="flex min-w-[200px] flex-1 gap-2 overflow-x-auto pb-0.5" aria-label="Main genres">
        {GENRES.map((genre) => {
          const href = genre === "All" ? "/" : `/browse?genre=${encodeURIComponent(genre)}`;
          return (
            <Link
              key={genre}
              href={href}
              className={`nav-btn ${isGenreActive(genre) ? "nav-btn-active" : ""}`}
            >
              {genre === "All" ? "Home" : genre}
            </Link>
          );
        })}
        <Link
          href="/browse"
          className={`nav-btn ${pathname === "/browse" && !browseGenre ? "nav-btn-active" : ""}`}
        >
          Browse
        </Link>
      </nav>

      <form
        onSubmit={handleSearchSubmit}
        className="relative w-[min(300px,30vw)] min-w-[140px] shrink-0"
      >
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 fill-muted"
          viewBox="0 0 24 24"
        >
          <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79L20.49 19 19 20.49l-4.99-5zm-6 0A4.5 4.5 0 1 1 9.5 5a4.5 4.5 0 0 1 0 9z" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white outline-none transition focus:border-accent/60 focus:shadow-[0_0_0_4px_rgba(229,9,20,0.12)] placeholder:text-subtle"
          type="text"
          placeholder="Search B28 originals..."
        />
      </form>
    </header>
  );
}

export default function Navbar() {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-50 border-b border-white/10 bg-bg/80 px-[2.2%] py-3.5">
          <span className="text-xl font-black uppercase tracking-tighter">
            B28 <span className="text-accent">Entertainment</span>
          </span>
        </header>
      }
    >
      <NavbarContent />
    </Suspense>
  );
}
