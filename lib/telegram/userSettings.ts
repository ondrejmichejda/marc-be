import fs from "fs";
import path from "path";
import { ensureDb, isDbConfigured } from "../db";
import { getTelegramConfig, isTelegramConfigured } from "./config";

export interface UserTelegramSettings {
  userId: string;
  telegramId?: string;
  telegramUsername?: string;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserTelegramSettingsInput {
  telegramId?: string | number;
  telegramUsername?: string;
  notificationsEnabled?: boolean;
}

export interface UserTelegramConfigStatus {
  userId: string;
  isConfigured: boolean;
  telegramId?: string;
  telegramUsername?: string;
  notificationsEnabled: boolean;
  botUsername?: string;
}

interface StorageSchema {
  settings: Record<string, UserTelegramSettings>;
}

function mapSettingsRow(row: Record<string, unknown>): UserTelegramSettings {
  return {
    userId: String(row.user_id),
    telegramId: row.telegram_id ? String(row.telegram_id) : undefined,
    telegramUsername: row.telegram_username ? String(row.telegram_username) : undefined,
    notificationsEnabled:
      row.notifications_enabled !== undefined ? Boolean(row.notifications_enabled) : true,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date((row.created_at as string | number) || Date.now()).toISOString(),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : new Date((row.updated_at as string | number) || Date.now()).toISOString(),
  };
}

/**
 * Service for managing per-user personal Telegram configuration.
 * Stores user's personal Telegram ID for direct, reliable communication via Johan bot.
 * Supports PostgreSQL with Neon and local JSON file storage fallback.
 */
export class UserTelegramSettingsService {
  private static localSettings = new Map<string, UserTelegramSettings>();
  private static initialized = false;

  private static getStoragePath(): string {
    const dataDir = path.join(process.cwd(), "data");
    return path.join(dataDir, "user_telegram_settings.json");
  }

