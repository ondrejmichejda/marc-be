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

export interface OpenAiConfigStatus {
  isConfigured: boolean;
  apiKeyConfigured: boolean;
  defaultModel: string;
  maskedKey?: string;
  organization?: string;
  availableModels: string[];
}
