"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getMyFilmmakerApplication, type FilmmakerApplication } from "@/lib/api-client";
import { hasFilmmakerAccess } from "@/lib/streaming-access";

const COMING_SOON = [
  {
    title: "Upload film",
    description: "Submit your feature, series, or trailer for review.",
  },
  {
    title: "Analytics",
    description: "Track views, watch time, and audience engagement.",
  },
  {
    title: "Revenue",
    description: "Monitor earnings and payout history.",
  },
];

export default function FilmmakerHubPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [application, setApplication] = useState<FilmmakerApplication | null | undefined>(
    undefined,
  );

  useEffect(() => {
    void refresh();
    // Refresh once on mount so admin-approved FILMMAKER role is picked up without re-login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading || !user) return;

    getMyFilmmakerApplication()
      .then(setApplication)
      .catch(() => setApplication(null));
  }, [loading, user]);

  useEffect(() => {
    if (loading || !user || application === undefined) return;

    const approved = hasFilmmakerAccess(user.roles);
    if (!approved && !application) {
      router.replace("/");
    }
  }, [loading, user, application, router]);

  if (loading || !user || application === undefined) {
    return <p className="px-[4%] py-16 text-center text-muted">Loading filmmaker hub…</p>;
  }

  const approved = hasFilmmakerAccess(user.roles);
  if (!approved && !application) {
    return null;
  }

  const name = user.displayName ?? user.email.split("@")[0];

  if (!approved && application?.status === "PENDING") {
    return (
      <div className="px-[4%] py-12 max-md:px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-2 inline-block rounded-md bg-amber-400/15 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-widest text-amber-300">
            Application received
          </div>
          <h1 className="text-3xl font-black tracking-tight">Thanks, {name}</h1>
          <p className="mt-4 text-muted">
            Your filmmaker application is under review. We&apos;ll notify you once your account is
            approved. Until then, you can subscribe to watch films as a streamer.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/offers?redirect=/browse" className="btn btn-primary">
              View subscription plans
            </Link>
            <Link href="/browse" className="btn btn-secondary">
              Browse catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!approved && application?.status === "REJECTED") {
    return (
      <div className="px-[4%] py-12 max-md:px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-black tracking-tight">Application not approved</h1>
          <p className="mt-4 text-muted">
            Your filmmaker application was not approved at this time. Contact support if you have
            questions.
          </p>
          <a href="mailto:support@b28.dev" className="btn btn-primary mt-8 inline-flex">
            Contact support
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="px-[4%] py-12 max-md:px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-2 inline-block rounded-md bg-amber-400/15 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-widest text-amber-300">
          Filmmaker Hub
        </div>
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">Welcome, {name}</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Your filmmaker dashboard is coming soon. Manage uploads, analytics, and revenue from here.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {COMING_SOON.map((item) => (
            <div
              key={item.title}
              className="glass-panel rounded-2xl p-5 opacity-80"
              aria-disabled="true"
            >
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-subtle">Soon</div>
              <h2 className="text-lg font-bold">{item.title}</h2>
              <p className="mt-2 text-sm text-muted">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <a href="mailto:support@b28.dev" className="btn btn-primary">
            Contact support
          </a>
          <Link href="/browse" className="btn btn-secondary">
            Watch on B28
          </Link>
        </div>
      </div>
    </div>
  );
}
