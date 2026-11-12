import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { ensureDb, isDbConfigured } from "../db";
import { DEFAULT_OPENAI_MODEL, isOpenAiWebSearchEnabled, isReasoningModel } from "./service";
import { OpenAiLogService, MODEL_PRICING_GUIDE } from "./logs";
import {
  UserOpenAiSettings,
  UserOpenAiSettingsInput,
  UserOpenAiConfigStatus,
  OpenAiModelInfo,
  UserAiUsageOverview,
  OpenAiCreditInfo,
  FssAiUsageStats,
  POPULAR_OPENAI_MODELS,
  ALL_KNOWN_OPENAI_MODELS,
  KNOWN_OPENAI_MODEL_DETAILS,
} from "./types";

export type {
  UserOpenAiSettings,
  UserOpenAiSettingsInput,
  UserOpenAiConfigStatus,
  OpenAiModelInfo,
  UserAiUsageOverview,
  OpenAiCreditInfo,
  FssAiUsageStats,
};
export {
  POPULAR_OPENAI_MODELS,
  ALL_KNOWN_OPENAI_MODELS,
  KNOWN_OPENAI_MODEL_DETAILS,
};

interface StorageSchema {
  settings: Record<string, UserOpenAiSettings>;
}

function mapSettingsRow(row: Record<string, unknown>): UserOpenAiSettings {
  return {
    userId: String(row.user_id),
    apiKey: row.api_key ? String(row.api_key) : undefined,
    defaultModel: String(row.default_model || DEFAULT_OPENAI_MODEL),
    webSearchEnabled: row.web_search_enabled !== undefined ? Boolean(row.web_search_enabled) : true,
    organization: row.organization ? String(row.organization) : undefined,
    temperature: row.temperature !== null && row.temperature !== undefined ? Number(row.temperature) : undefined,
    reasoningEffort: (row.reasoning_effort as "low" | "medium" | "high") || undefined,
    customModel: row.custom_model ? String(row.custom_model) : undefined,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at as string | number || Date.now()).toISOString(),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : new Date(row.updated_at as string | number || Date.now()).toISOString(),
  };
}

/**
 * Service for managing per-user OpenAI API tokens and runtime preferences.
 * Supports PostgreSQL with Neon and local JSON file storage fallback.
 */
export class UserAiSettingsService {
  private static localSettings = new Map<string, UserOpenAiSettings>();
  private static initialized = false;

