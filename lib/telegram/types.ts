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
 * Subscriber / Chat tracking information
 */
export interface Subscriber {
  chatId: number;
  userId?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  chatType?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Options for broadcasting deployment notifications
 */
export interface DeploymentNotificationOptions {
  version?: string;
  message?: string;
  releaseNotes?: string;
  deployId?: string;
  force?: boolean;
}

/**
 * Result metrics for broadcast operations
 */
export interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
  deactivated: number;
  errors?: Array<{ chatId: number; error: string }>;
}

/**
 * Message direction (incoming from user vs outgoing from bot)
 */
export type MessageDirection = "incoming" | "outgoing";

/**
 * Stored message log entry
 */
export interface MessageLog {
  id: number | string;
  updateId?: number;
  messageId?: number;
  chatId: number;
  userId?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  chatType: string;
  text?: string;
  direction: MessageDirection;
  messageType: string;
  rawPayload?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Custom context for GrammY if needed for custom session/state
 */
export type BotContext = Context;
