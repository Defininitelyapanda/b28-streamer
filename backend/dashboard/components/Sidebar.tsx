"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { filterNav, NAV_ITEMS } from "@/lib/nav-config";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, permissions, logoutLocal } = useAuth();

  const items = filterNav(NAV_ITEMS, user?.roles ?? [], permissions);

  const handleLogout = async () => {
    await logoutLocal();
    router.push("/login");
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-surface-border bg-surface-card">
      <div className="border-b border-surface-border px-5 py-4">
        <p className="text-lg font-bold text-white">B28 Oncodex</p>
        <p className="text-xs text-gray-400">Admin Dashboard</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                active ? "bg-accent text-white" : "text-gray-300 hover:bg-surface-border"
              }`}
            >
              <span>{item.label}</span>
              {!item.live && (
                <span className="rounded bg-surface-border px-1.5 py-0.5 text-[10px] text-gray-400">Soon</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-surface-border p-4">
        <p className="truncate text-sm text-gray-300">{user?.email}</p>
        <p className="text-xs text-gray-500">{user?.roles.join(", ")}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-gray-300 hover:bg-surface-border"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
