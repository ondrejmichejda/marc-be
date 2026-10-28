import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ensureDb, isDbConfigured } from "../db";
import { User, GoogleProfile, AuthResult } from "./types";
import { UserRole, normalizeRole, DEFAULT_USER_ROLE } from "./roles";
import { signSessionToken } from "./crypto";
import { getGoogleAuthConfig } from "./config";

interface StorageSchema {
  users: Record<string, User>;
}

function mapUserRow(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name || ""),
    role: normalizeRole(row.role as string | null | undefined),
    picture: (row.picture as string) || undefined,
    googleId: (row.google_id as string) || undefined,
    emailVerified: Boolean(row.email_verified),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at as string | number).toISOString(),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : new Date(row.updated_at as string | number).toISOString(),
    lastLoginAt:
      row.last_login_at instanceof Date
        ? row.last_login_at.toISOString()
        : new Date(row.last_login_at as string | number).toISOString(),
  };
}

/**
 * Service for managing user authentication and registration via Gmail/Google.
 * Uses persistent PostgreSQL (Neon DB) when configured, with fallback to local JSON file storage.
 */
export class UserService {
  private static localUsers = new Map<string, User>();
  private static initialized = false;

  private static getStoragePath(): string {
    const dataDir = path.join(process.cwd(), "data");
    return path.join(dataDir, "users.json");
  }

