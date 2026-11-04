export type PromptScheduledTime = "9am" | "1pm" | "5pm";

export const SCHEDULED_TIME_OPTIONS: readonly PromptScheduledTime[] = [
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

export function isValidScheduledTime(value: unknown): value is PromptScheduledTime {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return SCHEDULED_TIME_OPTIONS.includes(normalized as PromptScheduledTime);
}

export function normalizeScheduledTime(value: string): PromptScheduledTime {
  if (typeof value !== "string") {
    throw new Error(`Invalid scheduled time '${value}'. Allowed options are: 9am, 1pm, 5pm.`);
  }
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  if (
    normalized === "9am" ||
    normalized === "09:00" ||
    normalized === "9:00" ||
    normalized === "9:00am" ||
    normalized === "09:00am"
  ) {
    return "9am";
  }
  if (
    normalized === "1pm" ||
    normalized === "13:00" ||
    normalized === "1:00" ||
    normalized === "1:00pm" ||
    normalized === "01:00pm" ||
    normalized === "13:00pm"
  ) {
    return "1pm";
  }
  if (
    normalized === "5pm" ||
    normalized === "17:00" ||
    normalized === "5:00" ||
    normalized === "5:00pm" ||
    normalized === "05:00pm" ||
    normalized === "17:00pm"
  ) {
    return "5pm";
  }
  if (isValidScheduledTime(normalized)) {
    return normalized;
  }
  throw new Error(`Invalid scheduled time '${value}'. Allowed options are: 9am, 1pm, 5pm.`);
}

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

export interface CreateScheduledPromptInput {
  userId: string;
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
    "9am": number;
    "1pm": number;
    "5pm": number;
  };
}
