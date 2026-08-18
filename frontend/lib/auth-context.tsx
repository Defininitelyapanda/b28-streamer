"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  clearStoredTokens,
  getMe,
  getMySubscription,
  getStoredTokens,
  logout as apiLogout,
  SubscriptionInfo,
  UserMe,
} from "@/lib/api-client";

interface AuthContextValue {
  user: UserMe | null;
  subscription: SubscriptionInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setSubscription: (sub: SubscriptionInfo | null) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  subscription: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
  setSubscription: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) {
      setUser(null);
      setSubscription(null);
      setLoading(false);
      return;
    }
    try {
      const [me, sub] = await Promise.all([getMe(), getMySubscription()]);
      setUser(me);
      setSubscription(sub);
    } catch {
      clearStoredTokens();
      setUser(null);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setSubscription(null);
  }, []);

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
  const { subscription, user } = useAuth();
  if (!user) return true;
  return subscription?.adsEnabled !== false;
}
