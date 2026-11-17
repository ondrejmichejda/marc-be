export interface TrackerResetLog {
  id: string;
  trackerId: string;
  userId: string;
  resetAt: string;
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
  lastResetAt: string;
  notificationSentAt?: string;
  createdAt: string;
  updatedAt: string;
  // Computed helpers
  elapsedSeconds?: number;
  remainingSeconds?: number;
  overflowSeconds?: number;
  overflowPercentage?: number;
  progressPercentage?: number;
  isCompleted?: boolean;
  resetsCount?: number;
  recentResets?: TrackerResetLog[];
}

export interface CreateTrackerInput {
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

export interface TrackersResponse {
  success: boolean;
  userId: string;
  count: number;
  trackers: TrackedItem[];
  summary: TrackersSummary;
}

export interface TrackerResponse {
  success: boolean;
  tracker: TrackedItem;
  message?: string;
}

export interface ResetTrackerResponse {
  success: boolean;
  tracker: TrackedItem;
  resetLog: TrackerResetLog;
  message: string;
}

export interface TrackerResetsResponse {
  success: boolean;
  trackerId: string;
  count: number;
  resets: TrackerResetLog[];
}
