"use client";

import { createContext, useCallback, useContext } from "react";
import { signOut, useSession } from "next-auth/react";
import type { SubscriptionInfo, UserMe } from "@/lib/api-client";

interface AuthContextValue {
  user: UserMe | null;
  subscription: SubscriptionInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setSubscription: (sub: SubscriptionInfo | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  subscription: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
  setSubscription: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const loading = status === "loading";

  const user: UserMe | null = session?.user?.id
    ? {
        id: session.user.id,
        email: session.user.email ?? "",
        displayName: session.user.name ?? null,
        status: "ACTIVE",
        emailVerified: true,
        roles: session.user.roles ?? [],
        createdAt: "",
      }
    : null;

  const subscription = session?.subscription ?? null;

  const refresh = useCallback(async () => {
    await update();
  }, [update]);

  const logout = useCallback(async () => {
    const accessToken = session?.accessToken;
    if (accessToken) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "/api/v1"}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: "" }),
        });
      } catch {
        // ignore logout API errors
      }
    }
    await signOut({ callbackUrl: "/login" });
  }, [session?.accessToken]);

  const setSubscription = useCallback(
    async (sub: SubscriptionInfo | null) => {
      if (sub) {
        await update({ subscription: sub });
      } else {
        await update({});
      }
    },
    [update],
  );

  return (
    <AuthContext.Provider value={{ user, subscription, loading, refresh, logout, setSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useShowAds() {
  return false;
}

export function useIsPremium() {
  const { subscription } = useAuth();
  return subscription?.isPremium === true;
}
