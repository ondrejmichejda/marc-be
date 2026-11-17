import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ensureDb, isDbConfigured } from "../db";
import { TelegramService } from "../telegram/service";
import {
  TrackedItem,
  TrackerResetLog,
  CreateTrackerInput,
  UpdateTrackerInput,
  ResetTrackerInput,
  TrackersSummary,
} from "./types";

interface StorageSchema {
  trackers: Record<string, TrackedItem>;
  resets: Record<string, TrackerResetLog[]>;
}

export function calculateTotalDurationSeconds(
  days = 0,
  hours = 0,
  minutes = 0
): number {
  const safeDays = Math.max(0, Math.floor(Number(days) || 0));
  const safeHours = Math.max(0, Math.floor(Number(hours) || 0));
  const safeMinutes = Math.max(0, Math.floor(Number(minutes) || 0));
  return safeDays * 86400 + safeHours * 3600 + safeMinutes * 60;
}

export function computeTrackerMetrics(
  tracker: TrackedItem,
  now = new Date()
): TrackedItem {
  const lastResetTime = new Date(tracker.lastResetAt).getTime();
  const nowTime = now.getTime();
  const elapsedSeconds = Math.max(0, Math.floor((nowTime - lastResetTime) / 1000));
  const totalSec = Math.max(1, tracker.totalDurationSeconds);
  const remainingSeconds = Math.max(0, tracker.totalDurationSeconds - elapsedSeconds);
  const overflowSeconds = Math.max(0, elapsedSeconds - tracker.totalDurationSeconds);
  const rawProgress = (remainingSeconds / totalSec) * 100;
  const progressPercentage = Math.min(100, Math.max(0, Math.round(rawProgress * 10) / 10));
  const rawOverflow = (overflowSeconds / totalSec) * 100;
  const overflowPercentage = Math.max(0, Math.round(rawOverflow * 10) / 10);
  const isCompleted = elapsedSeconds >= tracker.totalDurationSeconds;

  return {
    ...tracker,
    elapsedSeconds,
    remainingSeconds,
    overflowSeconds,
    overflowPercentage,
    progressPercentage,
    isCompleted,
  };
}

function mapTrackerRow(row: Record<string, unknown>): TrackedItem {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name || ""),
    durationDays: Number(row.duration_days) || 0,
    durationHours: Number(row.duration_hours) || 0,
    durationMinutes: Number(row.duration_minutes) || 0,
    totalDurationSeconds: Number(row.total_duration_seconds) || 0,
    notifyTelegram: Boolean(row.notify_telegram),
    lastResetAt:
      row.last_reset_at instanceof Date
        ? row.last_reset_at.toISOString()
        : new Date(row.last_reset_at as string | number).toISOString(),
    notificationSentAt: row.notification_sent_at
      ? row.notification_sent_at instanceof Date
        ? row.notification_sent_at.toISOString()
        : new Date(row.notification_sent_at as string | number).toISOString()
      : undefined,
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

function mapResetRow(row: Record<string, unknown>): TrackerResetLog {
  return {
    id: String(row.id),
    trackerId: String(row.tracker_id),
    userId: String(row.user_id),
    resetAt:
      row.reset_at instanceof Date
        ? row.reset_at.toISOString()
        : new Date(row.reset_at as string | number).toISOString(),
    elapsedSeconds: Number(row.elapsed_seconds) || 0,
    note: row.note ? String(row.note) : undefined,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at as string | number).toISOString(),
  };
}

export class TrackingService {
  private static localTrackers = new Map<string, TrackedItem>();
  private static localResets = new Map<string, TrackerResetLog[]>();
  private static initialized = false;

  private static getStoragePath(): string {
    const dataDir = path.join(process.cwd(), "data");
    return path.join(dataDir, "trackers.json");
  }

