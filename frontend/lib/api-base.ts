/** Client-visible API base (includes /api/v1). */
export function getPublicApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
    return "/api/v1";
  }
  return "http://localhost:4000/api/v1";
}
