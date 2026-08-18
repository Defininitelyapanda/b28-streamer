import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isLoggedIn = !!req.auth?.accessToken;
  const isAdmin = req.auth?.user?.roles?.some((r) =>
    ["SUPER_ADMIN", "ADMIN", "MODERATOR", "FINANCE_ADMIN", "CONTENT_ADMIN"].includes(r),
  );

  if (path.startsWith("/login") || path.startsWith("/api/auth")) {
    if (isLoggedIn && isAdmin && path === "/login") {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn || !isAdmin) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