  private static getStoragePath(): string {
    const dataDir = path.join(process.cwd(), "data");
    return path.join(dataDir, "user_openai_settings.json");
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
        "[UserAiSettingsService] Warning: Could not read settings file, using in-memory store:",
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
        "[UserAiSettingsService] Warning: Could not persist settings to file:",
        (err as Error).message
      );
    }
  }

  /**
   * Retrieves OpenAI settings for a specific user ID.
   */
  static async getSettings(userId: string): Promise<UserOpenAiSettings | null> {
    if (!userId) return null;

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT * FROM user_openai_settings WHERE user_id = ${userId} LIMIT 1;
        `) as Record<string, unknown>[];

        if (rows.length > 0) {
          return mapSettingsRow(rows[0]);
        }
        return null;
      } catch (err) {
        console.warn("[UserAiSettingsService] DB query failed, falling back to local store:", err);
      }
    }

    this.loadStorage();
    return this.localSettings.get(userId) || null;
  }

  /**
   * Saves or updates OpenAI settings for a user.
   */
  static async saveSettings(
    userId: string,
    input: UserOpenAiSettingsInput
  ): Promise<UserOpenAiSettings> {
    if (!userId) {
      throw new Error("User ID is required to save OpenAI settings.");
    }

    const existing = await this.getSettings(userId);
    const now = new Date().toISOString();

    let cleanApiKey = input.apiKey !== undefined ? input.apiKey.trim() : existing?.apiKey;
    // Don't overwrite with masked string
    if (cleanApiKey && (cleanApiKey.includes("...") || cleanApiKey === "***")) {
      cleanApiKey = existing?.apiKey;
    }

    const updated: UserOpenAiSettings = {
      userId,
      apiKey: cleanApiKey || undefined,
      defaultModel: input.defaultModel?.trim() || existing?.defaultModel || DEFAULT_OPENAI_MODEL,
      webSearchEnabled:
        input.webSearchEnabled !== undefined
          ? input.webSearchEnabled
          : existing?.webSearchEnabled !== undefined
          ? existing.webSearchEnabled
          : isOpenAiWebSearchEnabled(),
      organization: input.organization !== undefined ? input.organization.trim() || undefined : existing?.organization,
      temperature: input.temperature !== undefined ? input.temperature : existing?.temperature,
      reasoningEffort: input.reasoningEffort !== undefined ? input.reasoningEffort : existing?.reasoningEffort,
      customModel: input.customModel !== undefined ? input.customModel.trim() || undefined : existing?.customModel,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          INSERT INTO user_openai_settings (
            user_id, api_key, default_model, web_search_enabled,
            organization, temperature, reasoning_effort, created_at, updated_at
          ) VALUES (
            ${updated.userId}, ${updated.apiKey || null}, ${updated.defaultModel},
            ${updated.webSearchEnabled}, ${updated.organization || null},
            ${updated.temperature !== undefined ? updated.temperature : null},
            ${updated.reasoningEffort || null},
            ${updated.createdAt}, ${updated.updatedAt}
          )
          ON CONFLICT (user_id) DO UPDATE SET
            api_key = EXCLUDED.api_key,
            default_model = EXCLUDED.default_model,
            web_search_enabled = EXCLUDED.web_search_enabled,
            organization = EXCLUDED.organization,
            temperature = EXCLUDED.temperature,
            reasoning_effort = EXCLUDED.reasoning_effort,
            updated_at = EXCLUDED.updated_at;
        `;
        return updated;
      } catch (err) {
        console.warn("[UserAiSettingsService] DB insert failed, falling back to local store:", err);
      }
    }

    this.loadStorage();
    this.localSettings.set(userId, updated);
    this.saveStorage();

    return updated;
  }

  /**
   * Deletes or clears OpenAI settings for a user.
   */
  static async deleteSettings(userId: string): Promise<boolean> {
    if (!userId) return false;

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`DELETE FROM user_openai_settings WHERE user_id = ${userId};`;
        return true;
      } catch (err) {
        console.warn("[UserAiSettingsService] DB delete failed:", err);
      }
    }

    this.loadStorage();
    const existed = this.localSettings.delete(userId);
    this.saveStorage();
    return existed;
  }

  /**
   * Formats a raw OpenAI model ID into a rich OpenAiModelInfo descriptor.
   */
  static formatModelDetail(modelId: string): OpenAiModelInfo {
    const known = KNOWN_OPENAI_MODEL_DETAILS[modelId];
    const isReasoning = isReasoningModel(modelId);

    let category: OpenAiModelInfo["category"] = "other";
    let categoryLabel = "Ostatní";

    const m = modelId.toLowerCase();
    if (isReasoning) {
      category = "reasoning";
      categoryLabel = "Reasoning (Uvažování)";
    } else if (m.includes("gpt-4o") || m.includes("chatgpt-4o")) {
      category = "flagship";
      categoryLabel = "Vlajkový & Chat";
    } else if (m.includes("mini") || m.includes("3.5-turbo")) {
      category = "fast";
      categoryLabel = "Rychlý & Úsporný";
    } else if (m.includes("preview")) {
      category = "preview";
      categoryLabel = "Náhled (Preview)";
    } else if (m.includes("turbo") || m.startsWith("gpt-4")) {
      category = "flagship";
      categoryLabel = "Vysoký výkon";
    } else if (m.includes("embedding") || m.includes("embed")) {
      category = "specialized";
      categoryLabel = "Embeddings";
    } else if (m.includes("whisper") || m.includes("tts") || m.includes("realtime") || m.includes("audio")) {
      category = "specialized";
      categoryLabel = "Audio / Hlas";
    } else if (m.includes("dall-e") || m.includes("image")) {
      category = "specialized";
      categoryLabel = "Generování obrazu";
    } else if (m.includes("davinci") || m.includes("babbage") || m.includes("curie")) {
      category = "legacy";
      categoryLabel = "Starší modely";
    }

    const defaultName = known?.name || modelId;
    const defaultDesc =
      known?.description ||
      (isReasoning
        ? "Specializovaný OpenAI reasoning model pro komplexní logické a technické úlohy."
        : category === "flagship"
        ? "Vysokokapacitní OpenAI model pro obecné zpracování a analýzy."
        : category === "fast"
        ? "Rychlý a cenově optimalizovaný model OpenAI."
        : category === "specialized"
        ? "Specializovaný model OpenAI pro specifické modality."
        : "Standardní jazykový model z OpenAI API.");

    return {
      id: modelId,
      name: defaultName,
      category: known?.category || category,
      categoryLabel: known?.categoryLabel || categoryLabel,
      isReasoning,
      description: defaultDesc,
      isRecommended: known?.isRecommended || POPULAR_OPENAI_MODELS.includes(modelId),
      contextWindow: known?.contextWindow,
    };
  }

  /**
   * Retrieves all available OpenAI models.
   * If a user key, provided key, or environment key is configured, queries OpenAI's live models API.
   * Falls back to a comprehensive catalog of all known OpenAI models.
   */
  static async getAvailableModels(
    userId?: string,
    providedApiKey?: string,
    providedOrg?: string
  ): Promise<{
    success: boolean;
    source: "openai-api" | "catalog";
    models: string[];
    modelDetails: OpenAiModelInfo[];
    categories: string[];
    error?: string;
  }> {
    let effectiveKey = providedApiKey?.trim() || "";
    let effectiveOrg = providedOrg?.trim() || undefined;

    if (!effectiveKey && userId) {
      const settings = await this.getSettings(userId);
      if (settings?.apiKey) {
        effectiveKey = settings.apiKey.trim();
        if (!effectiveOrg && settings.organization) {
          effectiveOrg = settings.organization.trim();
        }
      }
    }

    if (!effectiveKey && process.env.OPENAI_API_KEY) {
      effectiveKey = process.env.OPENAI_API_KEY.trim();
      if (!effectiveOrg && process.env.OPENAI_ORG_ID) {
        effectiveOrg = process.env.OPENAI_ORG_ID.trim();
      }
    }

    // Try fetching live from OpenAI API if a real key is present
    if (
      effectiveKey &&
      !effectiveKey.startsWith("sk-test-") &&
      !effectiveKey.startsWith("mock-")
    ) {
      try {
        const client = new OpenAI({
          apiKey: effectiveKey,
          organization: effectiveOrg,
        });

        const res = await client.models.list();
        const apiModelIds = res.data.map((m) => m.id);

        // Sort models logically: popular first, then chat/reasoning models, then others
        const sortedIds = Array.from(
          new Set([...POPULAR_OPENAI_MODELS, ...apiModelIds, ...ALL_KNOWN_OPENAI_MODELS])
        ).sort((a, b) => {
          const aPop = POPULAR_OPENAI_MODELS.indexOf(a);
          const bPop = POPULAR_OPENAI_MODELS.indexOf(b);
          if (aPop !== -1 && bPop !== -1) return aPop - bPop;
          if (aPop !== -1) return -1;
          if (bPop !== -1) return 1;

          // Put chat/reasoning models before specialized ones
          const aIsChat = a.startsWith("gpt-") || a.startsWith("o1") || a.startsWith("o3") || a.startsWith("o4") || a.startsWith("chatgpt-");
          const bIsChat = b.startsWith("gpt-") || b.startsWith("o1") || b.startsWith("o3") || b.startsWith("o4") || b.startsWith("chatgpt-");
          if (aIsChat && !bIsChat) return -1;
          if (!aIsChat && bIsChat) return 1;

          return a.localeCompare(b);
        });

        const modelDetails = sortedIds.map((id) => this.formatModelDetail(id));
        const categories = Array.from(
          new Set(modelDetails.map((m) => m.categoryLabel))
        );

        return {
          success: true,
          source: "openai-api",
          models: sortedIds,
          modelDetails,
          categories,
        };
      } catch (err) {
        console.warn("[UserAiSettingsService] Live OpenAI models.list failed, using catalog:", (err as Error).message);
      }
    }

    // Fallback: Comprehensive static catalog
    const modelDetails = ALL_KNOWN_OPENAI_MODELS.map((id) => this.formatModelDetail(id));
    const categories = Array.from(
      new Set(modelDetails.map((m) => m.categoryLabel))
    );

    return {
      success: true,
      source: "catalog",
      models: ALL_KNOWN_OPENAI_MODELS,
      modelDetails,
      categories,
    };
  }

  /**
   * Returns a sanitized, client-safe configuration status for a given user.
   */
  static async getUserOpenAiConfig(userId?: string | null): Promise<UserOpenAiConfigStatus> {
    const settings = userId ? await this.getSettings(userId) : null;
    const rawKey = settings?.apiKey || "";
    const isConfigured = Boolean(rawKey && rawKey.trim().length > 0);

    let maskedKey: string | undefined;
    if (rawKey.length > 8) {
      maskedKey = `${rawKey.slice(0, 3)}...${rawKey.slice(-4)}`;
    } else if (rawKey) {
      maskedKey = "***";
    }

    const defaultModel = settings?.defaultModel || DEFAULT_OPENAI_MODEL;
    const webSearchEnabled = settings?.webSearchEnabled !== undefined ? settings.webSearchEnabled : true;

    const availableModels = ALL_KNOWN_OPENAI_MODELS;

    return {
      userId: userId || undefined,
      isConfigured,
      apiKeyConfigured: isConfigured,
      defaultModel,
      webSearchEnabled,
      maskedKey,
      organization: settings?.organization,
      temperature: settings?.temperature,
      reasoningEffort: settings?.reasoningEffort,
      customModel: settings?.customModel,
      availableModels,
    };
  }

  /**
   * Validates an OpenAI API key against the OpenAI models API.
   */
  static async validateApiKey(
    apiKey: string,
    organization?: string
  ): Promise<{
    valid: boolean;
    error?: string;
    models?: string[];
    modelDetails?: OpenAiModelInfo[];
  }> {
    if (!apiKey || apiKey.trim() === "") {
      return { valid: false, error: "API Key cannot be empty." };
    }

    const trimmed = apiKey.trim();
    if (trimmed.startsWith("sk-test-") || trimmed.startsWith("mock-")) {
      const details = ALL_KNOWN_OPENAI_MODELS.map((id) => this.formatModelDetail(id));
      return { valid: true, models: ALL_KNOWN_OPENAI_MODELS, modelDetails: details };
    }

    try {
      const client = new OpenAI({
        apiKey: trimmed,
        organization: organization?.trim() || undefined,
      });

      const response = await client.models.list();
      const apiModelIds = response.data.map((m) => m.id);
      const combined = Array.from(
        new Set([...POPULAR_OPENAI_MODELS, ...apiModelIds, ...ALL_KNOWN_OPENAI_MODELS])
      ).sort((a, b) => {
        const aPop = POPULAR_OPENAI_MODELS.indexOf(a);
        const bPop = POPULAR_OPENAI_MODELS.indexOf(b);
        if (aPop !== -1 && bPop !== -1) return aPop - bPop;
        if (aPop !== -1) return -1;
        if (bPop !== -1) return 1;
        return a.localeCompare(b);
      });

      const modelDetails = combined.map((id) => this.formatModelDetail(id));
      return { valid: true, models: combined, modelDetails };
    } catch (err) {
      return {
        valid: false,
        error: (err as Error).message || "Invalid OpenAI API Key or connection error.",
      };
    }
  }

  /**
   * Attempts to query OpenAI's billing / credit grants / subscription endpoint
   * using the provided API key and optional organization.
   */
  static async fetchOpenAiCreditBalance(
    apiKey?: string,
    organization?: string
  ): Promise<OpenAiCreditInfo> {
    const key = apiKey?.trim() || process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      return {
        status: "no_key",
        message: "OpenAI API token není zadán. Pro zjištění zůstatku zadejte svůj API klíč.",
        source: "estimated-local",
      };
    }

    // Mock keys or test keys
    if (key.startsWith("sk-test-") || key.startsWith("mock-")) {
      return {
        status: "available",
        planTitle: "Testovací účet / Sandbox",
        totalGrantedUsd: 20.0,
        totalUsedUsd: 1.45,
        totalAvailableUsd: 18.55,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        hasPaymentMethod: true,
        source: "openai-api",
        message: "Simulovaný kreditní zůstatek pro testovací token.",
      };
    }

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      };
      if (organization?.trim()) {
        headers["OpenAI-Organization"] = organization.trim();
      }

      // 1. Try credit grants endpoint (supported on user/legacy tokens)
      const grantsRes = await fetch(
        "https://api.openai.com/v1/dashboard/billing/credit_grants",
        { headers, method: "GET" }
      ).catch(() => null);

      if (grantsRes && grantsRes.ok) {
        const grantsData = await grantsRes.json();
        const totalGranted = typeof grantsData.total_granted === "number" ? grantsData.total_granted : undefined;
        const totalUsed = typeof grantsData.total_used === "number" ? grantsData.total_used : undefined;
        const totalAvailable = typeof grantsData.total_available === "number" ? grantsData.total_available : undefined;

        let expiresAt: string | undefined;
        if (Array.isArray(grantsData.grants?.data) && grantsData.grants.data.length > 0) {
          const firstGrant = grantsData.grants.data[0];
          if (firstGrant?.expires_at) {
            expiresAt = new Date(firstGrant.expires_at * 1000).toISOString();
          }
        }

        return {
          status: "available",
          planTitle: "Předplacený kredit",
          totalGrantedUsd: totalGranted,
          totalUsedUsd: totalUsed,
          totalAvailableUsd: totalAvailable,
          expiresAt,
          source: "openai-api",
          message: "Kreditní zůstatek úspěšně načten z OpenAI API.",
        };
      }

      // 2. Try subscription endpoint
      const subRes = await fetch(
        "https://api.openai.com/v1/dashboard/billing/subscription",
        { headers, method: "GET" }
      ).catch(() => null);

      if (subRes && subRes.ok) {
        const subData = await subRes.json();
        const planTitle = subData.plan?.title || "Pay-as-you-go";
        const hasPaymentMethod = Boolean(subData.has_payment_method);
        const hardLimit = typeof subData.hard_limit_usd === "number" ? subData.hard_limit_usd : undefined;
        const softLimit = typeof subData.soft_limit_usd === "number" ? subData.soft_limit_usd : undefined;

        return {
          status: "available",
          planTitle,
          hasPaymentMethod,
          hardLimitUsd: hardLimit,
          softLimitUsd: softLimit,
          source: "openai-api",
          message: `Účet OpenAI je aktivní (${planTitle}).`,
        };
      }

      // 3. Fallback for project-scoped / standard keys
      return {
        status: "unavailable",
        planTitle: "Aktivní API Klíč (Project / Scoped Token)",
        message:
          "Tento API klíč je aktivní projektový token. Přímé zjištění zůstatku přes Billing API vyžaduje práva Organization Admin. Vaše celková spotřeba a odhad nákladů jsou podrobně sledovány níže.",
        source: "estimated-local",
      };
    } catch (err) {
      return {
        status: "error",
        message: `Nelze načíst data z OpenAI Billing API: ${(err as Error).message}`,
        source: "estimated-local",
      };
    }
  }

  /**
   * Computes an all-inclusive usage overview including total token costs,
   * FSS PBŘ project accumulations, model breakdowns, and OpenAI credit balance.
   */
  static async getUserUsageOverview(
    userId?: string,
    customApiKey?: string,
    customOrg?: string
  ): Promise<UserAiUsageOverview> {
    let apiKey = customApiKey?.trim();
    let organization = customOrg?.trim();

    if (!apiKey && userId) {
      const userSettings = await this.getSettings(userId);
      if (userSettings?.apiKey) {
        apiKey = userSettings.apiKey.trim();
        if (!organization && userSettings.organization) {
          organization = userSettings.organization.trim();
        }
      }
    }

    // 1. Fetch system usage summary from OpenAiLogService
    const summary = await OpenAiLogService.getUsageSummary();

    // 2. Fetch FSS solutions to aggregate FSS-specific metrics
    const fssStats: FssAiUsageStats = {
      totalFssProjects: 0,
      fssProjectsWithAi: 0,
      totalFssCostUsd: 0,
      totalFssTokens: 0,
      totalFssGenerations: 0,
    };

    try {
      const { FireSafetySolutionService } = await import("../fss/service");
      const solutions = await FireSafetySolutionService.listSolutions();
      fssStats.totalFssProjects = solutions.length;
      for (const sol of solutions) {
        if (sol.totalCostUsd || sol.totalTokens || sol.generationCount) {
          fssStats.fssProjectsWithAi++;
          fssStats.totalFssCostUsd += sol.totalCostUsd || 0;
          fssStats.totalFssTokens += sol.totalTokens || 0;
          fssStats.totalFssGenerations += sol.generationCount || 0;
        }
      }
      fssStats.totalFssCostUsd = Number(fssStats.totalFssCostUsd.toFixed(6));
    } catch (err) {
      console.warn("[UserAiSettingsService] Could not aggregate FSS stats:", (err as Error).message);
    }

    // 3. Fetch credit balance
    const creditInfo = await this.fetchOpenAiCreditBalance(apiKey, organization);

    // 4. Compute models with percentage of total cost
    const totalCost = summary.estimatedTotalCostUsd > 0 ? summary.estimatedTotalCostUsd : 1;
    const modelsUsed = summary.modelsUsed.map((m) => ({
      ...m,
      percentageOfCost: Number(((m.estimatedCostUsd / totalCost) * 100).toFixed(1)),
    }));

    const successRate =
      summary.totalRequests > 0
        ? Number(((summary.successfulRequests / summary.totalRequests) * 100).toFixed(1))
        : 100;

    const estimatedTotalCostCzk = Number((summary.estimatedTotalCostUsd * 24.0).toFixed(2));

    return {
      totalRequests: summary.totalRequests,
      successfulRequests: summary.successfulRequests,
      failedRequests: summary.failedRequests,
      successRate,
      totalPromptTokens: summary.totalPromptTokens,
      totalCompletionTokens: summary.totalCompletionTokens,
      totalTokens: summary.totalTokens,
      estimatedTotalCostUsd: summary.estimatedTotalCostUsd,
      estimatedTotalCostCzk,
      averageDurationMs: summary.averageDurationMs,
      lastUsedAt: summary.lastUsedAt,
      fssStats,
      modelsUsed,
      recentDailyUsage: summary.recentDailyUsage,
      creditInfo,
      pricingGuide: MODEL_PRICING_GUIDE,
    };
  }
}
