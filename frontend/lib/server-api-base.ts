/**
 * Absolute API base for server-side fetches (includes /api/v1).
 * Relative NEXT_PUBLIC_API_URL values are resolved using AUTH_URL or VERCEL_URL.
 */
export function getServerApiBase(): string {
  if (process.env.B28_API_URL) {
    const root = process.env.B28_API_URL.replace(/\/$/, "");
    if (root.endsWith("/api/v1")) return root;
    return `${root}/api/v1`;
  }

  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (publicUrl) {
    if (publicUrl.startsWith("http")) return publicUrl;
    const origin =
      process.env.AUTH_URL?.replace(/\/$/, "") ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
      "http://localhost:3000";
    return `${origin}${publicUrl.startsWith("/") ? publicUrl : `/${publicUrl}`}`;
  }

  return "http://localhost:4000/api/v1";
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "development") {
    return "dev-auth-secret-change-me-min-32-characters";
  }
  // Next.js loads auth config during production build; avoid hard-failing CI/Vercel.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "build-placeholder-secret-minimum-32-characters";
  }
  throw new Error("AUTH_SECRET is not set. Add it to your environment variables.");
}
