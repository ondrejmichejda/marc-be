export interface TrackerDuration {
  days: number;
  hours: number;
  minutes: number;
}

export interface TrackerResetLog {
  id: string;
  trackerId: string;
  userId: string;
  resetAt: string; // ISO string
  elapsedSeconds: number;
  note?: string;
  createdAt: string;
}

export interface TrackedItem {
  id: string;
  userId: string;
  name: string;
  durationDays: number;
  durationHours: number;
  durationMinutes: number;
  totalDurationSeconds: number;
  notifyTelegram: boolean;
  lastResetAt: string; // ISO string
  notificationSentAt?: string;
  createdAt: string;
  updatedAt: string;
  // Computed helpers for API responses
  elapsedSeconds?: number;
  remainingSeconds?: number;
  overflowSeconds?: number;
  progressPercentage?: number; // 0 to 100
  isCompleted?: boolean;
  resetsCount?: number;
  recentResets?: TrackerResetLog[];
}

export interface CreateTrackerInput {
  userId: string;
  name: string;
  durationDays?: number;
  durationHours?: number;
  durationMinutes?: number;
  notifyTelegram?: boolean;
}

export interface UpdateTrackerInput {
  name?: string;
  durationDays?: number;
  durationHours?: number;
  durationMinutes?: number;
  notifyTelegram?: boolean;
  lastResetAt?: string;
}

export interface ResetTrackerInput {
  note?: string;
}

export interface TrackersSummary {
  total: number;
  active: number;
  completed: number;
  telegramEnabled: number;
  totalResets: number;
}
