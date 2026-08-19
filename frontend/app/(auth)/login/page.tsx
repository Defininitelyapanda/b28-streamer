import { auth } from "@/auth";
import { getCatalog } from "@/lib/catalog";
import { pickPopularVideos } from "@/lib/catalog-utils";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import LoginExperience from "@/app/login/LoginExperience";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const session = await auth();
  const { redirect: redirectTo } = await searchParams;

  if (session?.accessToken) {
    redirect(redirectTo ?? "/");
  }

  const catalog = await getCatalog();
  const backdropVideos = pickPopularVideos(catalog.videos, 16);

  return (
    <Suspense fallback={<p className="relative z-10 p-8 text-center text-muted">Loading…</p>}>
      <LoginExperience videos={backdropVideos} />
    </Suspense>
  );
}
