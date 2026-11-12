export type OpenAiModel =
  | "gpt-4o-mini"
  | "gpt-4o"
  | "gpt-4-turbo"
  | "gpt-3.5-turbo"
  | string;

export interface OpenAiMessageLog {
  id: string | number;
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
  source: string;
  rawPayload?: Record<string, unknown>;
  createdAt: string;
}

export interface ModelUsageStats {
  model: string;
  requestsCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface DailyUsageStats {
  date: string;
  requests: number;
  tokens: number;
  costUsd: number;
}

export interface OpenAiUsageSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  estimatedTotalCostUsd: number;
  averageDurationMs: number;
  modelsUsed: ModelUsageStats[];
  recentDailyUsage: DailyUsageStats[];
  lastUsedAt?: string;
}

export interface OpenAiCreditInfo {
  status: "available" | "unavailable" | "no_key" | "error";
  planTitle?: string;
  totalGrantedUsd?: number;
  totalUsedUsd?: number;
  totalAvailableUsd?: number;
  expiresAt?: string;
  hasPaymentMethod?: boolean;
  hardLimitUsd?: number;
  softLimitUsd?: number;
  message?: string;
  source: "openai-api" | "estimated-local";
}

export interface FssAiUsageStats {
  totalFssProjects: number;
  fssProjectsWithAi: number;
  totalFssCostUsd: number;
  totalFssTokens: number;
  totalFssGenerations: number;
}

export interface ModelPricingGuideItem {
  model: string;
  name: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  contextWindow: string;
  tier: "cheapest" | "very_low" | "medium" | "high" | "premium";
  recommendation: string;
}

export interface UserAiUsageOverview {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  estimatedTotalCostUsd: number;
  estimatedTotalCostCzk: number;
  averageDurationMs: number;
  lastUsedAt?: string;
  fssStats: FssAiUsageStats;
  modelsUsed: (ModelUsageStats & { percentageOfCost: number })[];
  recentDailyUsage: DailyUsageStats[];
  creditInfo: OpenAiCreditInfo;
  pricingGuide: ModelPricingGuideItem[];
}

export interface OpenAiConfigStatus {
  isConfigured: boolean;
  apiKeyConfigured: boolean;
  defaultModel: string;
  webSearchEnabled?: boolean;
  maskedKey?: string;
  organization?: string;
  availableModels: string[];
}

export interface UserOpenAiSettings {
  userId: string;
  apiKey?: string;
  defaultModel: string;
  webSearchEnabled: boolean;
  organization?: string;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
  customModel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserOpenAiSettingsInput {
  apiKey?: string;
  defaultModel?: string;
  webSearchEnabled?: boolean;
  organization?: string;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
  customModel?: string;
}

export interface UserOpenAiConfigStatus {
  userId?: string;
  isConfigured: boolean;
  apiKeyConfigured: boolean;
  defaultModel: string;
  webSearchEnabled: boolean;
  maskedKey?: string;
  organization?: string;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
  customModel?: string;
  availableModels: string[];
}

export interface OpenAiModelInfo {
  id: string;
  name: string;
  category: "flagship" | "reasoning" | "fast" | "preview" | "legacy" | "specialized" | "other";
  categoryLabel: string;
  isReasoning: boolean;
  description: string;
  isRecommended?: boolean;
  contextWindow?: string;
}

export const POPULAR_OPENAI_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "o3-mini",
  "o1",
  "o4-mini",
  "gpt-4.5-preview",
  "gpt-4-turbo",
];

export const ALL_KNOWN_OPENAI_MODELS: string[] = [
  // Flagship & Universal
  "gpt-4o",
  "gpt-4o-2024-11-20",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-05-13",
  "chatgpt-4o-latest",
  // High-Capacity & Previews
  "gpt-4.5-preview",
  "gpt-4.5-preview-2025-02-27",
  "gpt-4-turbo",
  "gpt-4-turbo-2024-04-09",
  "gpt-4-turbo-preview",
  "gpt-4-0125-preview",
  "gpt-4-1106-preview",
  // Reasoning Models
  "o3-mini",
  "o3-mini-2025-01-31",
  "o1",
  "o1-2024-12-17",
  "o1-preview",
  "o1-mini",
  "o4-mini",
  // Fast & Lightweight
  "gpt-4o-mini",
  "gpt-4o-mini-2024-07-18",
  // Previous Generation / Base Models
  "gpt-4",
  "gpt-4-0613",
  "gpt-4-32k",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-0125",
  "gpt-3.5-turbo-1106",
  "gpt-3.5-turbo-instruct",
];

