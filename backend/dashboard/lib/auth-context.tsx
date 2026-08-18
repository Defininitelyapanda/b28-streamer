"use client";

import { createContext, useCallback, useContext } from "react";
import { signOut, useSession } from "next-auth/react";
import { isAdminUser, UserMe } from "@/lib/api-client";

interface AuthContextValue {
  user: UserMe | null;
  permissions: string[];
  loading: boolean;
  refresh: () => Promise<void>;
  logoutLocal: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  permissions: [],
  loading: true,
  refresh: async () => {},
  logoutLocal: async () => {},
});

function derivePermissions(roles: string[]): string[] {
  if (roles.includes("SUPER_ADMIN")) return ["*"];
  const map: Record<string, string[]> = {
    ADMIN: [
      "users.read", "users.write", "users.suspend", "settings.read", "settings.write", "audit.read",
      "films.read", "films.approve", "films.delete", "payments.read", "revenue.read", "payouts.read",
      "ads.read", "comments.moderate",
    ],
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const loading = status === "loading";

  const roles = session?.user?.roles ?? [];
  const user: UserMe | null =
    session?.user?.id && isAdminUser(roles)
      ? {
          id: session.user.id,
          email: session.user.email ?? "",
          displayName: session.user.name ?? null,
          status: "ACTIVE",
          emailVerified: true,
          roles,
          createdAt: "",
        }
      : null;

  const refresh = useCallback(async () => {
    await update();
  }, [update]);

  const logoutLocal = useCallback(async () => {
    await signOut({ callbackUrl: "/login" });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions: user ? derivePermissions(user.roles) : [],
        loading,
        refresh,
        logoutLocal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
