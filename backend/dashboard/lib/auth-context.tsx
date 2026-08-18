"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getMe, isAdminUser, UserMe, clearStoredTokens, getStoredTokens } from "@/lib/api-client";

interface AuthContextValue {
  user: UserMe | null;
  permissions: string[];
  loading: boolean;
  refresh: () => Promise<void>;
  logoutLocal: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  permissions: [],
  loading: true,
  refresh: async () => {},
  logoutLocal: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) {
      setUser(null);
      setPermissions([]);
      setLoading(false);
      return;
    }
    try {
      const me = await getMe();
      if (!isAdminUser(me.roles)) {
        clearStoredTokens();
        setUser(null);
        setPermissions([]);
      } else {
        setUser(me);
        // Permissions loaded via JWT on API; derive from roles for nav (API enforces server-side)
        setPermissions(derivePermissions(me.roles));
      }
    } catch {
      clearStoredTokens();
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        loading,
        refresh,
        logoutLocal: () => {
          clearStoredTokens();
          setUser(null);
          setPermissions([]);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function derivePermissions(roles: string[]): string[] {
  if (roles.includes("SUPER_ADMIN")) return ["*"];
  const map: Record<string, string[]> = {
    ADMIN: ["users.read", "users.write", "users.suspend", "settings.read", "settings.write", "audit.read", "films.read", "films.approve", "films.delete", "payments.read", "revenue.read", "payouts.read", "ads.read", "comments.moderate"],
    MODERATOR: ["users.read", "comments.read", "comments.moderate"],
    FINANCE_ADMIN: ["payments.read", "revenue.read", "revenue.adjust", "payouts.read", "payouts.approve"],
    CONTENT_ADMIN: ["films.read", "films.approve", "films.reject", "films.delete"],
  };
  const perms = new Set<string>();
  for (const role of roles) {
    (map[role] ?? []).forEach((p) => perms.add(p));
  }
  return [...perms];
}

export function useAuth() {
  return useContext(AuthContext);
}
