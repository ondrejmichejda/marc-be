export interface RoleBadgeColor {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  badgeColor: RoleBadgeColor;
  isSystem: boolean;
  level: number;
  createdAt?: string;
  updatedAt?: string;
}

export type MenuCategory = "General" | "Operations" | "Administration" | "System";

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
  description: string;
  category: MenuCategory;
  allowedRoles: string[];
}

export type UserRole = string;
export const USER_ROLES: string[] = ["admin", "operator", "user"];
export const DEFAULT_USER_ROLE = "user";

export const BUILTIN_ROLES: Record<string, RoleDefinition> = {
  admin: {
    id: "admin",
    name: "Administrator",
    description: "Full system administration, role configuration, user assignments, and menu mapping.",
    badgeColor: {
      bg: "bg-purple-500/10",
      text: "text-purple-300",
      border: "border-purple-500/30",
      dot: "bg-purple-400",
    },
    isSystem: true,
    level: 3,
  },
  operator: {
    id: "operator",
    name: "Operator",
    description: "Access to operational tools, background workflows, and designated business modules.",
    badgeColor: {
      bg: "bg-sky-500/10",
      text: "text-sky-300",
      border: "border-sky-500/30",
      dot: "bg-sky-400",
    },
    isSystem: false,
    level: 2,
  },
  user: {
    id: "user",
    name: "Standard User",
    description: "Standard access to designated general application modules.",
    badgeColor: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      border: "border-emerald-500/30",
      dot: "bg-emerald-400",
    },
    isSystem: false,
    level: 1,
  },
};

export const ROLE_DEFINITIONS: Record<string, RoleDefinition> = BUILTIN_ROLES;

/**
 * Base master catalog of application menu items.
 * Includes Mock Menu Items A, B, and C as well as the admin-only System menu item.
 */
export const BASE_MENU_ITEMS: MenuItem[] = [
  {
    id: "mock_a",
    label: "Menu Item A",
    icon: "🅰️",
    badge: "Module A",
    description: "Mock business application module A with analytics and workspace tools",
    category: "General",
    allowedRoles: ["admin", "operator", "user"],
  },
  {
    id: "mock_b",
    label: "Menu Item B",
    icon: "🅱️",
    badge: "Module B",
    description: "Mock business application module B with data processing and job queues",
    category: "General",
    allowedRoles: ["admin", "operator"],
  },
  {
    id: "mock_c",
    label: "Menu Item C",
    icon: "🅲",
    badge: "Module C",
    description: "Mock business application module C with reporting and external integrations",
    category: "General",
    allowedRoles: ["admin"],
  },
  {
    id: "system",
    label: "System",
    icon: "⚙️",
    badge: "Admin",
    description: "System administration, roles configuration, user assignments and menu mappings",
    category: "System",
    allowedRoles: ["admin"],
  },
];

export const ALL_MENU_ITEMS = BASE_MENU_ITEMS;

export const DEFAULT_MENU_MAPPINGS: Record<string, string[]> = {
  mock_a: ["admin", "operator", "user"],
  mock_b: ["admin", "operator"],
  mock_c: ["admin"],
  system: ["admin"],
};

export function normalizeRole(role?: string | null): string {
  if (!role) return DEFAULT_USER_ROLE;
  const lower = role.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (lower === "administrator" || lower === "superuser") return "admin";
  if (lower === "manager" || lower === "editor") return "operator";
  return lower || DEFAULT_USER_ROLE;
}

export function getRoleBadgeInfo(role?: string | null): RoleDefinition {
  const normalized = normalizeRole(role);
  if (BUILTIN_ROLES[normalized]) {
    return BUILTIN_ROLES[normalized];
  }

  return {
    id: normalized,
    name: normalized.charAt(0).toUpperCase() + normalized.slice(1),
    description: "Custom user role",
    badgeColor: {
      bg: "bg-zinc-800",
      text: "text-zinc-300",
      border: "border-zinc-700",
      dot: "bg-zinc-400",
    },
    isSystem: false,
    level: 1,
  };
}

export function getMenuItemsForRole(
  role?: string | null,
  customMappings?: Record<string, string[]>
): MenuItem[] {
  const normalizedRole = normalizeRole(role);
  const mappings = customMappings || DEFAULT_MENU_MAPPINGS;

  return BASE_MENU_ITEMS.map((item) => {
    const allowed = mappings[item.id] || (item.id === "system" ? ["admin"] : ["admin"]);
    return {
      ...item,
      allowedRoles: allowed,
    };
  }).filter((item) => item.allowedRoles.includes(normalizedRole));
}

export function hasMenuAccess(
  role: string | null | undefined,
  menuItemId: string,
  customMappings?: Record<string, string[]>
): boolean {
  const normalizedRole = normalizeRole(role);
  const mappings = customMappings || DEFAULT_MENU_MAPPINGS;
  const allowed = mappings[menuItemId] || [];
  return allowed.includes(normalizedRole);
}

export function hasRoleLevel(
  currentRole: string | null | undefined,
  requiredRole: string
): boolean {
  const currentNorm = normalizeRole(currentRole);
  const reqNorm = normalizeRole(requiredRole);

  const levelMap: Record<string, number> = {
    admin: 3,
    operator: 2,
    user: 1,
  };

  const currentLevel = levelMap[currentNorm] || 1;
  const requiredLevel = levelMap[reqNorm] || 1;

  return currentLevel >= requiredLevel;
}
