import fs from "fs";
import path from "path";
import { Subscriber } from "./types";

interface StorageSchema {
  subscribers: Record<string, Subscriber>;
  notifiedDeployments: string[];
}

/**
 * Service for tracking bot chats/users and deployment notification history.
 * Uses persistent JSON storage when available, with in-memory caching for performance.
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
    this.loadStorage();
    return Array.from(this.subscribers.values()).filter((s) => s.isActive);
  }

  /**
   * Retrieves all registered subscribers (including inactive).
   */
  static async getAllSubscribers(): Promise<Subscriber[]> {
    this.loadStorage();
    return Array.from(this.subscribers.values());
  }

  /**
   * Checks whether a deployment ID has already been broadcasted.
   */
  static async hasNotifiedDeployment(deployId: string): Promise<boolean> {
    this.loadStorage();
    return this.notifiedDeployments.has(deployId);
  }

  /**
   * Records that a deployment notification was sent for a given deployment ID.
   */
  static async markDeploymentNotified(deployId: string): Promise<void> {
    this.loadStorage();
    this.notifiedDeployments.add(deployId);
    this.saveStorage();
  }
}
