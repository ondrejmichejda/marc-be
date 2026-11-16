export type PromptScheduledTime =
  | "12am"
  | "1am"
  | "2am"
  | "3am"
  | "4am"
  | "5am"
  | "6am"
  | "7am"
  | "8am"
  | "9am"
  | "10am"
  | "11am"
  | "12pm"
  | "1pm"
  | "2pm"
  | "3pm"
  | "4pm"
  | "5pm"
  | "6pm"
  | "7pm"
  | "8pm"
  | "9pm"
  | "10pm"
  | "11pm";

export const SCHEDULED_TIME_OPTIONS: readonly PromptScheduledTime[] = [
  "12am",
  "1am",
  "2am",
  "3am",
  "4am",
  "5am",
  "6am",
  "7am",
  "8am",
  "9am",
  "10am",
  "11am",
  "12pm",
  "1pm",
  "2pm",
  "3pm",
  "4pm",
  "5pm",
  "6pm",
  "7pm",
  "8pm",
  "9pm",
  "10pm",
  "11pm",
] as const;

export type TimePeriod = "Morning" | "Afternoon" | "Evening" | "Night";

export interface ScheduledTimeInfo {
  id: PromptScheduledTime;
  timeLabel: string;
  displayTime: string;
  period: TimePeriod;
  icon: string;
  description: string;
  colorClass: {
    bg: string;
    text: string;
    border: string;
    badge: string;
  };
}

export function hourToScheduledTime(hour: number): PromptScheduledTime {
  const h = ((hour % 24) + 24) % 24;
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  if (h < 12) return `${h}am` as PromptScheduledTime;
  return `${h - 12}pm` as PromptScheduledTime;
}

export function scheduledTimeToHour(time: PromptScheduledTime): number {
  if (time === "12am") return 0;
  if (time === "12pm") return 12;
  if (time.endsWith("pm")) return parseInt(time, 10) + 12;
  return parseInt(time, 10);
}

function buildScheduledTimeDetails(): Record<PromptScheduledTime, ScheduledTimeInfo> {
  const details = {} as Record<PromptScheduledTime, ScheduledTimeInfo>;
  for (let hour = 0; hour < 24; hour++) {
    const id = hourToScheduledTime(hour);
    const displayTime = `${String(hour).padStart(2, "0")}:00`;
    let period: TimePeriod;
    let icon: string;
    let colorClass: ScheduledTimeInfo["colorClass"];

    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? "AM" : "PM";
    const timeLabel = `${hour12}:00 ${ampm}`;

    if (hour >= 5 && hour < 12) {
      period = "Morning";
      icon = hour <= 6 ? "🌄" : "🌅";
      colorClass =
        hour <= 6
          ? {
              bg: "bg-emerald-500/10",
              text: "text-emerald-300",
              border: "border-emerald-500/30",
              badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
            }
          : {
              bg: "bg-amber-500/10",
              text: "text-amber-300",
              border: "border-amber-500/30",
              badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
            };
    } else if (hour >= 12 && hour < 17) {
      period = "Afternoon";
      icon = "☀️";
      colorClass = {
        bg: "bg-sky-500/10",
        text: "text-sky-300",
        border: "border-sky-500/30",
        badge: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      };
    } else if (hour >= 17 && hour < 21) {
      period = "Evening";
      icon = "🌇";
      colorClass = {
        bg: "bg-purple-500/10",
        text: "text-purple-300",
        border: "border-purple-500/30",
        badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      };
    } else {
      period = "Night";
      icon = "🌙";
      colorClass = {
        bg: "bg-indigo-500/10",
        text: "text-indigo-300",
        border: "border-indigo-500/30",
        badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      };
    }

    details[id] = {
      id,
      timeLabel,
      displayTime,
      period,
      icon,
      description: `Prompt execution at ${timeLabel} (${displayTime})`,
      colorClass,
    };
  }
  return details;
}

export const SCHEDULED_TIME_DETAILS: Record<PromptScheduledTime, ScheduledTimeInfo> =
  buildScheduledTimeDetails();

export function isValidScheduledTime(value: unknown): value is PromptScheduledTime {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  return (SCHEDULED_TIME_OPTIONS as readonly string[]).includes(normalized);
}

export function normalizeScheduledTime(value: string): PromptScheduledTime {
  if (typeof value !== "string") {
    throw new Error(
      `Invalid scheduled time '${value}'. Allowed options are any hour of the day (e.g. 6am, 9am, 1pm, 5pm, 13:00, 08:00).`
    );
  }
  const clean = value.trim().toLowerCase().replace(/\s+/g, "");
  if (!clean) {
    throw new Error(
      `Invalid scheduled time '${value}'. Allowed options are any hour of the day (e.g. 6am, 9am, 1pm, 5pm, 13:00, 08:00).`
    );
  }

  // Exact match with predefined options (e.g. "6am", "1pm", "12am")
  if ((SCHEDULED_TIME_OPTIONS as readonly string[]).includes(clean)) {
    return clean as PromptScheduledTime;
  }

  // Match 12-hour format with optional minutes (e.g. "6:00am", "06:00am", "6:00 am", "1:00pm", "12:00pm")
  const match12 = clean.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  if (match12) {
    const rawH = parseInt(match12[1], 10);
    const ampm = match12[3];
    if (rawH >= 1 && rawH <= 12) {
      if (rawH === 12) {
        return ampm === "am" ? "12am" : "12pm";
      }
      return `${rawH}${ampm}` as PromptScheduledTime;
    }
  }

  // Match 24-hour format with optional minutes / seconds (e.g. "06:00", "6:00", "13:00", "00:00", "14", "0")
  const match24 = clean.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?$/);
  if (match24) {
    const rawH = parseInt(match24[1], 10);
    if (rawH >= 0 && rawH <= 23) {
      return hourToScheduledTime(rawH);
    }
  }

  throw new Error(
    `Invalid scheduled time '${value}'. Allowed options are any hour of the day (e.g. 6am, 9am, 1pm, 5pm, 13:00, 08:00).`
  );
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
  byTime: Record<string, number>;
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
}
