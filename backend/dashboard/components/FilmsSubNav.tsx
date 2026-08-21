"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/films", label: "Catalog" },
  { href: "/films/upload", label: "Upload" },
];

export default function FilmsSubNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-2 border-b border-surface-border pb-3">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-accent text-black"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
