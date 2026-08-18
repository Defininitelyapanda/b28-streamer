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

export interface PlatformSetting {
  key: string;
  value: unknown;
  type: string;
  updatedAt: string;
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  createdAt: string;
}

export interface OverviewStats {
  health: { status: string; checks: { database: boolean; redis: boolean } };
  users: { total: number; byRole: Record<string, number> };
  settings: {
    monthlyPrice: number;
    annualPrice: number;
    filmmakerShare: number;
    platformShare: number;
    currency: string;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const API_ROOT = API_BASE.replace(/\/api\/v1\/?$/, "");

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

export async function apiHealthReady() {
  const res = await fetch(`${API_ROOT}/health/ready`);
  const json = (await res.json()) as ApiResponse<{ status: string; checks: { database: boolean; redis: boolean } }>;
  if (!json.success) throw new Error("Health check failed");
  return json.data;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
  if (!json.success) throw new Error(json.error.message);
  setStoredTokens(json.data.accessToken, json.data.refreshToken);
  return json.data;
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

export async function getOverview(): Promise<OverviewStats> {
  return apiRequest<OverviewStats>("/admin/overview");
}

export async function listUsers(page = 1, limit = 20) {
  return apiRequest<{ items: UserMe[]; total: number; page: number; limit: number }>(
    `/admin/users?page=${page}&limit=${limit}`,
  );
}

export async function updateUserStatus(id: string, status: "ACTIVE" | "SUSPENDED") {
  return apiRequest(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function assignUserRoles(id: string, roles: string[]) {
  return apiRequest(`/admin/users/${id}/roles`, {
    method: "POST",
    body: JSON.stringify({ roles }),
  });
}

export async function listSettings() {
  return apiRequest<PlatformSetting[]>("/admin/settings");
}

export async function upsertSetting(key: string, value: unknown, type: string) {
  return apiRequest<PlatformSetting>("/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ key, value, type }),
  });
}

export async function listFeatureFlags() {
  return apiRequest<FeatureFlag[]>("/admin/feature-flags");
}

export async function updateFeatureFlag(key: string, enabled: boolean) {
  return apiRequest<FeatureFlag>(`/admin/feature-flags/${key}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export async function listAuditLogs(page = 1, action?: string) {
  const q = new URLSearchParams({ page: String(page), limit: "30" });
  if (action) q.set("action", action);
  return apiRequest<{ items: AuditLog[]; total: number }>(`/admin/audit-logs?${q}`);
}

export interface CatalogVideo {
  id: string;
  title: string;
  thumbnail: string;
  date: string;
  genre: string;
  desc: string;
  rating: string;
  sourceType: string;
  videoId: string;
  type: string;
  seriesGroup: string;
  published?: boolean;
}

export async function listCatalogVideos() {
  return apiRequest<CatalogVideo[]>("/admin/catalog");
}

export async function upsertCatalogVideo(video: {
  slug: string;
  title: string;
  thumbnail: string;
  date: string;
  genre: string;
  description: string;
  rating: string;
  sourceType: string;
  videoId: string;
  type: string;
  seriesGroup: string;
  published?: boolean;
}) {
  return apiRequest<CatalogVideo>("/admin/catalog", {
    method: "PUT",
    body: JSON.stringify(video),
  });
}

export async function updateCatalogVideo(
  slug: string,
  patch: Partial<{
    title: string;
    thumbnail: string;
    date: string;
    genre: string;
    description: string;
    rating: string;
    type: string;
    seriesGroup: string;
    published: boolean;
  }>,
) {
  return apiRequest<CatalogVideo>(`/admin/catalog/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function unpublishCatalogVideo(slug: string) {
  return apiRequest<{ message: string }>(`/admin/catalog/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
}

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR", "FINANCE_ADMIN", "CONTENT_ADMIN"];

export function isAdminUser(roles: string[]) {
  return roles.some((r) => ADMIN_ROLES.includes(r));
}

export function hasPermission(permissions: string[], perm: string, roles: string[]) {
  if (roles.includes("SUPER_ADMIN")) return true;
  return permissions.includes(perm);
}
