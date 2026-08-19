import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { SubscriptionInfo, UserMe } from "@/lib/api-client";
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

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getAuthApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let json: ApiSuccess<T> | ApiError;
  try {
    json = (await res.json()) as ApiSuccess<T> | ApiError;
  } catch {
    throw new Error(`API unreachable (${res.status}). Check B28_API_URL / NEXT_PUBLIC_API_URL.`);
  }
  if (!json.success) throw new Error(json.error?.message ?? "Authentication failed.");
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
  return apiPost<{ accessToken: string; refreshToken: string }>("/auth/refresh", { refreshToken });
}

async function buildSessionUser(tokens: { accessToken: string; refreshToken: string }) {
  const me = await apiGet<UserMe>("/users/me", tokens.accessToken);
  let subscription: SubscriptionInfo = {
    plan: "FREE_WITH_ADS",
    status: "ACTIVE",
    adsEnabled: true,
    isPremium: false,
    expiresAt: null,
  };
  try {
    subscription = await apiGet<SubscriptionInfo>("/subscriptions/me", tokens.accessToken);
  } catch {
    // Keep default free tier if subscription lookup fails
  }
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
      authorize: async (credentials) => {
        try {
          if (credentials?.accessToken && credentials?.refreshToken) {
            return await buildSessionUser({
              accessToken: credentials.accessToken as string,
              refreshToken: credentials.refreshToken as string,
            });
          }
          if (credentials?.idToken) {
            const tokens = await apiPost<{ accessToken: string; refreshToken: string }>("/auth/google", {
              idToken: credentials.idToken,
            });
            return await buildSessionUser(tokens);
          }
          if (credentials?.email && credentials?.password) {
            const tokens = await apiPost<{ accessToken: string; refreshToken: string }>("/auth/login", {
              email: credentials.email,
              password: credentials.password,
            });
            return await buildSessionUser(tokens);
          }
        } catch (error) {
          console.error("[auth] credentials authorize failed:", error);
          return null;
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
          const tokens = await apiPost<{ accessToken: string; refreshToken: string }>("/auth/google", {
            idToken: account.id_token,
          });
          const sessionUser = await buildSessionUser(tokens);
          token.accessToken = sessionUser.accessToken;
          token.refreshToken = sessionUser.refreshToken;
          token.roles = sessionUser.roles;
          token.subscription = sessionUser.subscription;
          token.accessTokenExpires = Date.now() + 14 * 60 * 1000;
          token.email = sessionUser.email;
          token.name = sessionUser.name;
        } catch {
          return token;
        }
      }

      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.roles = user.roles;
        token.subscription = user.subscription;
        token.accessTokenExpires = Date.now() + 14 * 60 * 1000;
      }

      const expires = token.accessTokenExpires as number | undefined;
      if (token.refreshToken && expires && Date.now() > expires) {
        try {
          const refreshed = await refreshTokens(token.refreshToken as string);
          token.accessToken = refreshed.accessToken;
          token.refreshToken = refreshed.refreshToken;
          token.accessTokenExpires = Date.now() + 14 * 60 * 1000;
          token.subscription = await apiGet<SubscriptionInfo>(
            "/subscriptions/me",
            refreshed.accessToken,
          );
        } catch {
          token.accessToken = undefined;
          token.refreshToken = undefined;
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
