export interface NavItem {
  href: string;
  label: string;
  permission?: string;
  roles?: string[];
  live: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", live: true },
  { href: "/users", label: "Users", permission: "users.read", live: true },
  { href: "/filmmakers", label: "Filmmakers", permission: "films.read", live: false },
  { href: "/films", label: "Films", permission: "films.read", live: true },
  { href: "/moderation", label: "Content Moderation", permission: "comments.moderate", live: false },
  { href: "/subscriptions", label: "Subscriptions", permission: "payments.read", live: false },
  { href: "/payments", label: "Payments", permission: "payments.read", live: false },
  { href: "/revenue", label: "Revenue", permission: "revenue.read", live: false },
  { href: "/payouts", label: "Payouts", permission: "payouts.read", live: false },
  { href: "/ads", label: "Advertisements", permission: "ads.read", live: false },
  { href: "/cms", label: "CMS", permission: "settings.read", live: false },
  { href: "/homepage", label: "Homepage", permission: "settings.read", live: false },
  { href: "/analytics", label: "Analytics", permission: "revenue.read", live: false },
  { href: "/rights", label: "Rights", permission: "films.read", live: false },
  { href: "/external-ratings", label: "External Ratings", permission: "films.read", live: false },
  { href: "/notifications", label: "Notifications", permission: "settings.read", live: false },
  { href: "/settings", label: "Settings", permission: "settings.read", live: true },
  { href: "/audit", label: "Audit Logs", permission: "audit.read", live: true },
  { href: "/health", label: "System Health", live: true },
];

export function filterNav(
  items: NavItem[],
  roles: string[],
  permissions: string[],
): NavItem[] {
  return items.filter((item) => {
    if (roles.includes("SUPER_ADMIN")) return true;
    if (item.roles && !item.roles.some((r) => roles.includes(r))) return false;
    if (item.permission && !permissions.includes(item.permission)) return false;
    return true;
  });
}
