import { Context } from "grammy";

/**
 * Task status types
 */
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

/**
 * Task priority levels
 */
export type TaskPriority = "low" | "medium" | "high";

/**
 * Representation of a task created or managed via Telegram
 */
export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  telegramChatId: number;
  telegramUserId: number;
  telegramUsername?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  metadata?: Record<string, unknown>;
}

/**
 * Custom context for GrammY if needed for custom session/state
 */
export type BotContext = Context;
