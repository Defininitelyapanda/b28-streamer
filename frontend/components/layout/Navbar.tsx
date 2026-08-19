"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GENRES } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { canStream } from "@/lib/streaming-access";

function NavbarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, subscription, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [syncStatus, setSyncStatus] = useState("");

  const browseGenre = searchParams.get("genre");
  const isFilmmaker = user?.roles.some((role) =>
    ["FILMMAKER", "ADMIN", "SUPER_ADMIN", "CONTENT_ADMIN"].includes(role),
  );
  const canWatch = canStream(subscription, user?.roles ?? []);

  useEffect(() => {
    fetch("/api/catalog")
      .then((res) => res.json())
      .then((data) => {
        const count = data.videos?.length ?? 0;
        setSyncStatus(`${count} titles`);
      })
      .catch(() => setSyncStatus("Live"));
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

  if (pathname === "/login") {
    return (
      <header className="glass-bar sticky top-0 z-50 px-[2.2%] py-3 max-md:px-3">
        <Link href="/" className="text-lg font-black uppercase tracking-tighter">
          B28 <span className="text-accent">Entertainment</span>
        </Link>
      </header>
    );
  }

  return (
    <header className="glass-bar sticky top-0 z-50 flex flex-wrap items-center gap-2.5 px-[2.2%] py-2.5 max-md:px-3">
      <Link href="/" className="shrink-0 text-lg font-black uppercase tracking-tighter">
        B28 <span className="text-accent">Entertainment</span>
      </Link>

      {syncStatus && (
        <span className="hidden rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-subtle sm:inline">
          {syncStatus}
        </span>
      )}

      <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5" aria-label="Main genres">
        {GENRES.map((genre) => {
          const href = genre === "All" ? "/" : `/browse?genre=${encodeURIComponent(genre)}`;
          return (
            <Link
              key={genre}
              href={href}
              className={`nav-btn-sm ${isGenreActive(genre) ? "nav-btn-active" : ""}`}
            >
              {genre === "All" ? "Home" : genre}
            </Link>
          );
        })}
        <Link
          href="/browse"
          className={`nav-btn-sm ${pathname === "/browse" && !browseGenre ? "nav-btn-active" : ""}`}
        >
          Browse
        </Link>
        {isFilmmaker && (
          <Link
            href="/filmmaker"
            className={`nav-btn-sm ${pathname === "/filmmaker" ? "nav-btn-active" : ""}`}
          >
            Filmmaker
          </Link>
        )}
      </nav>

      <form
        onSubmit={handleSearchSubmit}
        className="relative hidden w-[min(240px,28vw)] min-w-[120px] shrink-0 sm:block"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="glass-input w-full py-2 pl-9 pr-3 text-sm"
          type="text"
          placeholder="Search…"
        />
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 fill-subtle"
          viewBox="0 0 24 24"
        >
          <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79L20.49 19 19 20.49l-4.99-5z" />
        </svg>
      </form>

      <div className="flex shrink-0 items-center gap-2">
        {user ? (
          <>
            {!canWatch && (
              <Link href="/offers" className="nav-btn-sm text-[0.65rem]">
                Upgrade
              </Link>
            )}
            <span className="hidden max-w-[100px] truncate text-xs text-muted md:inline">
              {user.displayName ?? user.email.split("@")[0]}
            </span>
            <button type="button" onClick={() => logout()} className="nav-btn-sm text-[0.65rem]">
              Log out
            </button>
          </>
        ) : (
          <Link href="/login" className="nav-btn-sm text-[0.65rem]">
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}

export default function Navbar() {
  return (
    <Suspense
      fallback={
        <header className="glass-bar sticky top-0 z-50 px-[2.2%] py-2.5">
          <span className="text-lg font-black uppercase tracking-tighter">
            B28 <span className="text-accent">Entertainment</span>
          </span>
        </header>
      }
    >
      <NavbarContent />
    </Suspense>
  );
}