  private static loadStorage(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const filePath = this.getStoragePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed: StorageSchema = JSON.parse(raw);
        if (parsed.users) {
          for (const [id, user] of Object.entries(parsed.users)) {
            this.localUsers.set(id, user);
          }
        }
      }
    } catch (err) {
      console.warn(
        "[UserService] Warning: Could not read users file, using in-memory store:",
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
      const serialized: StorageSchema = {
        users: Object.fromEntries(this.localUsers),
      };

      fs.writeFileSync(filePath, JSON.stringify(serialized, null, 2), "utf-8");
    } catch (err) {
      console.warn(
        "[UserService] Warning: Could not persist users to file:",
        (err as Error).message
      );
    }
  }

  /**
   * Finds a user by ID.
   */
  static async getUserById(id: string): Promise<User | null> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT * FROM users WHERE id = ${id} LIMIT 1;
        `) as Record<string, unknown>[];

        if (rows.length > 0) {
          return mapUserRow(rows[0]);
        }
        return null;
      } catch (err) {
        console.warn("[UserService] DB query failed, falling back to local store:", err);
      }
    }

    this.loadStorage();
    return this.localUsers.get(id) || null;
  }

  /**
   * Finds a user by email.
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT * FROM users WHERE LOWER(email) = ${normalizedEmail} LIMIT 1;
        `) as Record<string, unknown>[];

        if (rows.length > 0) {
          return mapUserRow(rows[0]);
        }
        return null;
      } catch (err) {
        console.warn("[UserService] DB query failed, falling back to local store:", err);
      }
    }

    this.loadStorage();
    for (const user of this.localUsers.values()) {
      if (user.email.toLowerCase() === normalizedEmail) {
        return user;
      }
    }
    return null;
  }

  /**
   * Finds a user by Google ID.
   */
  static async getUserByGoogleId(googleId: string): Promise<User | null> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT * FROM users WHERE google_id = ${googleId} LIMIT 1;
        `) as Record<string, unknown>[];

        if (rows.length > 0) {
          return mapUserRow(rows[0]);
        }
        return null;
      } catch (err) {
        console.warn("[UserService] DB query failed, falling back to local store:", err);
      }
    }

    this.loadStorage();
    for (const user of this.localUsers.values()) {
      if (user.googleId === googleId) {
        return user;
      }
    }
    return null;
  }

  /**
   * Registers a new user or logs in an existing user using Google profile information.
   */
  static async registerOrLoginGoogleUser(profile: GoogleProfile): Promise<AuthResult> {
    const normalizedEmail = profile.email.trim().toLowerCase();
    const now = new Date().toISOString();

    // Check if user already exists by Google ID or Email
    const user = (await this.getUserByGoogleId(profile.id)) || (await this.getUserByEmail(normalizedEmail));

    const config = getGoogleAuthConfig();

    if (user) {
      // Retain the role explicitly configured in the database / user record
      const assignedRole: UserRole = user.role || DEFAULT_USER_ROLE;

      // Update existing user details and last login
      const updatedUser: User = {
        ...user,
        name: profile.name || user.name,
        role: assignedRole,
        picture: profile.picture || user.picture,
        googleId: profile.id || user.googleId,
        emailVerified: profile.emailVerified || user.emailVerified,
        updatedAt: now,
        lastLoginAt: now,
      };

      if (isDbConfigured()) {
        try {
          const sql = await ensureDb();
          await sql`
            UPDATE users
            SET
              name = ${updatedUser.name},
              role = ${updatedUser.role},
              picture = ${updatedUser.picture || null},
              google_id = ${updatedUser.googleId || null},
              email_verified = ${updatedUser.emailVerified},
              updated_at = ${now},
              last_login_at = ${now}
            WHERE id = ${updatedUser.id};
          `;
        } catch (err) {
          console.warn("[UserService] DB update failed, saving locally:", err);
        }
      }

      this.loadStorage();
      this.localUsers.set(updatedUser.id, updatedUser);
      this.saveStorage();

      const token = signSessionToken(
        {
          userId: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          picture: updatedUser.picture,
        },
        config.authSecret,
        config.cookieMaxAgeSeconds
      );

      return {
        user: updatedUser,
        token,
        isNewUser: false,
      };
    }

    // Register brand new user with standard default role (administrator is set only in DB)
    const initialRole: UserRole = DEFAULT_USER_ROLE;
    const newUserId = `usr_${crypto.randomUUID()}`;
    const newUser: User = {
      id: newUserId,
      email: normalizedEmail,
      name: profile.name || normalizedEmail.split("@")[0],
      role: initialRole,
      picture: profile.picture,
      googleId: profile.id,
      emailVerified: profile.emailVerified,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          INSERT INTO users (
            id, email, name, role, picture, google_id, email_verified, created_at, updated_at, last_login_at
          ) VALUES (
            ${newUser.id},
            ${newUser.email},
            ${newUser.name},
            ${newUser.role},
            ${newUser.picture || null},
            ${newUser.googleId || null},
            ${newUser.emailVerified},
            ${newUser.createdAt},
            ${newUser.updatedAt},
            ${newUser.lastLoginAt}
          );
        `;
      } catch (err) {
        console.warn("[UserService] DB insert failed, saving locally:", err);
      }
    }

    this.loadStorage();
    this.localUsers.set(newUser.id, newUser);
    this.saveStorage();

    const token = signSessionToken(
      {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        picture: newUser.picture,
      },
      config.authSecret,
      config.cookieMaxAgeSeconds
    );

    return {
      user: newUser,
      token,
      isNewUser: true,
    };
  }

  /**
   * Returns total count of registered users.
   */
  static async countUsers(): Promise<number> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`SELECT COUNT(*)::int as count FROM users;`) as { count: number }[];
        if (rows.length > 0) {
          return Number(rows[0].count);
        }
      } catch (err) {
        console.warn("[UserService] DB count query failed, falling back to local store:", err);
      }
    }

    this.loadStorage();
    return this.localUsers.size;
  }

  /**
   * Updates a user's role (e.g. promoting to admin or operator).
   */
  static async updateUserRole(id: string, role: UserRole | string): Promise<User | null> {
    const normalizedRole = normalizeRole(role);
    const now = new Date().toISOString();

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          UPDATE users
          SET role = ${normalizedRole}, updated_at = ${now}
          WHERE id = ${id}
          RETURNING *;
        `) as Record<string, unknown>[];

        if (rows.length > 0) {
          const updated = mapUserRow(rows[0]);
          this.loadStorage();
          this.localUsers.set(updated.id, updated);
          this.saveStorage();
          return updated;
        }
      } catch (err) {
        console.warn("[UserService] DB update role failed, saving locally:", err);
      }
    }

    this.loadStorage();
    const user = this.localUsers.get(id);
    if (!user) return null;

    const updatedUser: User = {
      ...user,
      role: normalizedRole,
      updatedAt: now,
    };

    this.localUsers.set(id, updatedUser);
    this.saveStorage();
    return updatedUser;
  }

  /**
   * Lists registered users (e.g. for admin oversight or status overview).
   */
  static async listUsers(options: { limit?: number } = {}): Promise<User[]> {
    const limit = options.limit || 50;

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT * FROM users ORDER BY created_at DESC LIMIT ${limit};
        `) as Record<string, unknown>[];

        return rows.map(mapUserRow);
      } catch (err) {
        console.warn("[UserService] DB query failed, falling back to local store:", err);
      }
    }

    this.loadStorage();
    const users = Array.from(this.localUsers.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return users.slice(0, limit);
  }

  /**
   * Deletes a user by ID.
   */
  static async deleteUser(id: string): Promise<boolean> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`DELETE FROM users WHERE id = ${id};`;
      } catch (err) {
        console.warn("[UserService] DB delete failed:", err);
      }
    }

    this.loadStorage();
    const deleted = this.localUsers.delete(id);
    this.saveStorage();
    return deleted;
  }
}
