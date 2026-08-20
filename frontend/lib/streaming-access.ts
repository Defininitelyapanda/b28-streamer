import type { SubscriptionInfo } from "@/lib/api-client";
import type { Persona } from "@/app/login/login-utils";
import type { CatalogVideo, PlaybackInfo } from "@/lib/types";

export function hasFilmmakerRole(roles: string[]): boolean {
  return roles.includes("FILMMAKER");
}

export function hasFilmmakerAccess(roles: string[]): boolean {
  return roles.some((role) =>
    ["FILMMAKER", "ADMIN", "SUPER_ADMIN", "CONTENT_ADMIN"].includes(role),
  );
}

export function canStream(
  subscription: SubscriptionInfo | null | undefined,
  roles: string[],
): boolean {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_STREAMING === "true") return true;
  if (hasFilmmakerRole(roles)) return true;
  return subscription?.isPremium === true;
}

export function isFreeYoutubeVideo(video: CatalogVideo): boolean {
  return (
    (video.accessTier ?? "FREE") === "FREE" &&
    (video.playbackFormat ?? "YOUTUBE") === "YOUTUBE" &&
    Boolean(video.videoId)
  );
}

export function buildCatalogPlayback(video: CatalogVideo): PlaybackInfo {
  return {
    playbackFormat: "YOUTUBE",
    videoId: video.videoId,
    accessTier: video.accessTier ?? "FREE",
    adsEnabled: false,
  };
}

export function canWatchVideo(
  video: CatalogVideo,
  subscription: SubscriptionInfo | null | undefined,
  roles: string[],
): boolean {
  if (isFreeYoutubeVideo(video)) return true;
  return canStream(subscription, roles);
}

export function resolveWatchDestination(
  subscription: SubscriptionInfo | null | undefined,
  roles: string[],
  watchPath: string,
): string | null {
  if (canStream(subscription, roles)) return null;
  return `/offers?redirect=${encodeURIComponent(watchPath)}`;
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
    return { url: "/offers?redirect=/browse" };
  }

  return { url: redirectParam ?? "/browse" };
}
