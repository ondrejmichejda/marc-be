import fs from "fs";
import path from "path";
import { ensureDb, isDbConfigured } from "../db";
import { executeChatCompletion } from "../openai";
import {
  ScheduledAiPrompt,
  CreateScheduledPromptInput,
  UpdateScheduledPromptInput,
  ScheduledPromptsSummary,
  PromptScheduledTime,
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
    model: String(row.model || "gpt-4o-mini"),
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
   * Creates a new scheduled AI prompt for a user with one of the 3 time options (9am, 1pm, 5pm).
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
    const model = input.model || "gpt-4o-mini";
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
    const updatedModel = updates.model || existing.model;
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
   * Immediately executes a scheduled prompt using OpenAI and saves last run information.
   */
  static async executePromptNow(
    id: string,
    userId: string
  ): Promise<{ prompt: ScheduledAiPrompt; completion: string; durationMs: number }> {
    const promptRecord = await this.getPromptById(id, userId);
    if (!promptRecord) {
      throw new Error(`Scheduled prompt '${id}' not found.`);
    }

    const startTime = Date.now();
    const result = await executeChatCompletion({
      prompt: promptRecord.prompt,
      model: promptRecord.model,
      userIdentifier: promptRecord.userEmail || promptRecord.userId,
      source: `scheduled_prompt_${promptRecord.scheduledTime}`,
    });

    const durationMs = Date.now() - startTime;
    const nowIso = new Date().toISOString();

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
}
