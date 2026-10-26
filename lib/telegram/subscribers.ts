import fs from "fs";
import path from "path";
import { ensureDb, isDbConfigured } from "../db";
import { Subscriber } from "./types";

interface StorageSchema {
  subscribers: Record<string, Subscriber>;
  notifiedDeployments: string[];
}

function mapSubscriberRow(row: Record<string, unknown>): Subscriber {
  return {
    chatId: Number(row.chat_id),
    userId:
      row.user_id !== null && row.user_id !== undefined
        ? Number(row.user_id)
        : undefined,
    username: (row.username as string) || undefined,
    firstName: (row.first_name as string) || undefined,
    lastName: (row.last_name as string) || undefined,
    chatType: (row.chat_type as string) || "private",
    isActive: Boolean(row.is_active),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at as string | number).toISOString(),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : new Date(row.updated_at as string | number).toISOString(),
  };
}

/**
 * Service for tracking bot chats/users and deployment notification history.
 * Uses persistent PostgreSQL (Neon DB) storage with fallback to local JSON storage.
 */
export class SubscriberService {
  private static subscribers = new Map<number, Subscriber>();
  private static notifiedDeployments = new Set<string>();
  private static initialized = false;

  private static getStoragePath(): string {
    const dataDir = path.join(process.cwd(), "data");
    return path.join(dataDir, "subscribers.json");
  }

  private static loadStorage(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const filePath = this.getStoragePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed: StorageSchema = JSON.parse(raw);

        if (parsed.subscribers) {
          for (const [key, sub] of Object.entries(parsed.subscribers)) {
            const chatId = Number(key);
            if (!Number.isNaN(chatId)) {
              this.subscribers.set(chatId, sub);
            }
          }
        }

        if (Array.isArray(parsed.notifiedDeployments)) {
          for (const depId of parsed.notifiedDeployments) {
            this.notifiedDeployments.add(depId);
          }
        }
      }
    } catch (err) {
      console.warn(
        "[SubscriberService] Warning: Could not read subscribers file, using in-memory store:",
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
        subscribers: Object.fromEntries(this.subscribers),
        notifiedDeployments: Array.from(this.notifiedDeployments),
      };

      fs.writeFileSync(filePath, JSON.stringify(serialized, null, 2), "utf-8");
    } catch (err) {
      console.warn(
        "[SubscriberService] Warning: Could not persist subscribers to file:",
        (err as Error).message
      );
    }
  }

  /**
   * Registers or updates a Telegram chat in the subscriber store.
   */
  static async registerChat(params: {
    chatId: number;
    userId?: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    chatType?: string;
  }): Promise<Subscriber> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = await sql`
          INSERT INTO subscribers (
            chat_id, user_id, username, first_name, last_name, chat_type, is_active, created_at, updated_at
          )
          VALUES (
            ${params.chatId},
            ${params.userId ?? null},
            ${params.username ?? null},
            ${params.firstName ?? null},
            ${params.lastName ?? null},
            ${params.chatType || "private"},
            TRUE,
            NOW(),
            NOW()
          )
          ON CONFLICT (chat_id) DO UPDATE SET
            user_id = COALESCE(EXCLUDED.user_id, subscribers.user_id),
            username = COALESCE(EXCLUDED.username, subscribers.username),
            first_name = COALESCE(EXCLUDED.first_name, subscribers.first_name),
            last_name = COALESCE(EXCLUDED.last_name, subscribers.last_name),
            chat_type = COALESCE(EXCLUDED.chat_type, subscribers.chat_type),
            is_active = TRUE,
            updated_at = NOW()
          RETURNING *;
        `;

        if (rows.length > 0) {
          return mapSubscriberRow(rows[0] as Record<string, unknown>);
        }
      } catch (err) {
        console.error(
          "[SubscriberService] Database error in registerChat, falling back to local store:",
          err
        );
      }
    }

    this.loadStorage();

    const existing = this.subscribers.get(params.chatId);
    const now = new Date().toISOString();

    const subscriber: Subscriber = {
      chatId: params.chatId,
      userId: params.userId || existing?.userId,
      username: params.username || existing?.username,
      firstName: params.firstName || existing?.firstName,
      lastName: params.lastName || existing?.lastName,
      chatType: params.chatType || existing?.chatType || "private",
      isActive: true,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.subscribers.set(params.chatId, subscriber);
    this.saveStorage();

    return subscriber;
  }

  /**
   * Marks a subscriber chat as inactive (e.g. if the user blocked the bot).
   */
  static async deactivateChat(chatId: number): Promise<void> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          UPDATE subscribers
          SET is_active = FALSE, updated_at = NOW()
          WHERE chat_id = ${chatId};
        `;
        console.log(`[SubscriberService] Deactivated chat ID in DB: ${chatId}`);
        return;
      } catch (err) {
        console.error(
          "[SubscriberService] Database error in deactivateChat, falling back to local store:",
          err
        );
      }
    }

    this.loadStorage();

    const existing = this.subscribers.get(chatId);
    if (existing) {
      existing.isActive = false;
      existing.updatedAt = new Date().toISOString();
      this.subscribers.set(chatId, existing);
      this.saveStorage();
      console.log(`[SubscriberService] Deactivated chat ID: ${chatId}`);
    }
  }

  /**
   * Retrieves all active subscribers.
   */
  static async getActiveSubscribers(): Promise<Subscriber[]> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = await sql`
          SELECT * FROM subscribers
          WHERE is_active = TRUE
          ORDER BY created_at ASC;
        `;
        return (rows as Array<Record<string, unknown>>).map(mapSubscriberRow);
      } catch (err) {
        console.error(
          "[SubscriberService] Database error in getActiveSubscribers, falling back to local store:",
          err
        );
      }
    }

    this.loadStorage();
    return Array.from(this.subscribers.values()).filter((s) => s.isActive);
  }

  /**
   * Retrieves all registered subscribers (including inactive).
   */
  static async getAllSubscribers(): Promise<Subscriber[]> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = await sql`
          SELECT * FROM subscribers
          ORDER BY created_at ASC;
        `;
        return (rows as Array<Record<string, unknown>>).map(mapSubscriberRow);
      } catch (err) {
        console.error(
          "[SubscriberService] Database error in getAllSubscribers, falling back to local store:",
          err
        );
      }
    }

    this.loadStorage();
    return Array.from(this.subscribers.values());
  }

  /**
   * Checks whether a deployment ID has already been broadcasted.
   */
  static async hasNotifiedDeployment(deployId: string): Promise<boolean> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = await sql`
          SELECT 1 FROM notified_deployments
          WHERE deploy_id = ${deployId}
          LIMIT 1;
        `;
        return rows.length > 0;
      } catch (err) {
        console.error(
          "[SubscriberService] Database error in hasNotifiedDeployment, falling back to local store:",
          err
        );
      }
    }

    this.loadStorage();
    return this.notifiedDeployments.has(deployId);
  }

  /**
   * Records that a deployment notification was sent for a given deployment ID.
   */
  static async markDeploymentNotified(deployId: string): Promise<void> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          INSERT INTO notified_deployments (deploy_id, created_at)
          VALUES (${deployId}, NOW())
          ON CONFLICT (deploy_id) DO NOTHING;
        `;
        return;
      } catch (err) {
        console.error(
          "[SubscriberService] Database error in markDeploymentNotified, falling back to local store:",
          err
        );
      }
    }

    this.loadStorage();
    this.notifiedDeployments.add(deployId);
    this.saveStorage();
  }
}
