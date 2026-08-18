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
  free: { plan: string; price: number; label: string; adsEnabled: boolean };
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function getStoredTokens() {
  if (typeof window === "undefined") return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem("b28_access_token"),
    refreshToken: localStorage.getItem("b28_refresh_token"),
  };
}

export function setStoredTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("b28_access_token", accessToken);
  localStorage.setItem("b28_refresh_token", refreshToken);
}

export function clearStoredTokens() {
  localStorage.removeItem("b28_access_token");
  localStorage.removeItem("b28_refresh_token");
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const json = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
  if (!json.success) return null;
  setStoredTokens(json.data.accessToken, json.data.refreshToken);
  return json.data.accessToken;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  let { accessToken, refreshToken } = getStoredTokens();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = (await res.json()) as ApiResponse<T>;

  if (!json.success) {
    if (retry && json.error.code === "UNAUTHORIZED" && refreshToken) {
      const newToken = await refreshAccessToken(refreshToken);
      if (newToken) return apiRequest<T>(path, options, false);
    }
    throw new Error(json.error.message);
  }

  return json.data;
}

export async function loginEmail(email: string, password: string) {
  const data = await apiRequest<{ accessToken: string; refreshToken: string }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    false,
  );
  setStoredTokens(data.accessToken, data.refreshToken);
  return data;
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

export async function verifyPhoneOtp(phone: string, code: string, displayName?: string) {
  const data = await apiRequest<{ accessToken: string; refreshToken: string }>(
    "/auth/phone/verify",
    { method: "POST", body: JSON.stringify({ phone, code, displayName }) },
    false,
  );
  setStoredTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function loginGoogle(idToken: string) {
  const data = await apiRequest<{ accessToken: string; refreshToken: string }>(
    "/auth/google",
    { method: "POST", body: JSON.stringify({ idToken }) },
    false,
  );
  setStoredTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function logout() {
  const { refreshToken } = getStoredTokens();
  if (refreshToken) {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  }
  clearStoredTokens();
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

export async function continueWithAds() {
  return apiRequest<SubscriptionInfo>("/subscriptions/continue-with-ads", { method: "POST" });
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

export function isAuthenticated() {
  return Boolean(getStoredTokens().accessToken);
}
