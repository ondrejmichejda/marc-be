import fs from "fs";
import path from "path";
import { ensureDb, isDbConfigured } from "../db";
import {
  OpenAiMessageLog,
  OpenAiUsageSummary,
  ModelUsageStats,
  DailyUsageStats,
} from "./types";

interface StorageSchema {
  logs: OpenAiMessageLog[];
}

// Pricing per 1M tokens (USD)
const MODEL_PRICING: Record<string, { prompt: number; completion: number }> = {
  "gpt-4o-mini": { prompt: 0.15, completion: 0.6 },
  "gpt-4o": { prompt: 2.5, completion: 10.0 },
  "gpt-4-turbo": { prompt: 10.0, completion: 30.0 },
  "gpt-3.5-turbo": { prompt: 0.5, completion: 1.5 },
};

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model.toLowerCase()] || {
    prompt: 0.2,
    completion: 0.8,
  };
  const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
  const completionCost = (completionTokens / 1_000_000) * pricing.completion;
  return Number((promptCost + completionCost).toFixed(6));
}

function mapLogRow(row: Record<string, unknown>): OpenAiMessageLog {
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
    model: (row.model as string) || "gpt-4o-mini",
    prompt: (row.prompt as string) || "",
    completion: (row.completion as string) || "",
    promptTokens: Number(row.prompt_tokens || 0),
    completionTokens: Number(row.completion_tokens || 0),
    totalTokens: Number(row.total_tokens || 0),
    durationMs: Number(row.duration_ms || 0),
    status: (row.status as "success" | "error") || "success",
    errorMessage: (row.error_message as string) || undefined,
    userIdentifier: (row.user_identifier as string) || undefined,
    source: (row.source as string) || "system",
    rawPayload,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at as string | number).toISOString(),
  };
}

