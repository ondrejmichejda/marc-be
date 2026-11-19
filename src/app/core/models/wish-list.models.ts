export type WaitingPeriod = '1week' | '2weeks' | '1month';

export interface WaitingPeriodOption {
  value: WaitingPeriod;
  label: string;
  days: number;
}

export const WAITING_PERIOD_OPTIONS: WaitingPeriodOption[] = [
  { value: '1week', label: '1 week', days: 7 },
  { value: '2weeks', label: '2 weeks', days: 14 },
  { value: '1month', label: '1 month', days: 30 },
];

export interface WishItem {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: string; // ISO string (Created Date metadata)
  updatedAt: string; // ISO string
  waitingPeriod: WaitingPeriod;
  counter: number;
  maxCounter: number;
  notifyTelegram?: boolean;
  notificationSentAt?: string;
  targetDate?: string;
  daysTotal?: number;
  daysElapsed?: number;
  daysRemaining?: number;
  isPeriodCompleted?: boolean;
  periodProgressPercentage?: number;
  isCounterReached?: boolean;
  counterProgressPercentage?: number;
}

export interface CreateWishInput {
  userId?: string;
  name: string;
  description?: string;
  waitingPeriod: WaitingPeriod;
  counter?: number;
  maxCounter?: number;
  notifyTelegram?: boolean;
}

export interface UpdateWishInput {
  name?: string;
  description?: string;
  waitingPeriod?: WaitingPeriod;
  counter?: number;
  maxCounter?: number;
  notifyTelegram?: boolean;
}

export interface WishesSummary {
  total: number;
  waiting: number;
  ready: number;
  completed: number;
}

export interface WishesResponse {
  success: boolean;
  userId: string;
  count: number;
  wishes: WishItem[];
  summary: WishesSummary;
}

export interface WishResponse {
  success: boolean;
  wish: WishItem;
  message?: string;
}
