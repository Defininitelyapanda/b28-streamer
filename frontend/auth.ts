import NextAuth, { type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { SubscriptionInfo, UserMe } from "@/lib/api-client";
import { AuthFlowError, type AuthErrorCode } from "@/lib/auth-errors";
import { getAuthSecret, getServerApiBase } from "@/lib/server-api-base";

function getAuthApiBase(): string {
  return getServerApiBase();
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  error: { code: string; message: string };
}

function mapBackendAuthCode(code: string | undefined): AuthErrorCode {
  switch (code) {
    case "EMAIL_NOT_VERIFIED":
      return "email_not_verified";
    case "ACCOUNT_LOCKED":
      return "account_locked";
    case "ACCOUNT_SUSPENDED":
      return "account_suspended";
    case "INVALID_CREDENTIALS":
      return "invalid_credentials";
    default:
      return "invalid_credentials";
  }
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getAuthApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status >= 500) {
    throw new AuthFlowError(
      "service_unavailable",
      `API unreachable (${res.status}). Check B28_API_URL / NEXT_PUBLIC_API_URL.`,
    );
  }

  let json: ApiSuccess<T> | ApiError;
  try {
    json = (await res.json()) as ApiSuccess<T> | ApiError;
  } catch {
    throw new AuthFlowError(
      "service_unavailable",
      `API unreachable (${res.status}). Check B28_API_URL / NEXT_PUBLIC_API_URL.`,
    );
  }

  if (!json.success) {
    throw new AuthFlowError(
      mapBackendAuthCode(json.error?.code),
      json.error?.message ?? "Authentication failed.",
    );
  }

  return json.data;
}

async function apiGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${getAuthApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as ApiSuccess<T> | ApiError;
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

async function refreshTokens(refreshToken: string) {
  return apiPost<AuthSessionPayload>("/auth/refresh", { refreshToken });
}

interface AuthSessionPayload {
  accessToken: string;
  refreshToken: string;
  user?: UserMe;
  subscription?: SubscriptionInfo;
}

function getAccessTokenExpiryMs(accessToken: string | undefined): number | null {
  if (!accessToken) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8"),
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function shouldRefreshAccessToken(
  accessToken: string | undefined,
  fallbackExpires?: number,
): boolean {
  const jwtExpires = getAccessTokenExpiryMs(accessToken);
  const expiresAt = jwtExpires ?? fallbackExpires;
  if (!expiresAt) return false;
  return Date.now() >= expiresAt - 60_000;
}

async function buildSessionUserFromPayload(payload: AuthSessionPayload) {
  if (payload.user) {
    return {
      id: payload.user.id,
      email: payload.user.email,
      name: payload.user.displayName ?? payload.user.email,
      roles: payload.user.roles,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      subscription: payload.subscription ?? {
        plan: "FREE_WITH_ADS",
        status: "ACTIVE",
        adsEnabled: true,
        isPremium: false,
        expiresAt: null,
      },
    };
  }
  return buildSessionUser(payload);
}

async function buildSessionUser(tokens: { accessToken: string; refreshToken: string }) {
  const [me, subscription] = await Promise.all([
    apiGet<UserMe>("/users/me", tokens.accessToken),
    apiGet<SubscriptionInfo>("/subscriptions/me", tokens.accessToken).catch(
      (): SubscriptionInfo => ({
        plan: "FREE_WITH_ADS",
        status: "ACTIVE",
        adsEnabled: true,
        isPremium: false,
        expiresAt: null,
      }),
    ),
  ]);
  return {
    id: me.id,
    email: me.email,
    name: me.displayName ?? me.email,
    roles: me.roles,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    subscription,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: getAuthSecret(),
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      id: "credentials",
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
        idToken: { type: "text" },
        accessToken: { type: "text" },
        refreshToken: { type: "text" },
      },
      authorize: async (credentials): Promise<User | null> => {
        if (credentials?.accessToken && credentials?.refreshToken) {
          return await buildSessionUser({
            accessToken: credentials.accessToken as string,
            refreshToken: credentials.refreshToken as string,
          });
        }
        if (credentials?.idToken) {
          const payload = await apiPost<AuthSessionPayload>("/auth/google", {
            idToken: credentials.idToken,
          });
          return await buildSessionUserFromPayload(payload);
        }
        if (credentials?.email && credentials?.password) {
          const payload = await apiPost<AuthSessionPayload>("/auth/login", {
            email: credentials.email,
            password: credentials.password,
          });
          return await buildSessionUserFromPayload(payload);
        }
        return null;
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (account?.provider === "google" && account.id_token) {
        try {
          const payload = await apiPost<AuthSessionPayload>("/auth/google", {
            idToken: account.id_token,
          });
          const sessionUser = await buildSessionUserFromPayload(payload);
          token.sub = sessionUser.id;
          token.accessToken = sessionUser.accessToken;
          token.refreshToken = sessionUser.refreshToken;
          token.roles = sessionUser.roles;
          token.subscription = sessionUser.subscription;
          token.accessTokenExpires =
            getAccessTokenExpiryMs(sessionUser.accessToken) ?? Date.now() + 14 * 60 * 1000;
          token.email = sessionUser.email;
          token.name = sessionUser.name;
          return token;
        } catch {
          return token;
        }
      }

      if (user && account?.provider === "credentials") {
        token.sub = user.id;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.roles = user.roles;
        token.subscription = user.subscription;
        token.accessTokenExpires =
          getAccessTokenExpiryMs(user.accessToken) ?? Date.now() + 14 * 60 * 1000;
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
      }

      const expires = token.accessTokenExpires as number | undefined;
      if (
        token.refreshToken &&
        shouldRefreshAccessToken(token.accessToken as string | undefined, expires)
      ) {
        try {
          const refreshed = await refreshTokens(token.refreshToken as string);
          token.accessToken = refreshed.accessToken;
          token.refreshToken = refreshed.refreshToken;
          token.accessTokenExpires = getAccessTokenExpiryMs(refreshed.accessToken) ?? undefined;
          if (refreshed.user) {
            token.sub = refreshed.user.id;
            token.roles = refreshed.user.roles;
            token.email = refreshed.user.email;
            token.name = refreshed.user.displayName ?? refreshed.user.email;
          }
          if (refreshed.subscription) {
            token.subscription = refreshed.subscription;
          } else {
            token.subscription = await apiGet<SubscriptionInfo>(
              "/subscriptions/me",
              refreshed.accessToken,
            );
          }
        } catch {
          const stillValid = getAccessTokenExpiryMs(token.accessToken as string | undefined);
          if (!stillValid || Date.now() >= stillValid) {
            token.accessToken = undefined;
            token.refreshToken = undefined;
          }
        }
      } else if (trigger === "update" && token.accessToken) {
        const updateData = session as { subscription?: SubscriptionInfo } | undefined;
        if (updateData?.subscription) {
          token.subscription = updateData.subscription;
        } else {
          token.subscription = await apiGet<SubscriptionInfo>(
            "/subscriptions/me",
            token.accessToken as string,
          );
        }
        try {
          const me = await apiGet<UserMe>("/users/me", token.accessToken as string);
          token.roles = me.roles;
        } catch {
          // keep existing roles
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.accessToken) session.accessToken = token.accessToken as string;
      if (token.roles) session.user.roles = token.roles as string[];
      if (token.subscription) session.subscription = token.subscription as SubscriptionInfo;
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
