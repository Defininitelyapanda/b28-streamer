"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DECADES, GENRES, VIDEO_TYPES } from "@/lib/types";

export default function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const genre = params.get("genre") || "All";
  const decade = params.get("decade") || "All";
  const type = params.get("type") || "All";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "All") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="mb-8 flex flex-wrap gap-3">
      <FilterGroup label="Genre" value={genre} options={[...GENRES]} onChange={(v) => update("genre", v)} />
      <FilterGroup label="Decade" value={decade} options={[...DECADES]} onChange={(v) => update("decade", v)} />
      <FilterGroup label="Type" value={type} options={[...VIDEO_TYPES]} onChange={(v) => update("type", v)} />
    </div>
  );
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
            value === opt
              ? "border-accent bg-accent text-white"
              : "border-white/10 bg-white/[0.03] text-muted hover:border-accent/40"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