  private static loadStorage(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const filePath = this.getStoragePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed: StorageSchema = JSON.parse(raw);
        if (parsed.settings) {
          for (const [id, setting] of Object.entries(parsed.settings)) {
            this.localSettings.set(id, setting);
          }
        }
      }
    } catch (err) {
      console.warn(
        "[UserTelegramSettingsService] Warning: Could not read settings file, using in-memory store:",
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
        settings: Object.fromEntries(this.localSettings),
      };

      fs.writeFileSync(filePath, JSON.stringify(serialized, null, 2), "utf-8");
    } catch (err) {
      console.warn(
        "[UserTelegramSettingsService] Warning: Could not persist settings to file:",
        (err as Error).message
      );
    }
  }

  /**
   * Retrieves user's raw Telegram settings.
   */
  static async getSettings(userId: string): Promise<UserTelegramSettings | null> {
    if (!userId) return null;

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT * FROM user_telegram_settings
          WHERE user_id = ${userId}
          LIMIT 1;
        `) as Record<string, unknown>[];

        if (rows.length > 0) {
          const setting = mapSettingsRow(rows[0]);
          this.loadStorage();
          this.localSettings.set(userId, setting);
          return setting;
        }
        return null;
      } catch (err) {
        console.warn(
          "[UserTelegramSettingsService] DB query failed, falling back to local store:",
          (err as Error).message
        );
      }
    }

    this.loadStorage();
    return this.localSettings.get(userId) || null;
  }

  /**
   * Retrieves client-facing Telegram configuration status for a user.
   */
  static async getUserTelegramConfig(userId: string): Promise<UserTelegramConfigStatus> {
    const setting = await this.getSettings(userId);
    let botUsername = "johan_bot";

    if (isTelegramConfigured()) {
      try {
        const tgConfig = getTelegramConfig();
        if ((tgConfig as { botUsername?: string }).botUsername) {
          botUsername = (tgConfig as { botUsername?: string }).botUsername!;
        }
      } catch {}
    }

    if (!setting || !setting.telegramId) {
      return {
        userId,
        isConfigured: false,
        notificationsEnabled: setting ? setting.notificationsEnabled : true,
        botUsername,
      };
    }

    return {
      userId,
      isConfigured: Boolean(setting.telegramId && setting.telegramId.trim().length > 0),
      telegramId: setting.telegramId,
      telegramUsername: setting.telegramUsername,
      notificationsEnabled: setting.notificationsEnabled,
      botUsername,
    };
  }

  /**
   * Saves or updates a user's Telegram configuration.
   */
  static async saveSettings(
    userId: string,
    input: UserTelegramSettingsInput
  ): Promise<UserTelegramSettings> {
    const existing = await this.getSettings(userId);
    const nowIso = new Date().toISOString();

    let cleanTelegramId: string | undefined = undefined;
    if (input.telegramId !== undefined && input.telegramId !== null) {
      const str = String(input.telegramId).trim();
      if (str.length > 0) {
        cleanTelegramId = str;
      }
    } else if (existing?.telegramId) {
      cleanTelegramId = existing.telegramId;
    }

    let cleanUsername: string | undefined = undefined;
    if (input.telegramUsername !== undefined && input.telegramUsername !== null) {
      const u = input.telegramUsername.trim().replace(/^@/, "");
      if (u.length > 0) {
        cleanUsername = u;
      }
    } else if (existing?.telegramUsername) {
      cleanUsername = existing.telegramUsername;
    }

    const notificationsEnabled =
      input.notificationsEnabled !== undefined
        ? Boolean(input.notificationsEnabled)
        : existing !== null
        ? existing.notificationsEnabled
        : true;

    const setting: UserTelegramSettings = {
      userId,
      telegramId: cleanTelegramId,
      telegramUsername: cleanUsername,
      notificationsEnabled,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          INSERT INTO user_telegram_settings (
            user_id,
            telegram_id,
            telegram_username,
            notifications_enabled,
            created_at,
            updated_at
          ) VALUES (
            ${setting.userId},
            ${setting.telegramId || null},
            ${setting.telegramUsername || null},
            ${setting.notificationsEnabled},
            ${setting.createdAt},
            ${setting.updatedAt}
          )
          ON CONFLICT (user_id) DO UPDATE SET
            telegram_id = EXCLUDED.telegram_id,
            telegram_username = EXCLUDED.telegram_username,
            notifications_enabled = EXCLUDED.notifications_enabled,
            updated_at = EXCLUDED.updated_at;
        `;
      } catch (err) {
        console.warn(
          "[UserTelegramSettingsService] DB insert/update failed, saving locally:",
          (err as Error).message
        );
      }
    }

    this.loadStorage();
    this.localSettings.set(userId, setting);
    this.saveStorage();

    return setting;
  }

  /**
   * Deletes / resets personal Telegram configuration for a user.
   */
  static async deleteSettings(userId: string): Promise<boolean> {
    if (!userId) return false;

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`DELETE FROM user_telegram_settings WHERE user_id = ${userId};`;
      } catch (err) {
        console.warn(
          "[UserTelegramSettingsService] DB delete failed, updating local store:",
          (err as Error).message
        );
      }
    }

    this.loadStorage();
    const existed = this.localSettings.delete(userId);
    this.saveStorage();

    return existed;
  }

  /**
   * Gets the configured Telegram ID for a user.
   */
  static async getTelegramIdForUser(userId: string): Promise<string | null> {
    const setting = await this.getSettings(userId);
    if (setting && setting.telegramId && setting.notificationsEnabled) {
      return setting.telegramId;
    }
    return null;
  }

  /**
   * Clears all in-memory and persisted Telegram settings (primarily for test harness).
   */
  static async clearAll(): Promise<void> {
    this.loadStorage();
    this.localSettings.clear();
    this.saveStorage();

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`DELETE FROM user_telegram_settings;`;
      } catch (err) {
        console.warn("[UserTelegramSettingsService] DB clear failed:", (err as Error).message);
      }
    }
  }
}