export const KNOWN_OPENAI_MODEL_DETAILS: Record<string, Partial<OpenAiModelInfo>> = {
  "gpt-4o": {
    name: "GPT-4o (Omni)",
    category: "flagship",
    categoryLabel: "Vlajkový model",
    isReasoning: false,
    description: "Vlajkový multimodální model s vysokou inteligencí, rychlostí a přesností.",
    isRecommended: true,
    contextWindow: "128k",
  },
  "gpt-4o-mini": {
    name: "GPT-4o mini",
    category: "fast",
    categoryLabel: "Rychlý & Úsporný",
    isReasoning: false,
    description: "Cenově nejvýhodnější a bleskově rychlý model pro standardní a hromadné úlohy.",
    isRecommended: true,
    contextWindow: "128k",
  },
  "o3-mini": {
    name: "o3-mini",
    category: "reasoning",
    categoryLabel: "Reasoning (Uvažování)",
    isReasoning: true,
    description: "Nejnovější STEM a reasoning model s hloubkovým technickým uvažováním a volitelným effortem.",
    isRecommended: true,
    contextWindow: "200k",
  },
  "o1": {
    name: "o1",
    category: "reasoning",
    categoryLabel: "Reasoning (Uvažování)",
    isReasoning: true,
    description: "Plnohodnotný reasoning model navržený pro nejsložitější analytické a technické normy.",
    isRecommended: true,
    contextWindow: "200k",
  },
  "o4-mini": {
    name: "o4-mini",
    category: "reasoning",
    categoryLabel: "Reasoning (Uvažování)",
    isReasoning: true,
    description: "Kompaktní reasoning model nové generace s vysokou efektivitou.",
    contextWindow: "128k",
  },
  "gpt-4.5-preview": {
    name: "GPT-4.5 Preview",
    category: "preview",
    categoryLabel: "Next-Gen Preview",
    isReasoning: false,
    description: "Nejrozsáhlejší znalostní model OpenAI s hlubokým porozuměním kontextu a nuancí.",
    contextWindow: "128k",
  },
  "gpt-4-turbo": {
    name: "GPT-4 Turbo",
    category: "flagship",
    categoryLabel: "Vysoký výkon",
    isReasoning: false,
    description: "Osvědčený výkonný model s 128k oknem kontextu a vision schopnostmi.",
    contextWindow: "128k",
  },
  "chatgpt-4o-latest": {
    name: "ChatGPT-4o Latest",
    category: "flagship",
    categoryLabel: "Dynamická verze",
    isReasoning: false,
    description: "Nejaktuálnější průběžně aktualizovaná verze modelu používaná v ChatGPT.",
    contextWindow: "128k",
  },
  "o1-preview": {
    name: "o1 Preview",
    category: "reasoning",
    categoryLabel: "Reasoning (Preview)",
    isReasoning: true,
    description: "Náhledová verze reasoning modelu pro složité technické dedukce.",
    contextWindow: "128k",
  },
  "o1-mini": {
    name: "o1-mini",
    category: "reasoning",
    categoryLabel: "Reasoning (Rychlý)",
    isReasoning: true,
    description: "Rychlejší varianta uvažovacího modelu optimalizovaná pro kód a logiku.",
    contextWindow: "128k",
  },
  "gpt-4": {
    name: "GPT-4",
    category: "legacy",
    categoryLabel: "Předchozí generace",
    isReasoning: false,
    description: "Původní robustní model GPT-4 s vysokou spolehlivostí.",
    contextWindow: "8k",
  },
  "gpt-3.5-turbo": {
    name: "GPT-3.5 Turbo",
    category: "fast",
    categoryLabel: "Ekonomický",
    isReasoning: false,
    description: "Klasický rychlý model pro jednodušší textové operace.",
    contextWindow: "16k",
  },
};
