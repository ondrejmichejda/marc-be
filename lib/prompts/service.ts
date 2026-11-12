import fs from "fs";
import path from "path";
import { ensureDb, isDbConfigured } from "../db";
import { executeChatCompletion, getEffectiveOpenAiModel } from "../openai";
import { UserService } from "../auth/userService";
import { TelegramService } from "../telegram/service";
import {
  ScheduledAiPrompt,
  CreateScheduledPromptInput,
  UpdateScheduledPromptInput,
  ScheduledPromptsSummary,
  PromptScheduledTime,
  PromptCronBatchSummary,
  PromptCronExecutionResult,
  normalizeScheduledTime,
  isValidScheduledTime,
} from "./types";

interface StorageSchema {
  prompts: Record<string, ScheduledAiPrompt>;
}

function mapPromptRow(row: Record<string, unknown>): ScheduledAiPrompt {
  const scheduledTimeRaw = String(row.scheduled_time || "9am").toLowerCase();
  const scheduledTime: PromptScheduledTime = isValidScheduledTime(scheduledTimeRaw)
    ? scheduledTimeRaw
    : "9am";

  return {
    id: String(row.id),
    userId: String(row.user_id),
    userEmail: row.user_email ? String(row.user_email) : undefined,
    prompt: String(row.prompt || ""),
    scheduledTime,
    title: String(row.title || ""),
    model: String(row.model || getEffectiveOpenAiModel()),
    isActive: Boolean(row.is_active),
    lastRunAt: row.last_run_at
      ? row.last_run_at instanceof Date
        ? row.last_run_at.toISOString()
        : new Date(row.last_run_at as string | number).toISOString()
      : undefined,
    lastRunResult: row.last_run_result ? String(row.last_run_result) : undefined,
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

export class ScheduledPromptService {
  private static localPrompts = new Map<string, ScheduledAiPrompt>();
  private static initialized = false;

  private static getStoragePath(): string {
    const dataDir = path.join(process.cwd(), "data");
    return path.join(dataDir, "scheduled_prompts.json");
  }

  private static loadStorage(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const filePath = this.getStoragePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed: StorageSchema = JSON.parse(raw);
        if (parsed.prompts) {
          for (const [id, prompt] of Object.entries(parsed.prompts)) {
            this.localPrompts.set(id, prompt);
          }
        }
      }
    } catch (err) {
      console.warn(
        "[ScheduledPromptService] Could not read prompts file, using in-memory store:",
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
        prompts: Object.fromEntries(this.localPrompts),
      };
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
    } catch (err) {
      console.warn("[ScheduledPromptService] Could not persist prompts to file:", err);
    }
  }

  /**
   * Creates a new scheduled AI prompt for a user with one of the available time options (6am, 9am, 1pm, 5pm).
   */
  static async createPrompt(input: CreateScheduledPromptInput): Promise<ScheduledAiPrompt> {
    if (!input.userId || input.userId.trim() === "") {
      throw new Error("Missing required field 'userId'.");
    }

    if (!input.prompt || input.prompt.trim() === "") {
      throw new Error("Prompt text cannot be empty.");
    }

    const scheduledTime = normalizeScheduledTime(input.scheduledTime);
    const id = `prm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const nowIso = new Date().toISOString();
    const model = getEffectiveOpenAiModel();
    const title = input.title?.trim() || `AI Prompt (${scheduledTime.toUpperCase()})`;
    const isActive = input.isActive !== undefined ? Boolean(input.isActive) : true;

    const newPrompt: ScheduledAiPrompt = {
      id,
      userId: input.userId.trim(),
      userEmail: input.userEmail?.trim(),
      prompt: input.prompt.trim(),
      scheduledTime,
      title,
      model,
      isActive,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          INSERT INTO scheduled_ai_prompts (
            id, user_id, user_email, prompt, scheduled_time, title, model, is_active, created_at, updated_at
          ) VALUES (
            ${newPrompt.id},
            ${newPrompt.userId},
            ${newPrompt.userEmail || null},
            ${newPrompt.prompt},
            ${newPrompt.scheduledTime},
            ${newPrompt.title},
            ${newPrompt.model},
            ${newPrompt.isActive},
            ${newPrompt.createdAt},
            ${newPrompt.updatedAt}
          )
          RETURNING *;
        `) as Record<string, unknown>[];

        if (rows.length > 0) {
          return mapPromptRow(rows[0]);
        }
      } catch (err) {
        console.warn("[ScheduledPromptService] DB insert failed, falling back to local store:", err);
      }
    }

    this.loadStorage();
    this.localPrompts.set(id, newPrompt);
    this.saveStorage();
    return newPrompt;
  }

  /**
   * Retrieves all scheduled AI prompts for a specific user, with optional filters.
   */
  static async getPromptsByUser(
    userId: string,
    filters?: {
      scheduledTime?: string;
      isActive?: boolean;
      search?: string;
    }
  ): Promise<ScheduledAiPrompt[]> {
    if (!userId) return [];

    let targetTime: PromptScheduledTime | undefined;
    if (filters?.scheduledTime && filters.scheduledTime !== "all") {
      try {
        targetTime = normalizeScheduledTime(filters.scheduledTime);
      } catch {
        targetTime = undefined;
      }
    }

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        let rows: Record<string, unknown>[];

        if (targetTime && filters?.isActive !== undefined) {
          rows = (await sql`
            SELECT * FROM scheduled_ai_prompts
            WHERE user_id = ${userId}
              AND scheduled_time = ${targetTime}
              AND is_active = ${filters.isActive}
            ORDER BY created_at DESC;
          `) as Record<string, unknown>[];
        } else if (targetTime) {
          rows = (await sql`
            SELECT * FROM scheduled_ai_prompts
            WHERE user_id = ${userId}
              AND scheduled_time = ${targetTime}
            ORDER BY created_at DESC;
          `) as Record<string, unknown>[];
        } else if (filters?.isActive !== undefined) {
          rows = (await sql`
            SELECT * FROM scheduled_ai_prompts
            WHERE user_id = ${userId}
              AND is_active = ${filters.isActive}
            ORDER BY created_at DESC;
          `) as Record<string, unknown>[];
        } else {
          rows = (await sql`
            SELECT * FROM scheduled_ai_prompts
            WHERE user_id = ${userId}
            ORDER BY created_at DESC;
          `) as Record<string, unknown>[];
        }

        let results = rows.map(mapPromptRow);
        if (filters?.search && filters.search.trim()) {
          const q = filters.search.trim().toLowerCase();
          results = results.filter(
            (p) =>
              p.prompt.toLowerCase().includes(q) ||
              p.title.toLowerCase().includes(q) ||
              p.model.toLowerCase().includes(q)
          );
        }
        return results;
      } catch (err) {
        console.warn("[ScheduledPromptService] DB query failed, falling back to local store:", err);
      }
    }

    this.loadStorage();
    let list = Array.from(this.localPrompts.values()).filter((p) => p.userId === userId);

    if (targetTime) {
      list = list.filter((p) => p.scheduledTime === targetTime);
    }
    if (filters?.isActive !== undefined) {
      list = list.filter((p) => p.isActive === filters.isActive);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.prompt.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q)
      );
    }

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Retrieves a single scheduled AI prompt by ID.
   */
  static async getPromptById(id: string, userId?: string): Promise<ScheduledAiPrompt | null> {
    if (!id) return null;

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (userId
          ? await sql`
              SELECT * FROM scheduled_ai_prompts
              WHERE id = ${id} AND user_id = ${userId}
              LIMIT 1;
            `
          : await sql`
              SELECT * FROM scheduled_ai_prompts
              WHERE id = ${id}
              LIMIT 1;
            `) as Record<string, unknown>[];

        if (rows.length > 0) {
          return mapPromptRow(rows[0]);
        }
        return null;
      } catch (err) {
        console.warn("[ScheduledPromptService] DB query failed, falling back to local store:", err);
      }
    }

    this.loadStorage();
    const prompt = this.localPrompts.get(id);
    if (!prompt) return null;
    if (userId && prompt.userId !== userId) return null;
    return prompt;
  }

  /**
   * Updates an existing scheduled prompt.
   */
  static async updatePrompt(
    id: string,
    userId: string,
    updates: UpdateScheduledPromptInput
  ): Promise<ScheduledAiPrompt> {
    const existing = await this.getPromptById(id, userId);
    if (!existing) {
      throw new Error(`Scheduled prompt '${id}' not found or unauthorized.`);
    }

    let updatedTime = existing.scheduledTime;
    if (updates.scheduledTime) {
      updatedTime = normalizeScheduledTime(updates.scheduledTime);
    }

    const updatedPromptText =
      updates.prompt !== undefined ? updates.prompt.trim() : existing.prompt;
    if (!updatedPromptText) {
      throw new Error("Prompt text cannot be empty.");
    }

    const updatedTitle =
      updates.title !== undefined ? updates.title.trim() : existing.title;
    const updatedModel = getEffectiveOpenAiModel();
    const updatedIsActive =
      updates.isActive !== undefined ? Boolean(updates.isActive) : existing.isActive;
    const nowIso = new Date().toISOString();

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          UPDATE scheduled_ai_prompts
          SET
            prompt = ${updatedPromptText},
            scheduled_time = ${updatedTime},
            title = ${updatedTitle},
            model = ${updatedModel},
            is_active = ${updatedIsActive},
            updated_at = ${nowIso}
          WHERE id = ${id} AND user_id = ${userId}
          RETURNING *;
        `) as Record<string, unknown>[];

        if (rows.length > 0) {
          return mapPromptRow(rows[0]);
        }
      } catch (err) {
        console.warn("[ScheduledPromptService] DB update failed, falling back to local store:", err);
      }
    }

    this.loadStorage();
    const updated: ScheduledAiPrompt = {
      ...existing,
      prompt: updatedPromptText,
      scheduledTime: updatedTime,
      title: updatedTitle,
      model: updatedModel,
      isActive: updatedIsActive,
      updatedAt: nowIso,
    };
    this.localPrompts.set(id, updated);
    this.saveStorage();
    return updated;
  }

  /**
   * Deletes a scheduled AI prompt.
   */
  static async deletePrompt(id: string, userId: string): Promise<boolean> {
    if (!id || !userId) return false;

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          DELETE FROM scheduled_ai_prompts
          WHERE id = ${id} AND user_id = ${userId};
        `;
        // In Neon driver delete returns array of deleted rows or empty
        this.loadStorage();
        this.localPrompts.delete(id);
        this.saveStorage();
        return true;
      } catch (err) {
        console.warn("[ScheduledPromptService] DB delete failed, falling back to local store:", err);
      }
    }

    this.loadStorage();
    const existing = this.localPrompts.get(id);
    if (!existing || existing.userId !== userId) {
      return false;
    }
    const deleted = this.localPrompts.delete(id);
    this.saveStorage();
    return deleted;
  }

  /**
   * Immediately executes a scheduled prompt using OpenAI, saves last run information,
   * and delivers the response to Telegram using Johan bot integration to the user matched by name and surname.
   */
  static async executePromptNow(
    id: string,
    userId: string
  ): Promise<{
    prompt: ScheduledAiPrompt;
    completion: string;
    durationMs: number;
    telegramDelivery?: {
      sent: boolean;
      subscriber?: {
        chatId: number;
        firstName?: string;
        lastName?: string;
        username?: string;
      };
      error?: string;
      formattedMessage?: string;
    };
  }> {
    const promptRecord = await this.getPromptById(id, userId);
    if (!promptRecord) {
      throw new Error(`Scheduled prompt '${id}' not found.`);
    }

    const startTime = Date.now();
    const result = await executeChatCompletion({
      prompt: promptRecord.prompt,
      userIdentifier: promptRecord.userEmail || promptRecord.userId,
      userId: promptRecord.userId || userId,
      source: `scheduled_prompt_${promptRecord.scheduledTime}`,
    });

    const durationMs = Date.now() - startTime;
    const nowIso = new Date().toISOString();

    // Lookup user in UserService to match by name and surname
    let user = await UserService.getUserById(userId);
    if (!user && promptRecord.userEmail) {
      user = await UserService.getUserByEmail(promptRecord.userEmail);
    }

    // Deliver AI response to Telegram using Johan Bot integration to user matched by name and surname
    const telegramResult = await TelegramService.sendAiPromptResponse({
      userIdentifier: promptRecord.userEmail || promptRecord.userId,
      userName: user?.name,
      userEmail: user?.email || promptRecord.userEmail,
      promptTitle: promptRecord.title,
      promptText: promptRecord.prompt,
      completion: result.completion,
      scheduledTime: promptRecord.scheduledTime,
    });

    const telegramDelivery = {
      sent: telegramResult.success,
      subscriber: telegramResult.subscriber
        ? {
            chatId: telegramResult.subscriber.chatId,
            firstName: telegramResult.subscriber.firstName,
            lastName: telegramResult.subscriber.lastName,
            username: telegramResult.subscriber.username,
          }
        : undefined,
      error: telegramResult.error,
      formattedMessage: telegramResult.formattedMessage,
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          UPDATE scheduled_ai_prompts
          SET
            last_run_at = ${nowIso},
            last_run_result = ${result.completion},
            updated_at = ${nowIso}
          WHERE id = ${id}
          RETURNING *;
        `) as Record<string, unknown>[];

        if (rows.length > 0) {
          return {
            prompt: mapPromptRow(rows[0]),
            completion: result.completion,
            durationMs,
            telegramDelivery,
          };
        }
      } catch (err) {
        console.warn("[ScheduledPromptService] DB update run failed:", err);
      }
    }

    this.loadStorage();
    const updated: ScheduledAiPrompt = {
      ...promptRecord,
      lastRunAt: nowIso,
      lastRunResult: result.completion,
      updatedAt: nowIso,
    };
    this.localPrompts.set(id, updated);
    this.saveStorage();

    return {
      prompt: updated,
      completion: result.completion,
      durationMs,
      telegramDelivery,
    };
  }

  /**
   * Calculates summary statistics for a user's scheduled prompts.
   */
  static async getSummary(userId: string): Promise<ScheduledPromptsSummary> {
    const list = await this.getPromptsByUser(userId);

    const summary: ScheduledPromptsSummary = {
      total: list.length,
      active: list.filter((p) => p.isActive).length,
      paused: list.filter((p) => !p.isActive).length,
      byTime: {
        "6am": list.filter((p) => p.scheduledTime === "6am").length,
        "9am": list.filter((p) => p.scheduledTime === "9am").length,
        "1pm": list.filter((p) => p.scheduledTime === "1pm").length,
        "5pm": list.filter((p) => p.scheduledTime === "5pm").length,
      },
    };

    return summary;
  }

  /**
   * Clears all prompts (primarily for test harness cleanup).
   */
  static async clearAll(): Promise<void> {
    this.loadStorage();
    this.localPrompts.clear();
    this.saveStorage();

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`DELETE FROM scheduled_ai_prompts;`;
      } catch (err) {
        console.warn("[ScheduledPromptService] DB clear failed:", err);
      }
    }
  }

  /**
   * Retrieves all active scheduled prompts across all users or filtered by time.
   */
  static async getAllActivePrompts(
    timeFilter?: PromptScheduledTime | "all" | string
  ): Promise<ScheduledAiPrompt[]> {
    let targetTime: PromptScheduledTime | undefined;
    if (timeFilter && timeFilter !== "all") {
      try {
        targetTime = normalizeScheduledTime(timeFilter);
      } catch {
        targetTime = undefined;
      }
    }

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (targetTime
          ? await sql`
              SELECT * FROM scheduled_ai_prompts
              WHERE is_active = true AND scheduled_time = ${targetTime}
              ORDER BY created_at ASC;
            `
          : await sql`
              SELECT * FROM scheduled_ai_prompts
              WHERE is_active = true
              ORDER BY created_at ASC;
            `) as Record<string, unknown>[];

        return rows.map(mapPromptRow);
      } catch (err) {
        console.warn(
          "[ScheduledPromptService] DB query all active prompts failed, falling back to local store:",
          err
        );
      }
    }

    this.loadStorage();
    let list = Array.from(this.localPrompts.values()).filter((p) => p.isActive);
    if (targetTime) {
      list = list.filter((p) => p.scheduledTime === targetTime);
    }
    return list.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  /**
   * Executes all active scheduled prompts matching the target time slot (or all active prompts).
   * Designed for Vercel Task Scheduler / Cron Jobs and automated background dispatch.
   */
  static async executeScheduledPromptsBatch(options?: {
    scheduledTime?: PromptScheduledTime | "all" | string;
    userId?: string;
  }): Promise<PromptCronBatchSummary> {
    const rawTime = options?.scheduledTime;
    let targetTime: PromptScheduledTime | "all" = "all";

    if (rawTime && rawTime !== "all") {
      try {
        targetTime = normalizeScheduledTime(rawTime);
      } catch {
        targetTime = "all";
      }
    }

    let prompts = await this.getAllActivePrompts(targetTime);
    if (options?.userId) {
      prompts = prompts.filter((p) => p.userId === options.userId);
    }

    const results: PromptCronExecutionResult[] = [];
    let successfulCount = 0;
    let failedCount = 0;

    for (const prompt of prompts) {
      try {
        const execution = await this.executePromptNow(prompt.id, prompt.userId);
        successfulCount++;

        let userName: string | undefined;
        try {
          const user = await UserService.getUserById(prompt.userId);
          userName = user?.name;
        } catch {
          // ignore user lookup failure
        }

        results.push({
          promptId: prompt.id,
          userId: prompt.userId,
          userEmail: prompt.userEmail,
          userName,
          title: prompt.title,
          scheduledTime: prompt.scheduledTime,
          success: true,
          completionPreview:
            execution.completion.length > 150
              ? `${execution.completion.slice(0, 150)}...`
              : execution.completion,
          durationMs: execution.durationMs,
          telegramDelivery: execution.telegramDelivery,
        });
      } catch (err) {
        failedCount++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.push({
          promptId: prompt.id,
          userId: prompt.userId,
          userEmail: prompt.userEmail,
          title: prompt.title,
          scheduledTime: prompt.scheduledTime,
          success: false,
          durationMs: 0,
          error: errorMessage,
        });
      }
    }

    return {
      timestamp: new Date().toISOString(),
      targetTime,
      totalFound: prompts.length,
      executed: results.length,
      successful: successfulCount,
      failed: failedCount,
      results,
    };
  }
}
