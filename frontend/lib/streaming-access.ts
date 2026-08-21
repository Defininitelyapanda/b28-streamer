import type { SubscriptionInfo } from "@/lib/api-client";
import type { Persona } from "@/app/login/login-utils";
import type { CatalogVideo } from "@/lib/types";

export function hasFilmmakerRole(roles: string[]): boolean {
  return roles.some((role) =>
    ["FILMMAKER", "ADMIN", "SUPER_ADMIN", "CONTENT_ADMIN"].includes(role),
  );
}

export function hasFilmmakerAccess(roles: string[]): boolean {
  return hasFilmmakerRole(roles);
}

export function canStream(
  subscription: SubscriptionInfo | null | undefined,
  roles: string[],
): boolean {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_STREAMING === "true") return true;
  if (hasFilmmakerRole(roles)) return true;
  return subscription?.isPremium === true;
}

export function isPublicTrailer(video: CatalogVideo): boolean {
  return video.type === "trailer";
}

export function isFullFilm(video: CatalogVideo): boolean {
  return video.type !== "trailer";
}

export function canWatchVideo(
  video: CatalogVideo,
  subscription: SubscriptionInfo | null | undefined,
  roles: string[],
): boolean {
  if (isPublicTrailer(video)) return true;
  return canStream(subscription, roles);
}

export function needsSignInForVideo(
  video: CatalogVideo,
  isAuthenticated: boolean,
): boolean {
  return isFullFilm(video) && !isAuthenticated;
}

export function needsSubscriptionForVideo(
  video: CatalogVideo,
  subscription: SubscriptionInfo | null | undefined,
  roles: string[],
  isAuthenticated: boolean,
): boolean {
  return isFullFilm(video) && isAuthenticated && !canStream(subscription, roles);
}

export function buildOffersUrl(redirectPath: string): string {
  return `/offers?redirect=${encodeURIComponent(redirectPath)}`;
}

export function buildLoginUrl(options: {
  redirect?: string | null;
  mode?: "signin" | "signup";
  persona?: Persona;
}): string {
  const params = new URLSearchParams();
  if (options.redirect) params.set("redirect", options.redirect);
  if (options.mode === "signup") params.set("mode", "signup");
  if (options.persona) params.set("persona", options.persona);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export function resolveWatchDestination(
  subscription: SubscriptionInfo | null | undefined,
  roles: string[],
  watchPath: string,
): string | null {
  if (canStream(subscription, roles)) return null;
  return buildOffersUrl(watchPath);
}

export function resolveAuthenticatedLoginRedirect(
  subscription: SubscriptionInfo | null | undefined,
  roles: string[],
  redirectTarget: string,
): string {
  if (redirectTarget.startsWith("/filmmaker") && hasFilmmakerAccess(roles)) {
    return redirectTarget;
  }
  if (canStream(subscription, roles)) {
    return redirectTarget;
  }
  return buildOffersUrl(redirectTarget);
}

export function resolvePostAuthRedirect(
  persona: Persona,
  roles: string[],
  subscription: SubscriptionInfo | null | undefined,
  options: {
    redirectParam?: string | null;
    authMode: "signin" | "signup";
    hasFilmmakerApplication?: boolean;
  },
): { url: string; warning?: string; stayOnLogin?: boolean } {
  const { redirectParam, authMode, hasFilmmakerApplication } = options;
  const redirectTarget = redirectParam ?? "/browse";

  if (persona === "filmmaker") {
    if (authMode === "signup" || hasFilmmakerAccess(roles) || hasFilmmakerApplication) {
      return { url: "/filmmaker" };
    }
    return {
      url: "/login",
      stayOnLogin: true,
      warning:
        "This account is registered as a viewer. Sign in as Streamer or use a filmmaker account.",
    };
  }

  if (authMode === "signup") {
    return { url: buildOffersUrl(redirectTarget) };
  }

  if (canStream(subscription, roles)) {
    return { url: redirectTarget };
  }

  return { url: buildOffersUrl(redirectTarget) };
}
