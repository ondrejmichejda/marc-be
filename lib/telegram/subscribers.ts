import fs from "fs";
import path from "path";
import { ensureDb, isDbConfigured } from "../db";
import { Subscriber } from "./types";

interface StorageSchema {
  subscribers: Record<string, Subscriber>;
  notifiedDeployments: string[];
}

/**
 * Normalizes a name string for robust, accent-insensitive and case-insensitive comparison.
 */
export function normalizeNameForMatch(name?: string | null): string {
  if (!name || typeof name !== "string") return "";
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Splits a full name string into firstName and lastName components.
 */
export function parseFullName(fullName?: string | null): { firstName: string; lastName: string } {
  if (!fullName || typeof fullName !== "string") {
    return { firstName: "", lastName: "" };
  }
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

/**
 * Determines whether a Subscriber record matches the provided name and surname / full name.
 */
export function isSubscriberNameMatch(
  subscriber: Subscriber,
  nameOrFirstName?: string | null,
  surnameOrLastName?: string | null
): boolean {
  if (!subscriber) return false;

  const subFirst = normalizeNameForMatch(subscriber.firstName);
  const subLast = normalizeNameForMatch(subscriber.lastName);
  const subFull = normalizeNameForMatch(`${subscriber.firstName || ""} ${subscriber.lastName || ""}`);
  const subUsername = normalizeNameForMatch(subscriber.username);

  // If both firstName and lastName are explicitly provided
  if (nameOrFirstName && surnameOrLastName) {
    const qFirst = normalizeNameForMatch(nameOrFirstName);
    const qLast = normalizeNameForMatch(surnameOrLastName);
    const qFull = normalizeNameForMatch(`${nameOrFirstName} ${surnameOrLastName}`);

    if (!qFirst && !qLast) return false;

    // 1. Direct match: sub.first == qFirst && sub.last == qLast
    if (subFirst === qFirst && subLast === qLast) return true;

    // 2. Reversed match: sub.first == qLast && sub.last == qFirst
    if (subFirst === qLast && subLast === qFirst) return true;

    // 3. Combined full string match
    if (subFull === qFull) return true;

    // 4. One component empty in subscriber, but full matches
    if ((!subLast && subFirst === qFull) || (!subFirst && subLast === qFull)) return true;

    return false;
  }

  // If a single name / full name string is provided
  const input = nameOrFirstName || surnameOrLastName || "";
  const normInput = normalizeNameForMatch(input);
  if (!normInput) return false;

  // Direct full name match
  if (subFull === normInput) return true;
  if (subFirst === normInput && !subLast) return true;
  if (subUsername && subUsername === normInput) return true;

  // Try parsing the input into parts
  const parsed = parseFullName(input);
  if (parsed.firstName && parsed.lastName) {
    const pFirst = normalizeNameForMatch(parsed.firstName);
    const pLast = normalizeNameForMatch(parsed.lastName);
    if (subFirst === pFirst && subLast === pLast) return true;
    if (subFirst === pLast && subLast === pFirst) return true;
    if (subFull === normalizeNameForMatch(`${parsed.firstName} ${parsed.lastName}`)) return true;
  }

  return false;
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
   * Finds the first active Telegram subscriber matching given name and surname.
   */
  static async findSubscriberByNameAndSurname(
    nameOrFirstName: string,
    surnameOrLastName?: string
  ): Promise<Subscriber | null> {
    const matches = await this.findSubscribersByNameAndSurname(nameOrFirstName, surnameOrLastName);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Finds all active Telegram subscribers matching given name and surname.
   */
  static async findSubscribersByNameAndSurname(
    nameOrFirstName: string,
    surnameOrLastName?: string
  ): Promise<Subscriber[]> {
    if (!nameOrFirstName && !surnameOrLastName) {
      return [];
    }

    const subscribers = await this.getActiveSubscribers();
    return subscribers.filter((sub) =>
      isSubscriberNameMatch(sub, nameOrFirstName, surnameOrLastName)
    );
  }

  /**
   * Finds an active subscriber by full name string.
   */
  static async findSubscriberByFullName(fullName: string): Promise<Subscriber | null> {
    if (!fullName || !fullName.trim()) return null;
    const subscribers = await this.getActiveSubscribers();
    const match = subscribers.find((sub) => isSubscriberNameMatch(sub, fullName));
    return match || null;
  }

  /**
   * Matches an active Telegram subscriber for a system user entity or identifier.
   * Matches by name/surname, full name, or user email/id where possible.
   */
  static async matchSubscriberForUser(
    userOrIdentifier: { id?: string; name?: string; email?: string } | string
  ): Promise<Subscriber | null> {
    if (!userOrIdentifier) return null;

    let targetName: string | undefined;
    let targetEmail: string | undefined;

    if (typeof userOrIdentifier === "string") {
      targetName = userOrIdentifier;
    } else {
      targetName = userOrIdentifier.name;
      targetEmail = userOrIdentifier.email;
    }

    // 1. Try matching by full name / name & surname if available
    if (targetName && targetName.trim()) {
      const parsed = parseFullName(targetName);
      if (parsed.firstName && parsed.lastName) {
        const match = await this.findSubscriberByNameAndSurname(parsed.firstName, parsed.lastName);
        if (match) return match;
      }
      const match = await this.findSubscriberByFullName(targetName);
      if (match) return match;
    }

    // 2. If email provided, check if email prefix matches subscriber username or name
    if (targetEmail && targetEmail.includes("@")) {
      const prefix = targetEmail.split("@")[0].replace(/[._-]/g, " ");
      const parsedPrefix = parseFullName(prefix);
      if (parsedPrefix.firstName && parsedPrefix.lastName) {
        const match = await this.findSubscriberByNameAndSurname(
          parsedPrefix.firstName,
          parsedPrefix.lastName
        );
        if (match) return match;
      }
    }

    return null;
  }

  /**
   * Resets local subscriber storage (primarily for automated tests).
   */
  static async clearAll(): Promise<void> {
    this.subscribers.clear();
    this.notifiedDeployments.clear();
    this.initialized = true;

    try {
      const filePath = this.getStoragePath();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignore file deletion errors during testing
    }
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
