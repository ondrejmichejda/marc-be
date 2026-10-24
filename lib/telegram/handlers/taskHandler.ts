import { InlineKeyboard } from "grammy";
import { BotContext, TaskItem, TaskPriority, TaskStatus } from "../types";

/**
 * In-memory task repository.
 * NOTE: For production, replace this with your database (e.g. Prisma, PostgreSQL, MongoDB, Redis).
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
 * Service for managing tasks created from Telegram
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

    // You can trigger backend processing, push to a queue, or notify external services here
    console.log(`[TaskService] Created task ${id}: "${task.title}"`);

    return task;
  }

  /**
   * Get a task by ID
   */
  static async getTask(id: string): Promise<TaskItem | undefined> {
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
  static async updateStatus(id: string, status: TaskStatus): Promise<TaskItem | null> {
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
