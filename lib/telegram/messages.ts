import fs from "fs";
import path from "path";
import { ensureDb, isDbConfigured } from "../db";
import { MessageDirection, MessageLog } from "./types";

interface StorageSchema {
  messages: MessageLog[];
}

function mapMessageRow(row: Record<string, unknown>): MessageLog {
  let rawPayload: Record<string, unknown> | undefined;
  if (row.raw_payload) {
    if (typeof row.raw_payload === "string") {
      try {
        rawPayload = JSON.parse(row.raw_payload);
      } catch {
        rawPayload = undefined;
      }
    } else if (typeof row.raw_payload === "object") {
      rawPayload = row.raw_payload as Record<string, unknown>;
    }
  }

  return {
    id: typeof row.id === "bigint" || typeof row.id === "number" ? Number(row.id) : String(row.id),
    updateId: row.update_id ? Number(row.update_id) : undefined,
    messageId: row.message_id ? Number(row.message_id) : undefined,
    chatId: Number(row.chat_id),
    userId: row.user_id ? Number(row.user_id) : undefined,
    username: (row.username as string) || undefined,
    firstName: (row.first_name as string) || undefined,
    lastName: (row.last_name as string) || undefined,
    chatType: (row.chat_type as string) || "private",
    text: (row.text as string) || undefined,
    direction: (row.direction as MessageDirection) || "incoming",
    messageType: (row.message_type as string) || "text",
    rawPayload,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at as string | number).toISOString(),
  };
}

/**
 * Service for persisting and querying message logs in PostgreSQL (Neon DB)
 * with a fallback to local JSON file storage.
 */
export class MessageService {
  private static localMessages: MessageLog[] = [];
  private static initialized = false;

  private static getStoragePath(): string {
    const dataDir = path.join(process.cwd(), "data");
    return path.join(dataDir, "messages.json");
  }

  private static loadStorage(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const filePath = this.getStoragePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed: StorageSchema = JSON.parse(raw);
        if (Array.isArray(parsed.messages)) {
          this.localMessages = parsed.messages;
        }
      }
    } catch (err) {
      console.warn(
        "[MessageService] Warning: Could not read messages file, using in-memory store:",
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
      // Keep up to 1000 latest local messages to avoid excessive file size
      const serialized: StorageSchema = {
        messages: this.localMessages.slice(-1000),
      };

      fs.writeFileSync(filePath, JSON.stringify(serialized, null, 2), "utf-8");
    } catch (err) {
      console.warn(
        "[MessageService] Warning: Could not persist messages to file:",
        (err as Error).message
      );
    }
  }

  /**
   * Logs a message (incoming from user or outgoing from bot) into the database.
   */
  static async logMessage(params: {
    updateId?: number;
    messageId?: number;
    chatId: number;
    userId?: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    chatType?: string;
    text?: string;
    direction?: MessageDirection;
    messageType?: string;
    rawPayload?: unknown;
  }): Promise<MessageLog> {
    const direction = params.direction || "incoming";
    const messageType = params.messageType || "text";
    const chatType = params.chatType || "private";
    const serializedPayload =
      params.rawPayload !== undefined
        ? typeof params.rawPayload === "string"
          ? params.rawPayload
          : JSON.stringify(params.rawPayload)
        : null;

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = await sql`
          INSERT INTO messages (
            update_id,
            message_id,
            chat_id,
            user_id,
            username,
            first_name,
            last_name,
            chat_type,
            text,
            direction,
            message_type,
            raw_payload,
            created_at
          )
          VALUES (
            ${params.updateId ?? null},
            ${params.messageId ?? null},
            ${params.chatId},
            ${params.userId ?? null},
            ${params.username ?? null},
            ${params.firstName ?? null},
            ${params.lastName ?? null},
            ${chatType},
            ${params.text ?? null},
            ${direction},
            ${messageType},
            ${serializedPayload ? sql`${serializedPayload}::jsonb` : null},
            NOW()
          )
          RETURNING *;
        `;

        if (rows.length > 0) {
          return mapMessageRow(rows[0] as Record<string, unknown>);
        }
      } catch (err) {
        console.error(
          "[MessageService] Database error in logMessage, falling back to local store:",
          err
        );
      }
    }

    this.loadStorage();

    const fallbackLog: MessageLog = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      updateId: params.updateId,
      messageId: params.messageId,
      chatId: params.chatId,
      userId: params.userId,
      username: params.username,
      firstName: params.firstName,
      lastName: params.lastName,
      chatType,
      text: params.text,
      direction,
      messageType,
      rawPayload:
        params.rawPayload && typeof params.rawPayload === "object"
          ? (params.rawPayload as Record<string, unknown>)
          : undefined,
      createdAt: new Date().toISOString(),
    };

    this.localMessages.push(fallbackLog);
    this.saveStorage();

    return fallbackLog;
  }

  /**
   * Retrieves messages from the database or local storage with optional filtering.
   */
  static async listMessages(options?: {
    chatId?: number;
    userId?: number;
    direction?: MessageDirection;
    limit?: number;
    offset?: number;
  }): Promise<MessageLog[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        let rows: Array<Record<string, unknown>> = [];

        if (options?.chatId && options?.direction) {
          rows = (await sql`
            SELECT * FROM messages
            WHERE chat_id = ${options.chatId} AND direction = ${options.direction}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset};
          `) as Array<Record<string, unknown>>;
        } else if (options?.chatId) {
          rows = (await sql`
            SELECT * FROM messages
            WHERE chat_id = ${options.chatId}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset};
          `) as Array<Record<string, unknown>>;
        } else if (options?.userId) {
          rows = (await sql`
            SELECT * FROM messages
            WHERE user_id = ${options.userId}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset};
          `) as Array<Record<string, unknown>>;
        } else if (options?.direction) {
          rows = (await sql`
            SELECT * FROM messages
            WHERE direction = ${options.direction}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset};
          `) as Array<Record<string, unknown>>;
        } else {
          rows = (await sql`
            SELECT * FROM messages
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset};
          `) as Array<Record<string, unknown>>;
        }

        return rows.map(mapMessageRow);
      } catch (err) {
        console.error(
          "[MessageService] Database error in listMessages, falling back to local store:",
          err
        );
      }
    }

    this.loadStorage();

    let filtered = [...this.localMessages];

    if (options?.chatId) {
      filtered = filtered.filter((m) => m.chatId === options.chatId);
    }
    if (options?.userId) {
      filtered = filtered.filter((m) => m.userId === options.userId);
    }
    if (options?.direction) {
      filtered = filtered.filter((m) => m.direction === options.direction);
    }

    // Sort descending by creation date
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filtered.slice(offset, offset + limit);
  }
}