  private static loadStorage(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const filePath = this.getStoragePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed: StorageSchema = JSON.parse(raw);
        if (parsed.trackers) {
          for (const [id, item] of Object.entries(parsed.trackers)) {
            this.localTrackers.set(id, item);
          }
        }
        if (parsed.resets) {
          for (const [id, logs] of Object.entries(parsed.resets)) {
            this.localResets.set(id, logs);
          }
        }
      }
    } catch (err) {
      console.warn(
        "[TrackingService] Could not read trackers file, using in-memory store:",
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
      const payload: StorageSchema = {
        trackers: Object.fromEntries(this.localTrackers),
        resets: Object.fromEntries(this.localResets),
      };
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
    } catch (err) {
      console.warn("[TrackingService] Could not persist trackers to file:", err);
    }
  }

  /**
   * Creates a new tracked item for a user.
   */
  static async createTracker(input: CreateTrackerInput): Promise<TrackedItem> {
    if (!input.userId || !input.userId.trim()) {
      throw new Error("Missing required field 'userId'.");
    }
    if (!input.name || !input.name.trim()) {
      throw new Error("Missing required field 'name'.");
    }

    const days = Math.max(0, Math.floor(Number(input.durationDays) || 0));
    const hours = Math.max(0, Math.floor(Number(input.durationHours) || 0));
    const minutes = Math.max(0, Math.floor(Number(input.durationMinutes) || 0));
    const totalDurationSeconds = calculateTotalDurationSeconds(days, hours, minutes);

    if (totalDurationSeconds <= 0) {
      throw new Error("Duration must be greater than 0 (set days, hours, or minutes).");
    }

    const id = `trk_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;
    const nowIso = new Date().toISOString();

    const newTracker: TrackedItem = {
      id,
      userId: input.userId.trim(),
      name: input.name.trim(),
      durationDays: days,
      durationHours: hours,
      durationMinutes: minutes,
      totalDurationSeconds,
      notifyTelegram: Boolean(input.notifyTelegram),
      lastResetAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          INSERT INTO trackers (
            id, user_id, name, duration_days, duration_hours, duration_minutes,
            total_duration_seconds, notify_telegram, last_reset_at, created_at, updated_at
          ) VALUES (
            ${newTracker.id},
            ${newTracker.userId},
            ${newTracker.name},
            ${newTracker.durationDays},
            ${newTracker.durationHours},
            ${newTracker.durationMinutes},
            ${newTracker.totalDurationSeconds},
            ${newTracker.notifyTelegram},
            ${newTracker.lastResetAt},
            ${newTracker.createdAt},
            ${newTracker.updatedAt}
          );
        `;
      } catch (err) {
        console.warn("[TrackingService] DB insert failed, using fallback storage:", err);
      }
    }

    this.loadStorage();
    this.localTrackers.set(id, newTracker);
    this.localResets.set(id, []);
    this.saveStorage();

    return computeTrackerMetrics(newTracker);
  }

  /**
   * Retrieves all trackers for a specific user with optional search and status filtering.
   */
  static async getTrackersByUser(
    userId: string,
    options?: {
      search?: string;
      status?: "active" | "completed" | "all";
    }
  ): Promise<TrackedItem[]> {
    if (!userId || !userId.trim()) {
      return [];
    }
    const cleanUserId = userId.trim();
    let trackers: TrackedItem[] = [];

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT id, user_id, name, duration_days, duration_hours, duration_minutes,
                 total_duration_seconds, notify_telegram, last_reset_at,
                 notification_sent_at, created_at, updated_at
          FROM trackers
          WHERE user_id = ${cleanUserId}
          ORDER BY created_at DESC;
        `) as Record<string, unknown>[];

        trackers = rows.map(mapTrackerRow);
      } catch (err) {
        console.warn("[TrackingService] DB list query failed, using fallback storage:", err);
        this.loadStorage();
        trackers = Array.from(this.localTrackers.values()).filter(
          (t) => t.userId === cleanUserId
        );
      }
    } else {
      this.loadStorage();
      trackers = Array.from(this.localTrackers.values()).filter(
        (t) => t.userId === cleanUserId
      );
    }

    const now = new Date();
    let computedList = trackers.map((t) => computeTrackerMetrics(t, now));

    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      computedList = computedList.filter((t) => t.name.toLowerCase().includes(q));
    }

    if (options?.status && options.status !== "all") {
      if (options.status === "completed") {
        computedList = computedList.filter((t) => Boolean(t.isCompleted));
      } else if (options.status === "active") {
        computedList = computedList.filter((t) => !t.isCompleted);
      }
    }

    // Attach recent reset count and logs preview
    for (const tracker of computedList) {
      const resets = await this.getResetLogs(tracker.id, cleanUserId);
      tracker.resetsCount = resets.length;
      tracker.recentResets = resets.slice(0, 3);
    }

    return computedList;
  }

  /**
   * Retrieves a single tracker by ID, enforcing user isolation.
   */
  static async getTrackerById(
    id: string,
    userId: string
  ): Promise<TrackedItem | null> {
    if (!id || !userId) return null;
    const cleanId = id.trim();
    const cleanUserId = userId.trim();

    let tracker: TrackedItem | null = null;

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT id, user_id, name, duration_days, duration_hours, duration_minutes,
                 total_duration_seconds, notify_telegram, last_reset_at,
                 notification_sent_at, created_at, updated_at
          FROM trackers
          WHERE id = ${cleanId} AND user_id = ${cleanUserId}
          LIMIT 1;
        `) as Record<string, unknown>[];

        if (rows.length > 0) {
          tracker = mapTrackerRow(rows[0]);
        }
      } catch (err) {
        console.warn("[TrackingService] DB getById failed, using fallback storage:", err);
        this.loadStorage();
        const local = this.localTrackers.get(cleanId);
        if (local && local.userId === cleanUserId) {
          tracker = local;
        }
      }
    } else {
      this.loadStorage();
      const local = this.localTrackers.get(cleanId);
      if (local && local.userId === cleanUserId) {
        tracker = local;
      }
    }

    if (!tracker) return null;

    const computed = computeTrackerMetrics(tracker);
    const resets = await this.getResetLogs(tracker.id, cleanUserId);
    computed.resetsCount = resets.length;
    computed.recentResets = resets;
    return computed;
  }

  /**
   * Updates an existing tracker.
   */
  static async updateTracker(
    id: string,
    userId: string,
    input: UpdateTrackerInput
  ): Promise<TrackedItem> {
    const existing = await this.getTrackerById(id, userId);
    if (!existing) {
      throw new Error(`Tracked item with id '${id}' not found or access denied.`);
    }

    const name = input.name !== undefined ? input.name.trim() : existing.name;
    if (!name) {
      throw new Error("Tracker name cannot be empty.");
    }

    const days = input.durationDays !== undefined ? Math.max(0, Math.floor(Number(input.durationDays) || 0)) : existing.durationDays;
    const hours = input.durationHours !== undefined ? Math.max(0, Math.floor(Number(input.durationHours) || 0)) : existing.durationHours;
    const minutes = input.durationMinutes !== undefined ? Math.max(0, Math.floor(Number(input.durationMinutes) || 0)) : existing.durationMinutes;
    const totalDurationSeconds = calculateTotalDurationSeconds(days, hours, minutes);

    if (totalDurationSeconds <= 0) {
      throw new Error("Duration must be greater than 0 (set days, hours, or minutes).");
    }

    const notifyTelegram = input.notifyTelegram !== undefined ? Boolean(input.notifyTelegram) : existing.notifyTelegram;
    const lastResetAt = input.lastResetAt ? new Date(input.lastResetAt).toISOString() : existing.lastResetAt;
    const updatedAt = new Date().toISOString();

    const updated: TrackedItem = {
      ...existing,
      name,
      durationDays: days,
      durationHours: hours,
      durationMinutes: minutes,
      totalDurationSeconds,
      notifyTelegram,
      lastResetAt,
      updatedAt,
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          UPDATE trackers
          SET name = ${updated.name},
              duration_days = ${updated.durationDays},
              duration_hours = ${updated.durationHours},
              duration_minutes = ${updated.durationMinutes},
              total_duration_seconds = ${updated.totalDurationSeconds},
              notify_telegram = ${updated.notifyTelegram},
              last_reset_at = ${updated.lastResetAt},
              updated_at = ${updated.updatedAt}
          WHERE id = ${updated.id} AND user_id = ${userId};
        `;
      } catch (err) {
        console.warn("[TrackingService] DB update failed, using fallback storage:", err);
      }
    }

    this.loadStorage();
    this.localTrackers.set(id, updated);
    this.saveStorage();

    return computeTrackerMetrics(updated);
  }

  /**
   * Resets a tracker's duration, creating a permanent reset log.
   */
  static async resetTracker(
    id: string,
    userId: string,
    input?: ResetTrackerInput
  ): Promise<{ tracker: TrackedItem; resetLog: TrackerResetLog }> {
    const existing = await this.getTrackerById(id, userId);
    if (!existing) {
      throw new Error(`Tracked item with id '${id}' not found or access denied.`);
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const lastResetTime = new Date(existing.lastResetAt).getTime();
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - lastResetTime) / 1000));

    const resetLogId = `rst_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;
    const resetLog: TrackerResetLog = {
      id: resetLogId,
      trackerId: existing.id,
      userId: existing.userId,
      resetAt: nowIso,
      elapsedSeconds,
      note: input?.note ? input.note.trim() : undefined,
      createdAt: nowIso,
    };

    const updatedTracker: TrackedItem = {
      ...existing,
      lastResetAt: nowIso,
      notificationSentAt: undefined,
      updatedAt: nowIso,
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          INSERT INTO tracker_reset_logs (
            id, tracker_id, user_id, reset_at, elapsed_seconds, note, created_at
          ) VALUES (
            ${resetLog.id},
            ${resetLog.trackerId},
            ${resetLog.userId},
            ${resetLog.resetAt},
            ${resetLog.elapsedSeconds},
            ${resetLog.note || null},
            ${resetLog.createdAt}
          );
        `;

        await sql`
          UPDATE trackers
          SET last_reset_at = ${updatedTracker.lastResetAt},
              notification_sent_at = NULL,
              updated_at = ${updatedTracker.updatedAt}
          WHERE id = ${updatedTracker.id} AND user_id = ${userId};
        `;
      } catch (err) {
        console.warn("[TrackingService] DB reset operation failed, using fallback storage:", err);
      }
    }

    this.loadStorage();
    this.localTrackers.set(id, updatedTracker);
    const existingLogs = this.localResets.get(id) || [];
    existingLogs.unshift(resetLog);
    this.localResets.set(id, existingLogs);
    this.saveStorage();

    const computed = computeTrackerMetrics(updatedTracker, now);
    computed.resetsCount = existingLogs.length;
    computed.recentResets = existingLogs;

    return {
      tracker: computed,
      resetLog,
    };
  }

  /**
   * Retrieves all reset logs for a given tracker.
   */
  static async getResetLogs(
    trackerId: string,
    userId: string
  ): Promise<TrackerResetLog[]> {
    if (!trackerId || !userId) return [];
    const cleanId = trackerId.trim();
    const cleanUserId = userId.trim();

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT id, tracker_id, user_id, reset_at, elapsed_seconds, note, created_at
          FROM tracker_reset_logs
          WHERE tracker_id = ${cleanId} AND user_id = ${cleanUserId}
          ORDER BY reset_at DESC;
        `) as Record<string, unknown>[];

        return rows.map(mapResetRow);
      } catch (err) {
        console.warn("[TrackingService] DB getResetLogs failed, using fallback:", err);
      }
    }

    this.loadStorage();
    const logs = this.localResets.get(cleanId) || [];
    return logs.filter((l) => l.userId === cleanUserId);
  }

  /**
   * Deletes a tracker and its associated reset logs.
   */
  static async deleteTracker(id: string, userId: string): Promise<boolean> {
    if (!id || !userId) return false;
    const cleanId = id.trim();
    const cleanUserId = userId.trim();

    const existing = await this.getTrackerById(cleanId, cleanUserId);
    if (!existing) return false;

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          DELETE FROM tracker_reset_logs
          WHERE tracker_id = ${cleanId} AND user_id = ${cleanUserId};
        `;
        await sql`
          DELETE FROM trackers
          WHERE id = ${cleanId} AND user_id = ${cleanUserId};
        `;
      } catch (err) {
        console.warn("[TrackingService] DB deleteTracker failed, using fallback:", err);
      }
    }

    this.loadStorage();
    this.localTrackers.delete(cleanId);
    this.localResets.delete(cleanId);
    this.saveStorage();
    return true;
  }

  /**
   * Returns a high-level summary of trackers for a user.
   */
  static async getSummary(userId: string): Promise<TrackersSummary> {
    const trackers = await this.getTrackersByUser(userId);
    let totalResets = 0;
    for (const t of trackers) {
      totalResets += t.resetsCount || 0;
    }

    return {
      total: trackers.length,
      active: trackers.filter((t) => !t.isCompleted).length,
      completed: trackers.filter((t) => Boolean(t.isCompleted)).length,
      telegramEnabled: trackers.filter((t) => t.notifyTelegram).length,
      totalResets,
    };
  }

  /**
   * Dispatches a Telegram completion notification for a tracker.
   */
  static async notifyTrackerTelegram(
    id: string,
    userId: string
  ): Promise<{ success: boolean; error?: string; messageId?: number }> {
    const tracker = await this.getTrackerById(id, userId);
    if (!tracker) {
      return { success: false, error: "Tracker not found or access denied." };
    }

    const targetDays = tracker.durationDays;
    const targetHours = tracker.durationHours;
    const targetMins = tracker.durationMinutes;
    const targetFormatted = `${targetDays > 0 ? `${targetDays}d ` : ""}${targetHours > 0 ? `${targetHours}h ` : ""}${targetMins}m`.trim() || "0m";

    const text =
      `🎉 *Tracker Completed:* \`${tracker.name}\`\n\n` +
      `⏱ *Duration Target Reached:* ${targetFormatted}\n` +
      `📊 *Status:* Completed (100%)\n` +
      `🔄 *Total Resets:* ${tracker.resetsCount || 0}\n` +
      `🕒 _Started / Last Reset:_ \`${new Date(tracker.lastResetAt).toLocaleString()}\``;

    const res = await TelegramService.sendResponseToUserById({
      userId,
      text,
    });

    if (res.success) {
      const nowIso = new Date().toISOString();
      if (isDbConfigured()) {
        try {
          const sql = await ensureDb();
          await sql`
            UPDATE trackers
            SET notification_sent_at = ${nowIso}
            WHERE id = ${tracker.id} AND user_id = ${userId};
          `;
        } catch {
          // ignore
        }
      }
      this.loadStorage();
      const local = this.localTrackers.get(id);
      if (local) {
        local.notificationSentAt = nowIso;
        this.saveStorage();
      }
    }

    return {
      success: res.success,
      error: res.error,
      messageId: res.messageId,
    };
  }

  /**
   * Background checker for expired / due trackers with notifyTelegram enabled.
   */
  static async checkAndSendDueNotifications(): Promise<{
    checked: number;
    sent: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    this.loadStorage();
    let allTrackers: TrackedItem[] = [];

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT id, user_id, name, duration_days, duration_hours, duration_minutes,
                 total_duration_seconds, notify_telegram, last_reset_at,
                 notification_sent_at, created_at, updated_at
          FROM trackers
          WHERE notify_telegram = TRUE;
        `) as Record<string, unknown>[];
        allTrackers = rows.map(mapTrackerRow);
      } catch {
        allTrackers = Array.from(this.localTrackers.values()).filter((t) => t.notifyTelegram);
      }
    } else {
      allTrackers = Array.from(this.localTrackers.values()).filter((t) => t.notifyTelegram);
    }

    const now = new Date();
    const result = {
      checked: allTrackers.length,
      sent: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    for (const tracker of allTrackers) {
      const computed = computeTrackerMetrics(tracker, now);
      if (computed.isCompleted && !tracker.notificationSentAt) {
        const notifyRes = await this.notifyTrackerTelegram(tracker.id, tracker.userId);
        if (notifyRes.success) {
          result.sent++;
        } else if (notifyRes.error) {
          result.errors.push({ id: tracker.id, error: notifyRes.error });
        }
      }
    }

    return result;
  }

  /**
   * Resets all in-memory/local storage for testing.
   */
  static async clearAll(): Promise<void> {
    this.localTrackers.clear();
    this.localResets.clear();
    this.initialized = true;

    try {
      const filePath = this.getStoragePath();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // ignore
    }

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`TRUNCATE TABLE tracker_reset_logs CASCADE;`;
        await sql`TRUNCATE TABLE trackers CASCADE;`;
      } catch {
        // ignore
      }
    }
  }
}
