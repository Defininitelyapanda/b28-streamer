"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CatalogVideo } from "@/lib/types";
import LoginBackdrop from "@/app/login/LoginBackdrop";
import PersonaSelect from "@/app/login/PersonaSelect";
import AuthDialog from "@/app/login/AuthDialog";
import { parsePersona, type Persona } from "@/app/login/login-utils";

type AuthMode = "signin" | "signup";

function parseAuthMode(value: string | null): AuthMode {
  return value === "signup" ? "signup" : "signin";
}

function resolveInitialPersona(
  personaParam: string | null,
  modeParam: string | null,
): Persona | null {
  const parsed = parsePersona(personaParam);
  if (parsed) return parsed;
  if (parseAuthMode(modeParam) === "signup") return "streamer";
  return null;
}

interface LoginExperienceProps {
  videos: CatalogVideo[];
}

export default function LoginExperience({ videos }: LoginExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectParam = searchParams.get("redirect");
  const modeParam = searchParams.get("mode");
  const initialAuthMode = parseAuthMode(modeParam);
  const [persona, setPersona] = useState<Persona | null>(() =>
    resolveInitialPersona(searchParams.get("persona"), modeParam),
  );
  const [mismatch, setMismatch] = useState("");
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  const authOpen = persona !== null;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const updatePersonaParam = useCallback(
    (next: Persona | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) {
        params.set("persona", next);
      } else {
        params.delete("persona");
      }
      const query = params.toString();
      router.replace(query ? `/login?${query}` : "/login", { scroll: false });
    },
    [router, searchParams],
  );

  function handleSelectPersona(next: Persona) {
    setMismatch("");
    setPersona(next);
    updatePersonaParam(next);
  }

  function handleBack() {
    setMismatch("");
    setPersona(null);
    updatePersonaParam(null);
  }

  function handleSuccess(url: string) {
    router.push(url);
  }

  function handleMismatch(message: string) {
    setMismatch(message);
    setPersona(null);
    updatePersonaParam(null);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reducedMotion || window.innerWidth < 768) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 16;
    setParallax({ x, y });
  }

  return (
    <div
      className="relative flex min-h-[calc(100vh-52px)] flex-col"
      onMouseMove={handleMouseMove}
    >
      <LoginBackdrop videos={videos} persona={persona} parallax={parallax} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10">
        {mismatch && (
          <p className="mb-6 max-w-lg rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-center text-sm text-amber-100">
            {mismatch}
          </p>
        )}

        {!authOpen ? (
          <PersonaSelect selected={persona} onSelect={handleSelectPersona} />
        ) : (
          <AuthDialog
            persona={persona}
            redirectParam={redirectParam}
            initialMode={initialAuthMode}
            onBack={handleBack}
            onSuccess={handleSuccess}
            onMismatch={handleMismatch}
          />
        )}
      </div>
    </div>
  );
}
