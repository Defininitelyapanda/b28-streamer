import { getPublicApiBase } from "@/lib/api-base";

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface UserMe {
  id: string;
  email: string;
  status: string;
  emailVerified: boolean;
  displayName: string | null;
  roles: string[];
  createdAt: string;
}

export interface SubscriptionInfo {
  plan: string;
  status: string;
  adsEnabled: boolean;
  isPremium: boolean;
  expiresAt: string | null;
}

export interface SubscriptionOffers {
  currency: string;
  monthly: { plan: string; price: number; label: string; adsEnabled: boolean };
  annual: { plan: string; price: number; discountPercent: number; label: string; adsEnabled: boolean };
  free?: { plan: string; price: number; label: string; adsEnabled: boolean };
  paymentMethods: string[];
}

export interface PaymentMethod {
  id: string;
  type: string;
  label: string;
  last4: string | null;
  isDefault: boolean;
}

export interface WatchProgressEntry {
  videoSlug: string;
  progressSeconds: number;
  updatedAt: string;
}

export interface WatchlistEntry {
  videoSlug: string;
  addedAt: string;
}

import type { PlaybackInfo } from "@/lib/types";

const API_BASE = getPublicApiBase();

async function resolveAccessToken(provided?: string | null): Promise<string | null> {
  if (provided) return provided;
  if (typeof window === "undefined") {
    const { auth } = await import("@/auth");
    const session = await auth();
    return session?.accessToken ?? null;
  }
  const { getSession } = await import("next-auth/react");
  const session = await getSession();
  return session?.accessToken ?? null;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
  accessTokenOverride?: string | null,
): Promise<T> {
  let accessToken = await resolveAccessToken(accessTokenOverride);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error(
      API_BASE.startsWith("/")
        ? "Could not reach the API. Check that the backend service is deployed."
        : "Could not reach the API. Is the backend running?",
    );
  }

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error(
      res.ok
        ? "Invalid response from server."
        : `Request failed (${res.status}). The API may be misconfigured or unavailable.`,
    );
  }

  if (!json.success) {
    if (retry && json.error.code === "UNAUTHORIZED") {
      const { getSession } = await import("next-auth/react");
      const session = await getSession();
      accessToken = session?.accessToken ?? null;
      if (accessToken) return apiRequest<T>(path, options, false, accessToken);
    }
    throw new Error(json.error.message);
  }

  return json.data;
}

export async function registerEmail(
  email: string,
  password: string,
  displayName: string,
  accountType: "STREAMER" | "FILMMAKER" = "STREAMER",
) {
  return apiRequest<{ message: string; autoVerified?: boolean }>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ email, password, displayName, accountType }),
    },
    false,
  );
}

export async function sendPhoneOtp(phone: string) {
  return apiRequest<{ message: string; devCode?: string }>(
    "/auth/phone/send-otp",
    { method: "POST", body: JSON.stringify({ phone }) },
    false,
  );
}

export async function getMe(): Promise<UserMe> {
  return apiRequest<UserMe>("/users/me");
}

export async function getSubscriptionOffers(): Promise<SubscriptionOffers> {
  return apiRequest<SubscriptionOffers>("/subscriptions/offers", {}, false);
}

export async function getMySubscription(): Promise<SubscriptionInfo> {
  return apiRequest<SubscriptionInfo>("/subscriptions/me");
}

export async function subscribe(plan: string, paymentMethodId?: string) {
  return apiRequest<SubscriptionInfo>("/subscriptions/subscribe", {
    method: "POST",
    body: JSON.stringify({ plan, paymentMethodId }),
  });
}

export interface FilmmakerApplication {
  id: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  message: string | null;
  reviewedAt: string | null;
  createdAt: string;
  email?: string;
  displayName?: string | null;
}

export async function getMyFilmmakerApplication(): Promise<FilmmakerApplication | null> {
  return apiRequest<FilmmakerApplication | null>("/filmmakers/me/application");
}

export async function listPaymentMethods() {
  return apiRequest<PaymentMethod[]>("/subscriptions/payment-methods");
}

export async function addPaymentMethod(body: {
  type: string;
  label: string;
  last4?: string;
  phone?: string;
  isDefault?: boolean;
}) {
  return apiRequest<PaymentMethod>("/subscriptions/payment-methods", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getPlaybackInfo(slug: string): Promise<PlaybackInfo> {
  return apiRequest<PlaybackInfo>(`/streaming/play/${encodeURIComponent(slug)}`);
}

export async function getContinueWatching() {
  return apiRequest<WatchProgressEntry[]>("/streaming/continue-watching");
}

export async function saveWatchProgress(videoSlug: string, progressSeconds: number) {
  return apiRequest<WatchProgressEntry>("/streaming/progress", {
    method: "PUT",
    body: JSON.stringify({ videoSlug, progressSeconds }),
  });
}

export async function removeContinueWatching(videoSlug: string) {
  return apiRequest<{ message: string }>(
    `/streaming/progress/${encodeURIComponent(videoSlug)}`,
    { method: "DELETE" },
  );
}

export async function getWatchlist() {
  return apiRequest<WatchlistEntry[]>("/streaming/watchlist");
}

export async function toggleWatchlistRemote(videoSlug: string) {
  return apiRequest<{ videoSlug: string; saved: boolean }>("/streaming/watchlist/toggle", {
    method: "POST",
    body: JSON.stringify({ videoSlug }),
  });
}
