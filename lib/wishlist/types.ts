export type WaitingPeriod = "1week" | "2weeks" | "1month";

export interface WaitingPeriodOption {
  value: WaitingPeriod;
  label: string;
  days: number;
}

export const WAITING_PERIOD_OPTIONS: WaitingPeriodOption[] = [
  { value: "1week", label: "1 week", days: 7 },
  { value: "2weeks", label: "2 weeks", days: 14 },
  { value: "1month", label: "1 month", days: 30 },
];

export interface WishItem {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: string; // ISO string - created date metadata
  updatedAt: string; // ISO string
  waitingPeriod: WaitingPeriod;
  counter: number;
  maxCounter: number;
  notifyTelegram?: boolean;
  notificationSentAt?: string; // ISO string when Telegram notification was dispatched
  // Computed helpers
  targetDate?: string; // ISO string: createdAt + waiting period
  daysTotal?: number;
  daysElapsed?: number;
  daysRemaining?: number;
  isPeriodCompleted?: boolean;
  periodProgressPercentage?: number; // 0 to 100
  isCounterReached?: boolean;
  counterProgressPercentage?: number; // 0 to 100
}

export interface CreateWishInput {
  userId: string;
  name: string;
  description?: string;
  waitingPeriod?: WaitingPeriod | string;
  counter?: number;
  maxCounter?: number;
  notifyTelegram?: boolean;
  createdAt?: string; // Optional custom created date (for testing or backdating)
}

export interface UpdateWishInput {
  name?: string;
  description?: string;
  waitingPeriod?: WaitingPeriod | string;
  counter?: number;
  maxCounter?: number;
  notifyTelegram?: boolean;
}

export interface WishesSummary {
  total: number;
  waiting: number; // in waiting period
  ready: number; // waiting period completed
  completed: number; // counter reached maxCounter
}
