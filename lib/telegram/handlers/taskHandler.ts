import { InlineKeyboard } from "grammy";
import { ensureDb, isDbConfigured } from "../../db";
import { BotContext, TaskItem, TaskPriority, TaskStatus } from "../types";

/**
 * In-memory fallback task repository.
 */
const taskStore = new Map<string, TaskItem>();

/**
 * Creates a unique task ID (e.g. TASK-173000-XYZ)
 */
function generateTaskId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TASK-${timestamp}-${random}`;
}

function mapTaskRow(row: Record<string, unknown>): TaskItem {
  let metadata: Record<string, unknown> | undefined;
  if (row.metadata) {
    if (typeof row.metadata === "string") {
      try {
        metadata = JSON.parse(row.metadata);
      } catch {
        metadata = undefined;
      }
    } else if (typeof row.metadata === "object") {
      metadata = row.metadata as Record<string, unknown>;
    }
  }

  return {
    id: String(row.id),
    title: String(row.title),
    description: (row.description as string) || undefined,
    status: (row.status as TaskStatus) || "pending",
    priority: (row.priority as TaskPriority) || "medium",
    telegramChatId: Number(row.telegram_chat_id || 0),
    telegramUserId: Number(row.telegram_user_id || 0),
    telegramUsername: (row.telegram_username as string) || undefined,
    metadata,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at as string | number).toISOString(),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : new Date(row.updated_at as string | number).toISOString(),
  };
}

/**
 * Formats a task into a user-friendly Markdown message.
 */
export function formatTaskSummary(task: TaskItem): string {
  const statusEmoji: Record<TaskStatus, string> = {
    pending: "⏳ Pending",
    in_progress: "🔄 In Progress",
    completed: "✅ Completed",
    cancelled: "❌ Cancelled",
  };

  const priorityEmoji: Record<TaskPriority, string> = {
    low: "🟢 Low",
    medium: "🟡 Medium",
    high: "🔴 High",
  };

  return (
    `📋 *Task Details*\n\n` +
    `*ID:* \`${task.id}\`\n` +
    `*Title:* ${task.title}\n` +
    (task.description ? `*Description:* ${task.description}\n` : "") +
    `*Status:* ${statusEmoji[task.status] || task.status}\n` +
    `*Priority:* ${priorityEmoji[task.priority] || task.priority}\n` +
    `*Created by:* @${task.telegramUsername || "Unknown"} (ID: \`${task.telegramUserId}\`)\n` +
    `*Created at:* ${new Date(task.createdAt).toLocaleString()}`
  );
}

/**
 * Creates inline keyboard buttons for quick task status updates.
 */
export function createTaskKeyboard(taskId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔄 In Progress", `task:status:${taskId}:in_progress`)
    .text("✅ Complete", `task:status:${taskId}:completed`)
    .row()
    .text("❌ Cancel", `task:status:${taskId}:cancelled`)
    .text("ℹ️ Refresh", `task:refresh:${taskId}`);
}

/**
 * Service for managing tasks created from Telegram or API.
 * Uses persistent PostgreSQL (Neon DB) storage with in-memory fallback.
 */
