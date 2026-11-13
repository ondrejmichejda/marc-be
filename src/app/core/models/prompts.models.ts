export type PromptScheduledTime = "6am" | "9am" | "1pm" | "5pm";

export const SCHEDULED_TIME_OPTIONS: readonly PromptScheduledTime[] = [
  "6am",
  "9am",
  "1pm",
  "5pm",
] as const;

export interface ScheduledTimeInfo {
  id: PromptScheduledTime;
  timeLabel: string;
  displayTime: string;
  period: "Morning" | "Afternoon" | "Evening";
  icon: string;
  description: string;
  colorClass: {
    bg: string;
    text: string;
    border: string;
    badge: string;
  };
}

export const SCHEDULED_TIME_DETAILS: Record<PromptScheduledTime, ScheduledTimeInfo> = {
  "6am": {
    id: "6am",
    timeLabel: "6:00 AM",
    displayTime: "06:00",
    period: "Morning",
    icon: "🌄",
    description: "Early morning prompt execution at 6:00 AM",
    colorClass: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      border: "border-emerald-500/30",
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
  },
  "9am": {
    id: "9am",
    timeLabel: "9:00 AM",
    displayTime: "09:00",
    period: "Morning",
    icon: "🌅",
    description: "Morning prompt execution at 9:00 AM",
    colorClass: {
      bg: "bg-amber-500/10",
      text: "text-amber-300",
      border: "border-amber-500/30",
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
  },
  "1pm": {
    id: "1pm",
    timeLabel: "1:00 PM",
    displayTime: "13:00",
    period: "Afternoon",
    icon: "☀️",
    description: "Afternoon prompt execution at 1:00 PM",
    colorClass: {
      bg: "bg-sky-500/10",
      text: "text-sky-300",
      border: "border-sky-500/30",
      badge: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    },
  },
  "5pm": {
    id: "5pm",
    timeLabel: "5:00 PM",
    displayTime: "17:00",
    period: "Evening",
    icon: "🌇",
    description: "Evening prompt execution at 5:00 PM",
    colorClass: {
      bg: "bg-purple-500/10",
      text: "text-purple-300",
      border: "border-purple-500/30",
      badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    },
  },
};

export interface ScheduledAiPrompt {
  id: string;
  userId: string;
  userEmail?: string;
  prompt: string;
  scheduledTime: PromptScheduledTime;
  title: string;
  model: string;
  isActive: boolean;
  lastRunAt?: string;
  lastRunResult?: string;
  createdAt: string;
  updatedAt: string;
}

export type AiPrompt = ScheduledAiPrompt;

export interface CreateScheduledPromptInput {
  userId?: string;
  userEmail?: string;
  prompt: string;
  scheduledTime: PromptScheduledTime | string;
  title?: string;
  isActive?: boolean;
}

export interface UpdateScheduledPromptInput {
  prompt?: string;
  scheduledTime?: PromptScheduledTime | string;
  title?: string;
  isActive?: boolean;
}

export interface ScheduledPromptsSummary {
  total: number;
  active: number;
  paused: number;
  byTime: {
    "6am": number;
    "9am": number;
    "1pm": number;
    "5pm": number;
  };
}

export interface PromptCronExecutionResult {
  promptId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  title: string;
  scheduledTime: PromptScheduledTime;
  success: boolean;
  completionPreview?: string;
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
  };
  error?: string;
}

export interface PromptCronBatchSummary {
  timestamp: string;
  targetTime: PromptScheduledTime | "all";
  totalFound: number;
  executed: number;
  successful: number;
  failed: number;
  results: PromptCronExecutionResult[];
  scheduler?: string;
  authReason?: string;
  totalDurationMs?: number;
  cronConfigured?: boolean;
}

export interface RunPromptResponse {
  success: boolean;
  message?: string;
  execution?: PromptCronExecutionResult;
  completion?: string;
  durationMs?: number;
  error?: string;
}