const INITIAL_DEMO_LOGS: OpenAiMessageLog[] = [
  {
    id: "demo_1",
    model: "gpt-4o-mini",
    prompt: "Zareaguj na zprávu 'Nestíhám trénink' vtipnou nadávkou, která nebude sprostá, ale pobaví.",
    completion: "No jasně, gauč ti zase vyhlásil bezpodmínečnou kapitulaci, ty lenochode v kimonu!",
    promptTokens: 42,
    completionTokens: 24,
    totalTokens: 66,
    durationMs: 412,
    status: "success",
    userIdentifier: "telegram_user_8912",
    source: "telegram_bot",
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "demo_2",
    model: "gpt-4o-mini",
    prompt: "Vysvětli rozdíl mezi armbar a kimura v BJJ stručně ve dvou větách.",
    completion: "Armbar natahuje a páčí loketní kloub v přímé linii za použití stehen jako páky. Kimura naopak rotuje ramenní kloub za zády pomocí úchopu ve tvaru čísla 4.",
    promptTokens: 38,
    completionTokens: 49,
    totalTokens: 87,
    durationMs: 520,
    status: "success",
    userIdentifier: "admin@marc.dev",
    source: "system_test",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "demo_3",
    model: "gpt-4o",
    prompt: "Zanalyzuj efektivitu tréninkového plánu pro turnaj v Draculinu.",
    completion: "Tréninkový plán má vyvážený poměr technického drilu (40%), situačního sparingu (40%) a regenerace (20%). Doporučuji zvýšit intenzitu v týdnu 3 a snížit zátěž 5 dní před turnajem.",
    promptTokens: 85,
    completionTokens: 62,
    totalTokens: 147,
    durationMs: 840,
    status: "success",
    userIdentifier: "admin@marc.dev",
    source: "system_console",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

export class OpenAiLogService {
  private static localLogs: OpenAiMessageLog[] = [];
  private static initialized = false;

  private static getStoragePath(): string {
    const dataDir = path.join(process.cwd(), "data");
    return path.join(dataDir, "openai_logs.json");
  }

  private static loadStorage(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const filePath = this.getStoragePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed: StorageSchema = JSON.parse(raw);
        if (Array.isArray(parsed.logs) && parsed.logs.length > 0) {
          this.localLogs = parsed.logs;
          return;
        }
      }
      // Populate with initial demo logs if fresh
      this.localLogs = [...INITIAL_DEMO_LOGS];
      this.saveStorage();
    } catch (err) {
      console.warn(
        "[OpenAiLogService] Warning: Could not read logs file, using in-memory store:",
        (err as Error).message
      );
      this.localLogs = [...INITIAL_DEMO_LOGS];
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
        logs: this.localLogs.slice(-1000),
      };

      fs.writeFileSync(filePath, JSON.stringify(serialized, null, 2), "utf-8");
    } catch (err) {
      console.warn(
        "[OpenAiLogService] Warning: Could not persist OpenAI logs to file:",
        (err as Error).message
      );
    }
  }

  /**
   * Logs an OpenAI interaction into PostgreSQL or local JSON storage.
   */
  static async logInteraction(params: {
    model: string;
    prompt: string;
    completion: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    durationMs: number;
    status: "success" | "error";
    errorMessage?: string;
    userIdentifier?: string;
    source?: string;
    rawPayload?: Record<string, unknown>;
  }): Promise<OpenAiMessageLog> {
    const totalTokens =
      params.totalTokens || params.promptTokens + params.completionTokens;
    const source = params.source || "system";

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const payloadJson = params.rawPayload
          ? JSON.stringify(params.rawPayload)
          : null;

        const result = (await sql`
          INSERT INTO openai_logs (
            model,
            prompt,
            completion,
            prompt_tokens,
            completion_tokens,
            total_tokens,
            duration_ms,
            status,
            error_message,
            user_identifier,
            source,
            raw_payload
          ) VALUES (
            ${params.model},
            ${params.prompt},
            ${params.completion},
            ${params.promptTokens},
            ${params.completionTokens},
            ${totalTokens},
            ${params.durationMs},
            ${params.status},
            ${params.errorMessage || null},
            ${params.userIdentifier || null},
            ${source},
            ${payloadJson}::jsonb
          )
          RETURNING *;
        `) as Record<string, unknown>[];

        if (result && result.length > 0) {
          return mapLogRow(result[0]);
        }
      } catch (err) {
        console.warn(
          "[OpenAiLogService] DB write failed, falling back to local storage:",
          (err as Error).message
        );
      }
    }

    // Local / In-memory storage fallback
    this.loadStorage();

    const newLog: OpenAiMessageLog = {
      id: `oai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      model: params.model,
      prompt: params.prompt,
      completion: params.completion,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens,
      durationMs: params.durationMs,
      status: params.status,
      errorMessage: params.errorMessage,
      userIdentifier: params.userIdentifier,
      source,
      rawPayload: params.rawPayload,
      createdAt: new Date().toISOString(),
    };

    this.localLogs.push(newLog);
    this.saveStorage();

    return newLog;
  }

  /**
   * Retrieves logged interactions with optional filters.
   */
  static async listLogs(options?: {
    model?: string;
    status?: "success" | "error";
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<OpenAiMessageLog[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();

        let rows: Record<string, unknown>[] = [];

        if (options?.model && options?.status) {
          rows = (await sql`
            SELECT * FROM openai_logs
            WHERE model = ${options.model} AND status = ${options.status}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset};
          `) as Record<string, unknown>[];
        } else if (options?.model) {
          rows = (await sql`
            SELECT * FROM openai_logs
            WHERE model = ${options.model}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset};
          `) as Record<string, unknown>[];
        } else if (options?.status) {
          rows = (await sql`
            SELECT * FROM openai_logs
            WHERE status = ${options.status}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset};
          `) as Record<string, unknown>[];
        } else {
          rows = (await sql`
            SELECT * FROM openai_logs
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset};
          `) as Record<string, unknown>[];
        }

        const mapped = rows.map(mapLogRow);

        if (options?.search) {
          const q = options.search.toLowerCase();
          return mapped.filter(
            (log) =>
              log.prompt.toLowerCase().includes(q) ||
              log.completion.toLowerCase().includes(q) ||
              (log.userIdentifier && log.userIdentifier.toLowerCase().includes(q)) ||
              log.model.toLowerCase().includes(q)
          );
        }

        return mapped;
      } catch (err) {
        console.warn(
          "[OpenAiLogService] DB list query failed, using local store:",
          (err as Error).message
        );
      }
    }

    this.loadStorage();

    let filtered = [...this.localLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (options?.model) {
      filtered = filtered.filter((l) => l.model === options.model);
    }

    if (options?.status) {
      filtered = filtered.filter((l) => l.status === options.status);
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.prompt.toLowerCase().includes(q) ||
          l.completion.toLowerCase().includes(q) ||
          (l.userIdentifier && l.userIdentifier.toLowerCase().includes(q)) ||
          l.model.toLowerCase().includes(q)
      );
    }

    return filtered.slice(offset, offset + limit);
  }

  /**
   * Computes aggregate token usage summary and per-model breakdown.
   */
  static async getUsageSummary(): Promise<OpenAiUsageSummary> {
    const allLogs = await this.listLogs({ limit: 1000 });

    const totalRequests = allLogs.length;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    let totalDurationMs = 0;
    let estimatedTotalCostUsd = 0;

    const modelMap = new Map<string, ModelUsageStats>();
    const dailyMap = new Map<string, { requests: number; tokens: number; cost: number }>();

    let lastUsedAt: string | undefined;

    for (const log of allLogs) {
      if (log.status === "success") {
        successfulRequests++;
      } else {
        failedRequests++;
      }

      totalPromptTokens += log.promptTokens;
      totalCompletionTokens += log.completionTokens;
      totalTokens += log.totalTokens;
      totalDurationMs += log.durationMs;

      const cost = estimateCostUsd(log.model, log.promptTokens, log.completionTokens);
      estimatedTotalCostUsd += cost;

      if (!lastUsedAt || new Date(log.createdAt) > new Date(lastUsedAt)) {
        lastUsedAt = log.createdAt;
      }

      // Per model stats
      const existingModel = modelMap.get(log.model) || {
        model: log.model,
        requestsCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
      };

      existingModel.requestsCount++;
      existingModel.promptTokens += log.promptTokens;
      existingModel.completionTokens += log.completionTokens;
      existingModel.totalTokens += log.totalTokens;
      existingModel.estimatedCostUsd += cost;
      modelMap.set(log.model, existingModel);

      // Daily stats
      const dateKey = log.createdAt.slice(0, 10);
      const existingDaily = dailyMap.get(dateKey) || {
        requests: 0,
        tokens: 0,
        cost: 0,
      };
      existingDaily.requests++;
      existingDaily.tokens += log.totalTokens;
      existingDaily.cost += cost;
      dailyMap.set(dateKey, existingDaily);
    }

    const averageDurationMs =
      totalRequests > 0 ? Math.round(totalDurationMs / totalRequests) : 0;

    const modelsUsed = Array.from(modelMap.values()).map((m) => ({
      ...m,
      estimatedCostUsd: Number(m.estimatedCostUsd.toFixed(6)),
    }));

    const recentDailyUsage: DailyUsageStats[] = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        requests: stats.requests,
        tokens: stats.tokens,
        costUsd: Number(stats.cost.toFixed(6)),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
      estimatedTotalCostUsd: Number(estimatedTotalCostUsd.toFixed(6)),
      averageDurationMs,
      modelsUsed,
      recentDailyUsage,
      lastUsedAt,
    };
  }

  /**
   * Clears logs in local store (used for test resets or console maintenance).
   */
  static clearLocalLogs(): void {
    this.localLogs = [];
    this.saveStorage();
  }
}
