import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { UserMe } from "@/lib/api-client";
import { isAdminUser } from "@/lib/api-client";
import { getAuthSecret, getServerApiBase } from "@/lib/server-api-base";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  error: { code: string; message: string };
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getServerApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiSuccess<T> | ApiError;
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

async function apiGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${getServerApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as ApiSuccess<T> | ApiError;
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

async function refreshTokens(refreshToken: string) {
  return apiPost<{ accessToken: string; refreshToken: string }>("/auth/refresh", { refreshToken });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: getAuthSecret(),
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-b28-admin.session-token"
          : "b28-admin.session-token",
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const tokens = await apiPost<{ accessToken: string; refreshToken: string }>("/auth/login", {
            email: credentials.email,
            password: credentials.password,
          });
          const me = await apiGet<UserMe>("/users/me", tokens.accessToken);
          if (!isAdminUser(me.roles)) return null;
          return {
            id: me.id,
            email: me.email,
            name: me.displayName ?? me.email,
            roles: me.roles,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.roles = user.roles;
        token.accessTokenExpires = Date.now() + 14 * 60 * 1000;
      }

      const expires = token.accessTokenExpires as number | undefined;
      if (token.refreshToken && expires && Date.now() > expires) {
        try {
          const refreshed = await refreshTokens(token.refreshToken as string);
          token.accessToken = refreshed.accessToken;
          token.refreshToken = refreshed.refreshToken;
          token.accessTokenExpires = Date.now() + 14 * 60 * 1000;
        } catch {
          token.accessToken = undefined;
          token.refreshToken = undefined;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.accessToken) session.accessToken = token.accessToken as string;
      if (token.roles) session.user.roles = token.roles as string[];
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
