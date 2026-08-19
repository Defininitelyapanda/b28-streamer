"use client";

import { useEffect, useRef } from "react";
import type { Persona } from "@/app/login/login-utils";

interface PersonaSelectProps {
  selected: Persona | null;
  onSelect: (persona: Persona) => void;
}

const PERSONAS: {
  id: Persona;
  title: string;
  subtitle: string;
  accent: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "streamer",
    title: "Streamer",
    subtitle: "Subscribe to stream Kenyan films & series.",
    accent: "hover:border-accent/60 hover:shadow-[0_0_40px_rgba(229,9,20,0.25)]",
    icon: (
      <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
    ),
  },
  {
    id: "filmmaker",
    title: "Filmmaker",
    subtitle: "Apply to distribute — accounts are reviewed by B28.",
    accent: "hover:border-amber-400/50 hover:shadow-[0_0_40px_rgba(251,191,36,0.2)]",
    icon: (
      <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
      </svg>
    ),
  },
];

export default function PersonaSelect({ selected, onSelect }: PersonaSelectProps) {
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = PERSONAS[(index + 1) % PERSONAS.length];
      document.getElementById(`persona-${next.id}`)?.focus();
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = PERSONAS[(index - 1 + PERSONAS.length) % PERSONAS.length];
      document.getElementById(`persona-${prev.id}`)?.focus();
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">How will you use B28?</h1>
        <p className="mt-2 text-sm text-muted md:text-base">
          Choose your path before signing in or creating an account.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PERSONAS.map((persona, index) => {
          const isSelected = selected === persona.id;
          return (
            <button
              key={persona.id}
              id={`persona-${persona.id}`}
              ref={index === 0 ? firstRef : undefined}
              type="button"
              onClick={() => onSelect(persona.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              aria-pressed={isSelected}
              className={`glass-panel group rounded-2xl p-6 text-left transition-all duration-300 ${persona.accent} ${
                isSelected
                  ? persona.id === "filmmaker"
                    ? "border-amber-400/50 ring-2 ring-amber-400/30"
                    : "border-accent/60 ring-2 ring-accent/30"
                  : "border-white/10"
              }`}
            >
              <div
                className={`mb-4 inline-flex rounded-xl p-3 ${
                  persona.id === "filmmaker"
                    ? "bg-amber-400/15 text-amber-300"
                    : "bg-accent/15 text-accent"
                }`}
              >
                {persona.icon}
              </div>
              <h2 className="text-xl font-bold">{persona.title}</h2>
              <p className="mt-2 text-sm text-muted">{persona.subtitle}</p>
              <span className="mt-4 inline-flex text-sm font-semibold text-white/80 group-hover:text-white">
                Continue as {persona.title} →
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
