import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.accessToken) {
    const headersList = await headers();
    const pathname =
      headersList.get("x-pathname") ??
      headersList.get("x-invoke-path") ??
      headersList.get("next-url") ??
      "";
    const redirectTarget = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";
    redirect(redirectTarget);
  }
  return children;
}
