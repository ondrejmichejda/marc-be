import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ensureDb, isDbConfigured } from "../db";
import {
  WaitingPeriod,
  WAITING_PERIOD_OPTIONS,
  WishItem,
  CreateWishInput,
  UpdateWishInput,
  WishesSummary,
} from "./types";

interface StorageSchema {
  wishes: Record<string, WishItem>;
}

export function normalizeWaitingPeriod(period?: string | null): WaitingPeriod {
  if (!period) return "1week";
  const cleaned = period.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (cleaned === "2weeks" || cleaned === "2week" || cleaned === "2w") {
    return "2weeks";
  }
  if (cleaned === "1month" || cleaned === "1months" || cleaned === "1m") {
    return "1month";
  }
  return "1week";
}

export function getWaitingPeriodDays(period: WaitingPeriod): number {
  const match = WAITING_PERIOD_OPTIONS.find((opt) => opt.value === period);
  return match ? match.days : 7;
}

export function computeWishMetrics(wish: WishItem, now = new Date()): WishItem {
  const daysTotal = getWaitingPeriodDays(wish.waitingPeriod);
  const createdTime = new Date(wish.createdAt).getTime();
  const nowTime = now.getTime();
  const totalDurationMs = daysTotal * 86400 * 1000;
  const targetTime = createdTime + totalDurationMs;
  const targetDate = new Date(targetTime).toISOString();

  const elapsedMs = Math.max(0, nowTime - createdTime);
  const daysElapsed = Math.floor(elapsedMs / (86400 * 1000));
  const remainingMs = Math.max(0, targetTime - nowTime);
  const daysRemaining = Math.ceil(remainingMs / (86400 * 1000));
  const isPeriodCompleted = nowTime >= targetTime;

  const rawPeriodProgress = (elapsedMs / totalDurationMs) * 100;
  const periodProgressPercentage = Math.min(100, Math.max(0, Math.round(rawPeriodProgress * 10) / 10));

  const isCounterReached = wish.counter >= wish.maxCounter;
  const rawCounterProgress = wish.maxCounter > 0 ? (wish.counter / wish.maxCounter) * 100 : 100;
  const counterProgressPercentage = Math.min(100, Math.max(0, Math.round(rawCounterProgress * 10) / 10));

  return {
    ...wish,
    targetDate,
    daysTotal,
    daysElapsed,
    daysRemaining,
    isPeriodCompleted,
    periodProgressPercentage,
    isCounterReached,
    counterProgressPercentage,
  };
}

function mapWishRow(row: Record<string, unknown>): WishItem {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name || ""),
    description: String(row.description || ""),
    waitingPeriod: normalizeWaitingPeriod(row.waiting_period as string),
    counter: Number(row.counter) || 0,
    maxCounter: Math.max(1, Number(row.max_counter) || 5),
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

export class WishListService {
  private static localWishes = new Map<string, WishItem>();
  private static initialized = false;

  private static getStoragePath(): string {
    const dataDir = path.join(process.cwd(), "data");
    return path.join(dataDir, "wishes.json");
  }

