import fs from "fs";
import path from "path";
import { ensureDb, isDbConfigured } from "../db";
import {
  RoleDefinition,
  RoleBadgeColor,
  MenuItem,
  BUILTIN_ROLES,
  BASE_MENU_ITEMS,
  DEFAULT_MENU_MAPPINGS,
  normalizeRole,
} from "./roles";

interface RolesStorageSchema {
  roles: Record<string, RoleDefinition>;
  mappings: Record<string, string[]>;
}

export class RolesService {
  private static localRoles = new Map<string, RoleDefinition>();
  private static localMappings = new Map<string, string[]>();
  private static initialized = false;

  private static getStoragePath(): string {
    const dataDir = path.join(process.cwd(), "data");
    return path.join(dataDir, "roles_and_mappings.json");
  }

  private static loadStorage(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Load defaults
    for (const [id, def] of Object.entries(BUILTIN_ROLES)) {
      this.localRoles.set(id, { ...def });
    }
    for (const [menuId, roles] of Object.entries(DEFAULT_MENU_MAPPINGS)) {
      this.localMappings.set(menuId, [...roles]);
    }

    try {
      const filePath = this.getStoragePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed: RolesStorageSchema = JSON.parse(raw);
        if (parsed.roles) {
          for (const [id, role] of Object.entries(parsed.roles)) {
            this.localRoles.set(id, role);
          }
        }
        if (parsed.mappings) {
          for (const [menuId, roles] of Object.entries(parsed.mappings)) {
            this.localMappings.set(menuId, roles);
          }
        }
      }
    } catch (err) {
      console.warn(
        "[RolesService] Could not read roles file, using in-memory store:",
        (err as Error).message
      );
    }
  }

  private static saveStorage(): void {
    try {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const filePath = this.getStoragePath();
      const payload: RolesStorageSchema = {
        roles: Object.fromEntries(this.localRoles),
        mappings: Object.fromEntries(this.localMappings),
      };
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
    } catch (err) {
      console.warn("[RolesService] Could not persist roles to file:", err);
    }
  }

  /**
   * Retrieves all registered role definitions.
   */
  static async listRoles(): Promise<RoleDefinition[]> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT id, name, description, badge_color, is_system, created_at, updated_at
          FROM roles
          ORDER BY is_system DESC, created_at ASC;
        `) as Record<string, unknown>[];

        if (rows.length > 0) {
          return rows.map((r) => ({
            id: String(r.id),
            name: String(r.name),
            description: String(r.description || ""),
            badgeColor:
              (r.badge_color as RoleBadgeColor) || BUILTIN_ROLES.user.badgeColor,
            isSystem: Boolean(r.is_system),
            level: String(r.id) === "admin" ? 3 : 1,
            createdAt: r.created_at ? new Date(r.created_at as string).toISOString() : undefined,
            updatedAt: r.updated_at ? new Date(r.updated_at as string).toISOString() : undefined,
          }));
        }
      } catch (err) {
        console.warn("[RolesService] DB query failed, falling back to local store:", err);
      }
    }

    this.loadStorage();
    return Array.from(this.localRoles.values());
  }

  /**
   * Retrieves a single role by ID.
   */
  static async getRole(id: string): Promise<RoleDefinition | null> {
    const normalizedId = this.normalizeRoleId(id);
    const roles = await this.listRoles();
    return roles.find((r) => r.id === normalizedId) || null;
  }

  /**
   * Creates a new custom role.
   */
  static async createRole(role: {
    id: string;
    name: string;
    description?: string;
    badgeColor?: RoleBadgeColor;
  }): Promise<RoleDefinition> {
    const roleId = this.normalizeRoleId(role.id);
    if (!roleId) {
      throw new Error("Invalid role identifier.");
    }

    const now = new Date().toISOString();
    const newRole: RoleDefinition = {
      id: roleId,
      name: role.name.trim() || roleId.toUpperCase(),
      description: role.description?.trim() || `Custom role ${role.name}`,
      badgeColor: role.badgeColor || {
        bg: "bg-indigo-500/10",
        text: "text-indigo-300",
        border: "border-indigo-500/30",
        dot: "bg-indigo-400",
      },
      isSystem: false,
      level: 1,
      createdAt: now,
      updatedAt: now,
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          INSERT INTO roles (id, name, description, badge_color, is_system, created_at, updated_at)
          VALUES (
            ${newRole.id},
            ${newRole.name},
            ${newRole.description},
            ${JSON.stringify(newRole.badgeColor)},
            ${newRole.isSystem},
            ${now},
            ${now}
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            badge_color = EXCLUDED.badge_color,
            updated_at = EXCLUDED.updated_at;
        `;
      } catch (err) {
        console.warn("[RolesService] DB insert role failed, saving locally:", err);
      }
    }

    this.loadStorage();
    this.localRoles.set(newRole.id, newRole);
    this.saveStorage();

    return newRole;
  }

  /**
   * Deletes a custom role (built-in system roles cannot be deleted).
   */
  static async deleteRole(id: string): Promise<boolean> {
    const roleId = this.normalizeRoleId(id);
    if (roleId === "admin" || roleId === "user" || BUILTIN_ROLES[roleId]?.isSystem) {
      throw new Error("Cannot delete built-in system role.");
    }

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`DELETE FROM role_menu_mappings WHERE role_id = ${roleId};`;
        await sql`DELETE FROM roles WHERE id = ${roleId} AND is_system = FALSE;`;
      } catch (err) {
        console.warn("[RolesService] DB delete role failed:", err);
      }
    }

    this.loadStorage();
    const deleted = this.localRoles.delete(roleId);

    // Clean up mapping references
    for (const [menuId, roleList] of this.localMappings.entries()) {
      this.localMappings.set(
        menuId,
        roleList.filter((r) => r !== roleId)
      );
    }
    this.saveStorage();

    return deleted;
  }

  /**
   * Retrieves current menu-to-role mappings.
   */
  static async getMenuMappings(): Promise<Record<string, string[]>> {
    const mappings: Record<string, string[]> = { ...DEFAULT_MENU_MAPPINGS };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT menu_item_id, role_id FROM role_menu_mappings;
        `) as { menu_item_id: string; role_id: string }[];

        if (rows.length > 0) {
          const dbMappings: Record<string, string[]> = {};
          for (const row of rows) {
            if (!dbMappings[row.menu_item_id]) {
              dbMappings[row.menu_item_id] = [];
            }
            dbMappings[row.menu_item_id].push(row.role_id);
          }
          for (const item of BASE_MENU_ITEMS) {
            if (dbMappings[item.id]) {
              mappings[item.id] = dbMappings[item.id];
            }
          }
          // Ensure system is strictly admin
          mappings.system = ["admin"];
          return mappings;
        }
      } catch (err) {
        console.warn("[RolesService] DB mapping query failed:", err);
      }
    }

    this.loadStorage();
    for (const [menuId, roleList] of this.localMappings.entries()) {
      mappings[menuId] = [...roleList];
    }
    mappings.system = ["admin"];
    return mappings;
  }

  /**
   * Updates menu item to role mappings.
   */
  static async updateMenuMappings(
    newMappings: Record<string, string[]>
  ): Promise<Record<string, string[]>> {
    // Ensure system menu is strictly admin-only
    const sanitizedMappings: Record<string, string[]> = {
      ...newMappings,
      system: ["admin"],
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        // Clear and rewrite mappings
        await sql`DELETE FROM role_menu_mappings;`;
        for (const [menuItemId, roleIds] of Object.entries(sanitizedMappings)) {
          for (const roleId of roleIds) {
            await sql`
              INSERT INTO role_menu_mappings (menu_item_id, role_id)
              VALUES (${menuItemId}, ${roleId})
              ON CONFLICT DO NOTHING;
            `;
          }
        }
      } catch (err) {
        console.warn("[RolesService] DB update mappings failed:", err);
      }
    }

    this.loadStorage();
    for (const [menuId, roleList] of Object.entries(sanitizedMappings)) {
      this.localMappings.set(menuId, [...roleList]);
    }
    this.saveStorage();

    return sanitizedMappings;
  }

  /**
   * Returns full MenuItem objects with their current allowedRoles.
   */
  static async getAllMenuItems(): Promise<MenuItem[]> {
    const mappings = await this.getMenuMappings();
    return BASE_MENU_ITEMS.map((item) => ({
      ...item,
      allowedRoles: mappings[item.id] || (item.id === "system" ? ["admin"] : ["admin"]),
    }));
  }

  /**
   * Returns the menu items accessible for a specific role.
   */
  static async getMenuItemsForRole(roleId?: string | null): Promise<MenuItem[]> {
    const normalized = this.normalizeRoleId(roleId);
    const allItems = await this.getAllMenuItems();
    return allItems.filter((item) => item.allowedRoles.includes(normalized));
  }

  /**
   * Checks whether a role has access to a specific menu item.
   */
  static async hasMenuAccess(
    roleId: string | null | undefined,
    menuItemId: string
  ): Promise<boolean> {
    const normalized = this.normalizeRoleId(roleId);
    const mappings = await this.getMenuMappings();
    const allowed = mappings[menuItemId] || [];
    return allowed.includes(normalized);
  }

  /**
   * Returns badge styling and role metadata.
   */
  static async getRoleBadgeInfo(roleId?: string | null): Promise<RoleDefinition> {
    const normalized = this.normalizeRoleId(roleId);
    const role = await this.getRole(normalized);
    if (role) return role;

    return {
      id: normalized,
      name: normalized.charAt(0).toUpperCase() + normalized.slice(1),
      description: "Custom role",
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

  /**
   * Normalizes role ID string.
   */
  static normalizeRoleId(role?: string | null): string {
    return normalizeRole(role);
  }
}
