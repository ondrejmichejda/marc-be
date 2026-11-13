export type OpenAiModel =
  | "gpt-6-astra"
  | "gpt-6.1-sol"
  | "gpt-6-sol"
  | "gpt-6-luna"
  | "gpt-6-instant"
  | "gpt-6-cyber"
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
  recentDailyUsage?: DailyUsageStats[];
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
  fssStats?: FssAiUsageStats;
  modelsUsed?: (ModelUsageStats & { percentageOfCost: number })[];
  recentDailyUsage?: DailyUsageStats[];
  creditInfo?: OpenAiCreditInfo;
  pricingGuide?: ModelPricingGuideItem[];
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

export interface UserAiSettings extends UserOpenAiConfigStatus {
  hasCustomApiKey?: boolean;
  maskedApiKey?: string;
  customApiKey?: string;
  preferredModel?: string;
  enableWebSearch?: boolean;
  enableTelemetryLogging?: boolean;
  totalPersonalTokensUsed?: number;
  totalPersonalCostUsd?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ValidateAiSettingsResult {
  valid: boolean;
  model: string;
  latencyMs: number;
  error?: string;
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
  "gpt-6-astra",
  "gpt-6.1-sol",
  "gpt-6-luna",
  "gpt-4o",
  "gpt-4o-mini",
  "o3-mini",
  "o1",
  "o4-mini",
  "gpt-4.5-preview",
  "gpt-4-turbo",
];

export const ALL_KNOWN_OPENAI_MODELS: string[] = [
  // GPT-6 Generation
  "gpt-6-astra",
  "gpt-6.1-sol",
  "gpt-6-sol",
  "gpt-6-luna",
  "gpt-6-instant",
  "gpt-6-cyber",
  // Flagship & Universal
  "gpt-4o",
  "gpt-4o-2024-11-20",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-05-13",
  "chatgpt-4o-latest",
  "gpt-4.5-preview",
  "gpt-4.5-preview-2025-02-27",
  "gpt-4-turbo",
  "gpt-4-turbo-2024-04-09",
  "gpt-4-turbo-preview",
  "gpt-4-0125-preview",
  "gpt-4-1106-preview",
  "o3-mini",
  "o3-mini-2025-01-31",
  "o1",
  "o1-2024-12-17",
  "o1-preview",
  "o1-mini",
  "o4-mini",
  "gpt-4o-mini",
  "gpt-4o-mini-2024-07-18",
  "gpt-4",
  "gpt-4-0613",
  "gpt-4-32k",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-0125",
  "gpt-3.5-turbo-1106",
  "gpt-3.5-turbo-instruct",
];

export const KNOWN_OPENAI_MODEL_DETAILS: Record<string, Partial<OpenAiModelInfo>> = {
  "gpt-6-astra": {
    name: "GPT-6 Astra",
    category: "flagship",
    categoryLabel: "GPT-6 Vlajkový",
    isReasoning: true,
    description: "Špičkový vlajkový model nové generace GPT-6 s 1.05M kontextem pro náročné inženýrské výpočty a PBŘ posouzení.",
    isRecommended: true,
    contextWindow: "1.05M",
  },
  "gpt-6.1-sol": {
    name: "GPT-6.1 Sol",
    category: "flagship",
    categoryLabel: "GPT-6 Vyvážený",
    isReasoning: false,
    description: "Výkonný a vyvážený model řady GPT-6 s 1.05M kontextem pro každodenní technické zprávy.",
    isRecommended: true,
    contextWindow: "1.05M",
  },
  "gpt-6-sol": {
    name: "GPT-6 Sol",
    category: "flagship",
    categoryLabel: "GPT-6 Vyvážený",
    isReasoning: false,
    description: "Stabilní pracovní model řady GPT-6 s 1.05M kontextovým oknem.",
    contextWindow: "1.05M",
  },
  "gpt-6-luna": {
    name: "GPT-6 Luna",
    category: "fast",
    categoryLabel: "GPT-6 Bleskový & Úsporný",
    isReasoning: false,
    description: "Bleskurychlý a cenově nejefektivnější model generace GPT-6 s 1.05M kontextem pro hromadné operace.",
    isRecommended: true,
    contextWindow: "1.05M",
  },
  "gpt-6-instant": {
    name: "GPT-6 Instant",
    category: "fast",
    categoryLabel: "GPT-6 Interaktivní",
    isReasoning: false,
    description: "Interaktivní model optimalizovaný pro nízkou latenci a okamžité dynamické generování.",
    contextWindow: "1.05M",
  },
  "gpt-6-cyber": {
    name: "GPT-6 Cyber",
    category: "reasoning",
    categoryLabel: "GPT-6 Bezpečnostní",
    isReasoning: true,
    description: "Specializovaný model pro hloubkovou analýzu bezpečnostních standardů a zranitelností.",
    contextWindow: "1.05M",
  },
  "gpt-4o": {
    name: "GPT-4o (Omni)",
    category: "flagship",
    categoryLabel: "Vlajkový model",
    isReasoning: false,
    description: "Vlajkový multimodální model s vysokou inteligencí, rychlostí a přesností.",
    isRecommended: true,
    contextWindow: "128k",
  },
  "chatgpt-4o-latest": {
    name: "ChatGPT-4o Latest",
    category: "flagship",
    categoryLabel: "Vlajkový model",
    isReasoning: false,
    description: "Dynamicky aktualizovaná verze modelu GPT-4o používaná v ChatGPT rozhraní.",
    contextWindow: "128k",
  },
  "gpt-4o-mini": {
    name: "GPT-4o mini",
    category: "fast",
    categoryLabel: "Rychlý & Úsporný",
    isReasoning: false,
    description: "Cenově nejefektivnější a extrémně rychlý model pro standardní úlohy.",
    isRecommended: true,
    contextWindow: "128k",
  },
  "o3-mini": {
    name: "o3-mini",
    category: "reasoning",
    categoryLabel: "Pokročilé uvažování",
    isReasoning: true,
    description: "Nejnovější rychlý reasoning model pro hlubokou technickou a normovou analýzu.",
    isRecommended: true,
    contextWindow: "200k",
  },
  "o1": {
    name: "o1",
    category: "reasoning",
    categoryLabel: "Nejvyšší inteligence",
    isReasoning: true,
    description: "Plný uvažovací model s maximální přesností pro komplexní inženýrské výpočty.",
    isRecommended: true,
    contextWindow: "200k",
  },
  "o1-mini": {
    name: "o1-mini",
    category: "reasoning",
    categoryLabel: "Reasoning Mini",
    isReasoning: true,
    description: "Rychlý uvažovací model pro logické a technické analýzy.",
    contextWindow: "128k",
  },
  "o1-preview": {
    name: "o1 Preview",
    category: "reasoning",
    categoryLabel: "Reasoning Preview",
    isReasoning: true,
    description: "Preview verze pokročilého uvažovacího modelu pro hluboké řetězce myšlenek.",
    contextWindow: "128k",
  },
  "o4-mini": {
    name: "o4-mini",
    category: "reasoning",
    categoryLabel: "Next-gen Reasoning Mini",
    isReasoning: true,
    description: "Budoucí generace rychlých reasoning modelů pro normová posouzení.",
    contextWindow: "128k",
  },
  "gpt-4.5-preview": {
    name: "GPT-4.5 Preview",
    category: "preview",
    categoryLabel: "Náhled nové generace",
    isReasoning: false,
    description: "Největší model s hlubokým porozuměním světu a rozsáhlou znalostní bází.",
    contextWindow: "128k",
  },
  "gpt-4-turbo": {
    name: "GPT-4 Turbo",
    category: "flagship",
    categoryLabel: "Předchozí vlajková loď",
    isReasoning: false,
    description: "Vysoce schopný model s podporou vidění a velkého kontextového okna.",
    contextWindow: "128k",
  },
  "gpt-4": {
    name: "GPT-4",
    category: "legacy",
    categoryLabel: "Předchozí generace",
    isReasoning: false,
    description: "Původní model GPT-4 pro komplexní úlohy.",
    contextWindow: "8k",
  },
  "gpt-4-32k": {
    name: "GPT-4 (32k)",
    category: "legacy",
    categoryLabel: "Předchozí generace",
    isReasoning: false,
    description: "Rozšířená 32k kontextová verze původního GPT-4.",
    contextWindow: "32k",
  },
  "gpt-3.5-turbo": {
    name: "GPT-3.5 Turbo",
    category: "legacy",
    categoryLabel: "Základní model",
    isReasoning: false,
    description: "Starší základní model pro jednoduché textové úkoly.",
    contextWindow: "16k",
  },
};
