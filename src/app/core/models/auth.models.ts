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

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  picture?: string;
  googleId?: string;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user: User | null;
  role: string | null;
  roleInfo: RoleDefinition | null;
  menu: MenuItem[];
  configured: boolean;
}

export interface RolesResponse {
  roles: string[];
  definitions: Record<string, RoleDefinition>;
  allMenuItems: MenuItem[];
  mappings: Record<string, string[]>;
  mapping: Record<string, { definition: RoleDefinition; menuItems: MenuItem[] }>;
}

export interface UserRoleAssignment {
  userId: string;
  role: string;
}