  private static initLocalStore(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const filePath = this.getStoragePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw) as StorageSchema;
        if (parsed.wishes) {
          for (const [id, item] of Object.entries(parsed.wishes)) {
            this.localWishes.set(id, item);
          }
        }
      }
    } catch (err) {
      console.warn("[WishListService] Failed to read local storage:", err);
    }
  }

  private static saveLocalStore(): void {
    try {
      const filePath = this.getStoragePath();
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const payload: StorageSchema = {
        wishes: Object.fromEntries(this.localWishes.entries()),
      };

      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
    } catch (err) {
      console.error("[WishListService] Failed to persist local storage:", err);
    }
  }

  static async createWish(input: CreateWishInput): Promise<WishItem> {
    const now = new Date();
    const id = `wish_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const name = (input.name || "").trim();
    if (!name) {
      throw new Error("Wish name is required and cannot be empty.");
    }

    const description = (input.description || "").trim();
    const waitingPeriod = normalizeWaitingPeriod(input.waitingPeriod);
    const counter = Math.max(0, Math.floor(Number(input.counter) || 0));
    const maxCounter = Math.max(1, Math.floor(Number(input.maxCounter) || 5));
    const createdAt = input.createdAt ? new Date(input.createdAt).toISOString() : now.toISOString();
    const updatedAt = now.toISOString();

    const wish: WishItem = {
      id,
      userId: input.userId,
      name,
      description,
      waitingPeriod,
      counter,
      maxCounter,
      createdAt,
      updatedAt,
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          INSERT INTO wishes (
            id, user_id, name, description, waiting_period, counter, max_counter, created_at, updated_at
          ) VALUES (
            ${wish.id}, ${wish.userId}, ${wish.name}, ${wish.description},
            ${wish.waitingPeriod}, ${wish.counter}, ${wish.maxCounter},
            ${wish.createdAt}, ${wish.updatedAt}
          );
        `;
        return computeWishMetrics(wish);
      } catch (err) {
        console.warn("[WishListService] DB insert failed, falling back to local:", err);
      }
    }

    this.initLocalStore();
    this.localWishes.set(wish.id, wish);
    this.saveLocalStore();

    return computeWishMetrics(wish);
  }

  static async getWishesByUser(
    userId: string,
    filters?: {
      search?: string;
      status?: "all" | "waiting" | "ready" | "completed";
    }
  ): Promise<WishItem[]> {
    let rawWishes: WishItem[] = [];

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        let rows: Record<string, unknown>[];

        if (userId === "all" || userId === "admin") {
          rows = (await sql`
            SELECT * FROM wishes ORDER BY created_at DESC;
          `) as Record<string, unknown>[];
        } else {
          rows = (await sql`
            SELECT * FROM wishes WHERE user_id = ${userId} ORDER BY created_at DESC;
          `) as Record<string, unknown>[];
        }

        rawWishes = rows.map(mapWishRow);
      } catch (err) {
        console.warn("[WishListService] DB query failed, falling back to local:", err);
        rawWishes = this.getLocalWishesByUser(userId);
      }
    } else {
      rawWishes = this.getLocalWishesByUser(userId);
    }

    const now = new Date();
    let wishes = rawWishes.map((w) => computeWishMetrics(w, now));

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      wishes = wishes.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.description.toLowerCase().includes(q)
      );
    }

    if (filters?.status && filters.status !== "all") {
      if (filters.status === "completed") {
        wishes = wishes.filter((w) => w.isCounterReached);
      } else if (filters.status === "ready") {
        wishes = wishes.filter((w) => w.isPeriodCompleted);
      } else if (filters.status === "waiting") {
        wishes = wishes.filter((w) => !w.isPeriodCompleted);
      }
    }

    return wishes;
  }

  private static getLocalWishesByUser(userId: string): WishItem[] {
    this.initLocalStore();
    const result: WishItem[] = [];
    for (const wish of this.localWishes.values()) {
      if (userId === "all" || userId === "admin" || wish.userId === userId) {
        result.push({ ...wish });
      }
    }
    return result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
        b.id.localeCompare(a.id)
    );
  }

  static async getWishById(id: string, userId?: string): Promise<WishItem | null> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT * FROM wishes WHERE id = ${id} LIMIT 1;
        `) as Record<string, unknown>[];

        if (rows.length === 0) return null;
        const wish = mapWishRow(rows[0]);
        if (userId && userId !== "admin" && wish.userId !== userId) {
          return null;
        }
        return computeWishMetrics(wish);
      } catch (err) {
        console.warn("[WishListService] DB getById failed, using local:", err);
      }
    }

    this.initLocalStore();
    const wish = this.localWishes.get(id);
    if (!wish) return null;
    if (userId && userId !== "admin" && wish.userId !== userId) {
      return null;
    }
    return computeWishMetrics({ ...wish });
  }

  static async updateWish(
    id: string,
    input: UpdateWishInput,
    userId?: string
  ): Promise<WishItem | null> {
    const existing = await this.getWishById(id, userId);
    if (!existing) return null;

    const name = input.name !== undefined ? input.name.trim() : existing.name;
    if (!name) {
      throw new Error("Wish name cannot be empty.");
    }

    const description =
      input.description !== undefined ? input.description.trim() : existing.description;
    const waitingPeriod =
      input.waitingPeriod !== undefined
        ? normalizeWaitingPeriod(input.waitingPeriod)
        : existing.waitingPeriod;
    const counter =
      input.counter !== undefined
        ? Math.max(0, Math.floor(Number(input.counter) || 0))
        : existing.counter;
    const maxCounter =
      input.maxCounter !== undefined
        ? Math.max(1, Math.floor(Number(input.maxCounter) || 1))
        : existing.maxCounter;
    const updatedAt = new Date().toISOString();

    const updated: WishItem = {
      ...existing,
      name,
      description,
      waitingPeriod,
      counter,
      maxCounter,
      updatedAt,
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          UPDATE wishes
          SET
            name = ${updated.name},
            description = ${updated.description},
            waiting_period = ${updated.waitingPeriod},
            counter = ${updated.counter},
            max_counter = ${updated.maxCounter},
            updated_at = ${updated.updatedAt}
          WHERE id = ${id};
        `;
        return computeWishMetrics(updated);
      } catch (err) {
        console.warn("[WishListService] DB update failed, using local:", err);
      }
    }

    this.initLocalStore();
    this.localWishes.set(id, updated);
    this.saveLocalStore();

    return computeWishMetrics(updated);
  }

  static async incrementCounter(
    id: string,
    userId?: string,
    amount = 1
  ): Promise<WishItem | null> {
    const existing = await this.getWishById(id, userId);
    if (!existing) return null;

    const newCounter = Math.max(0, existing.counter + Math.floor(amount));
    const updatedAt = new Date().toISOString();

    const updated: WishItem = {
      ...existing,
      counter: newCounter,
      updatedAt,
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          UPDATE wishes
          SET
            counter = ${updated.counter},
            updated_at = ${updated.updatedAt}
          WHERE id = ${id};
        `;
        return computeWishMetrics(updated);
      } catch (err) {
        console.warn("[WishListService] DB increment failed, using local:", err);
      }
    }

    this.initLocalStore();
    this.localWishes.set(id, updated);
    this.saveLocalStore();

    return computeWishMetrics(updated);
  }

  static async deleteWish(id: string, userId?: string): Promise<boolean> {
    const existing = await this.getWishById(id, userId);
    if (!existing) return false;

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`DELETE FROM wishes WHERE id = ${id};`;
      } catch (err) {
        console.warn("[WishListService] DB delete failed, using local:", err);
      }
    }

    this.initLocalStore();
    const removed = this.localWishes.delete(id);
    this.saveLocalStore();

    return removed || true;
  }

  static async getSummary(userId: string): Promise<WishesSummary> {
    const wishes = await this.getWishesByUser(userId);
    let waiting = 0;
    let ready = 0;
    let completed = 0;

    for (const w of wishes) {
      if (w.isPeriodCompleted) {
        ready++;
      } else {
        waiting++;
      }
      if (w.isCounterReached) {
        completed++;
      }
    }

    return {
      total: wishes.length,
      waiting,
      ready,
      completed,
    };
  }

  static async clearAll(): Promise<void> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`DELETE FROM wishes;`;
      } catch (err) {
        console.warn("[WishListService] DB clearAll failed:", err);
      }
    }

    this.initLocalStore();
    this.localWishes.clear();
    this.saveLocalStore();
  }
}
