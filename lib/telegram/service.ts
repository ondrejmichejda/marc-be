import { getTelegramBot } from "./bot";
import { formatTaskSummary, createTaskKeyboard } from "./handlers/taskHandler";
import { TaskItem } from "./types";

/**
 * Service for outgoing Telegram operations from the backend.
 */
export class TelegramService {
  /**
   * Sends a plain or Markdown message to a Telegram chat.
   */
  static async sendMessage(
    chatId: number | string,
    text: string,
    options?: { parseMode?: "Markdown" | "HTML" }
  ): Promise<void> {
    const bot = getTelegramBot();
    await bot.api.sendMessage(chatId, text, {
      parse_mode: options?.parseMode || "Markdown",
    });
  }

  /**
   * Sends a formatted task notification card to a Telegram chat.
   */
  static async sendTaskNotification(
    chatId: number | string,
    task: TaskItem
  ): Promise<void> {
    const bot = getTelegramBot();
    await bot.api.sendMessage(chatId, formatTaskSummary(task), {
      parse_mode: "Markdown",
      reply_markup: createTaskKeyboard(task.id),
    });
  }

  /**
   * Sets the webhook URL with Telegram API.
   */
  static async setWebhook(url: string, secretToken?: string): Promise<boolean> {
    const bot = getTelegramBot();
    return await bot.api.setWebhook(url, {
      secret_token: secretToken,
      allowed_updates: [
        "message",
        "edited_message",
        "callback_query",
        "inline_query",
      ],
    });
  }

  /**
   * Retrieves the current webhook configuration from Telegram.
   */
  static async getWebhookInfo() {
    const bot = getTelegramBot();
    return await bot.api.getWebhookInfo();
  }

  /**
   * Deletes the currently configured webhook.
   */
  static async deleteWebhook(): Promise<boolean> {
    const bot = getTelegramBot();
    return await bot.api.deleteWebhook();
  }

  /**
   * Retrieves basic info about the configured bot.
   */
  static async getBotMe() {
    const bot = getTelegramBot();
    return await bot.api.getMe();
  }
}