export class TaskService {
  /**
   * Save a new task
   */
  static async createTask(params: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    telegramChatId: number;
    telegramUserId: number;
    telegramUsername?: string;
    metadata?: Record<string, unknown>;
  }): Promise<TaskItem> {
    const id = generateTaskId();
    const now = new Date().toISOString();

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = await sql`
          INSERT INTO tasks (
            id, title, description, status, priority, telegram_chat_id, telegram_user_id, telegram_username, metadata, created_at, updated_at
          )
          VALUES (
            ${id},
            ${params.title.trim()},
            ${params.description?.trim() ?? null},
            'pending',
            ${params.priority || "medium"},
            ${params.telegramChatId},
            ${params.telegramUserId},
            ${params.telegramUsername ?? null},
            ${params.metadata ? JSON.stringify(params.metadata) : null},
            NOW(),
            NOW()
          )
          RETURNING *;
        `;

        if (rows.length > 0) {
          const task = mapTaskRow(rows[0] as Record<string, unknown>);
          console.log(`[TaskService] Created task in DB ${id}: "${task.title}"`);
          return task;
        }
      } catch (err) {
        console.error(
          "[TaskService] DB error in createTask, falling back to in-memory store:",
          err
        );
      }
    }

    const task: TaskItem = {
      id,
      title: params.title.trim(),
      description: params.description?.trim(),
      status: "pending",
      priority: params.priority || "medium",
      telegramChatId: params.telegramChatId,
      telegramUserId: params.telegramUserId,
      telegramUsername: params.telegramUsername,
      createdAt: now,
      updatedAt: now,
      metadata: params.metadata,
    };

    taskStore.set(id, task);
    console.log(`[TaskService] Created task ${id}: "${task.title}"`);

    return task;
  }

  /**
   * Get a task by ID
   */
  static async getTask(id: string): Promise<TaskItem | undefined> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = await sql`
          SELECT * FROM tasks
          WHERE id = ${id}
          LIMIT 1;
        `;

        if (rows.length > 0) {
          return mapTaskRow(rows[0] as Record<string, unknown>);
        }
        return undefined;
      } catch (err) {
        console.error(
          "[TaskService] DB error in getTask, falling back to in-memory store:",
          err
        );
      }
    }

    return taskStore.get(id);
  }

  /**
   * List all tasks, optionally filtered by user or chat
   */
  static async listTasks(filters?: {
    telegramUserId?: number;
    telegramChatId?: number;
    status?: TaskStatus;
  }): Promise<TaskItem[]> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        let rows: Array<Record<string, unknown>>;

        if (filters?.telegramUserId && filters?.status) {
          rows = (await sql`
            SELECT * FROM tasks
            WHERE telegram_user_id = ${filters.telegramUserId} AND status = ${filters.status}
            ORDER BY created_at DESC;
          `) as Array<Record<string, unknown>>;
        } else if (filters?.telegramChatId && filters?.status) {
          rows = (await sql`
            SELECT * FROM tasks
            WHERE telegram_chat_id = ${filters.telegramChatId} AND status = ${filters.status}
            ORDER BY created_at DESC;
          `) as Array<Record<string, unknown>>;
        } else if (filters?.telegramUserId) {
          rows = (await sql`
            SELECT * FROM tasks
            WHERE telegram_user_id = ${filters.telegramUserId}
            ORDER BY created_at DESC;
          `) as Array<Record<string, unknown>>;
        } else if (filters?.telegramChatId) {
          rows = (await sql`
            SELECT * FROM tasks
            WHERE telegram_chat_id = ${filters.telegramChatId}
            ORDER BY created_at DESC;
          `) as Array<Record<string, unknown>>;
        } else if (filters?.status) {
          rows = (await sql`
            SELECT * FROM tasks
            WHERE status = ${filters.status}
            ORDER BY created_at DESC;
          `) as Array<Record<string, unknown>>;
        } else {
          rows = (await sql`
            SELECT * FROM tasks
            ORDER BY created_at DESC;
          `) as Array<Record<string, unknown>>;
        }

        return rows.map(mapTaskRow);
      } catch (err) {
        console.error(
          "[TaskService] DB error in listTasks, falling back to in-memory store:",
          err
        );
      }
    }

    let tasks = Array.from(taskStore.values());

    if (filters?.telegramUserId) {
      tasks = tasks.filter((t) => t.telegramUserId === filters.telegramUserId);
    }
    if (filters?.telegramChatId) {
      tasks = tasks.filter((t) => t.telegramChatId === filters.telegramChatId);
    }
    if (filters?.status) {
      tasks = tasks.filter((t) => t.status === filters.status);
    }

    // Sort newest first
    return tasks.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Update task status
   */
  static async updateStatus(
    id: string,
    status: TaskStatus
  ): Promise<TaskItem | null> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = await sql`
          UPDATE tasks
          SET status = ${status}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING *;
        `;

        if (rows.length > 0) {
          const task = mapTaskRow(rows[0] as Record<string, unknown>);
          console.log(`[TaskService] Updated task in DB ${id} status to ${status}`);
          return task;
        }
        return null;
      } catch (err) {
        console.error(
          "[TaskService] DB error in updateStatus, falling back to in-memory store:",
          err
        );
      }
    }

    const task = taskStore.get(id);
    if (!task) return null;

    task.status = status;
    task.updatedAt = new Date().toISOString();
    taskStore.set(id, task);

    console.log(`[TaskService] Updated task ${id} status to ${status}`);
    return task;
  }
}

/**
 * Handles callback queries triggered by inline keyboard buttons
 */
export async function handleTaskCallbackQuery(ctx: BotContext): Promise<void> {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData || !callbackData.startsWith("task:")) {
    return;
  }

  const parts = callbackData.split(":");
  const action = parts[1];
  const taskId = parts[2];

  if (action === "status") {
    const newStatus = parts[3] as TaskStatus;
    const updated = await TaskService.updateStatus(taskId, newStatus);

    if (!updated) {
      await ctx.answerCallbackQuery({ text: "Task not found!" });
      return;
    }

    await ctx.answerCallbackQuery({
      text: `Task updated to ${newStatus}!`,
    });

    // Update the message in the chat
    try {
      await ctx.editMessageText(formatTaskSummary(updated), {
        parse_mode: "Markdown",
        reply_markup: createTaskKeyboard(taskId),
      });
    } catch {
      // Telegram throws an error if message content didn't change
    }
  } else if (action === "refresh") {
    const task = await TaskService.getTask(taskId);
    if (!task) {
      await ctx.answerCallbackQuery({ text: "Task not found!" });
      return;
    }

    await ctx.answerCallbackQuery({ text: "Refreshed!" });

    try {
      await ctx.editMessageText(formatTaskSummary(task), {
        parse_mode: "Markdown",
        reply_markup: createTaskKeyboard(taskId),
      });
    } catch {
      // Content didn't change
    }
  }
}
