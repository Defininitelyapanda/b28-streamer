import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

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

  return (
    <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
