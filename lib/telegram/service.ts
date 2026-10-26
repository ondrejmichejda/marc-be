import { getTelegramBot } from "./bot";
import { formatTaskSummary, createTaskKeyboard } from "./handlers/taskHandler";
import { MessageService } from "./messages";
import { SubscriberService } from "./subscribers";
import {
  BroadcastResult,
  DeploymentNotificationOptions,
  TaskItem,
} from "./types";

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
    const sent = await bot.api.sendMessage(chatId, text, {
      parse_mode: options?.parseMode || "Markdown",
    });

    const numericChatId = typeof chatId === "number" ? chatId : parseInt(chatId, 10);
    if (!Number.isNaN(numericChatId)) {
      MessageService.logMessage({
        messageId: sent?.message_id,
        chatId: numericChatId,
        text,
        direction: "outgoing",
        messageType: "message",
        rawPayload: sent,
      }).catch((err) => {
        console.error("[TelegramService] Error logging outgoing message:", err);
      });
    }
  }

  /**
   * Broadcasts a message to all active subscribers.
   * Includes rate limiting and automatic deactivation of inactive/blocked users.
   */
  static async broadcastMessage(
    text: string,
    options?: { parseMode?: "Markdown" | "HTML" }
  ): Promise<BroadcastResult> {
    const activeSubscribers = await SubscriberService.getActiveSubscribers();
    const result: BroadcastResult = {
      total: activeSubscribers.length,
      sent: 0,
      failed: 0,
      deactivated: 0,
      errors: [],
    };

    if (activeSubscribers.length === 0) {
      console.log("[TelegramService] No active subscribers found for broadcast.");
      return result;
    }

    const bot = getTelegramBot();

    for (const sub of activeSubscribers) {
      try {
        const sent = await bot.api.sendMessage(sub.chatId, text, {
          parse_mode: options?.parseMode || "Markdown",
        });
        result.sent++;

        MessageService.logMessage({
          messageId: sent?.message_id,
          chatId: sub.chatId,
          userId: sub.userId,
          username: sub.username,
          firstName: sub.firstName,
          lastName: sub.lastName,
          chatType: sub.chatType,
          text,
          direction: "outgoing",
          messageType: "broadcast",
          rawPayload: sent,
        }).catch((err) => {
          console.error("[TelegramService] Error logging broadcast message:", err);
        });

        // Rate limit: sleep ~35ms to respect Telegram's ~30 msg/sec limit
        await new Promise((resolve) => setTimeout(resolve, 35));
      } catch (err: unknown) {
        result.failed++;
        const errorMessage = (err as Error).message || String(err);

        result.errors?.push({
          chatId: sub.chatId,
          error: errorMessage,
        });

        // Check if user has blocked the bot or chat is inaccessible
        const isBlocked =
          errorMessage.includes("bot was blocked by the user") ||
          errorMessage.includes("chat not found") ||
          errorMessage.includes("user is deactivated") ||
          errorMessage.includes("bot was kicked");

        if (isBlocked) {
          result.deactivated++;
          await SubscriberService.deactivateChat(sub.chatId);
        }

        console.error(
          `[TelegramService] Failed to send broadcast to ${sub.chatId}:`,
          errorMessage
        );
      }
    }

    console.log(
      `[TelegramService] Broadcast finished: ${result.sent}/${result.total} sent, ${result.failed} failed, ${result.deactivated} deactivated.`
    );

    return result;
  }

  /**
   * Broadcasts a deployment notification message to all subscribers.
   */
  static async broadcastDeploymentNotification(
    options?: DeploymentNotificationOptions
  ): Promise<BroadcastResult> {
    const deployId =
      options?.deployId ||
      process.env.DEPLOYMENT_ID ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      process.env.npm_package_version;

    // Check if this specific deployment has already been notified
    if (deployId && !options?.force) {
      const alreadyNotified = await SubscriberService.hasNotifiedDeployment(
        deployId
      );
      if (alreadyNotified) {
        console.log(
          `[TelegramService] Deployment notification already sent for ${deployId}. Skipping.`
        );
        return {
          total: 0,
          sent: 0,
          failed: 0,
          deactivated: 0,
        };
      }
    }

    // Build notification message
    let text = `🚀 *New Deployment Update*\n\n`;

    if (options?.message) {
      text += `${options.message}\n\n`;
    } else {
      text += `A new version of the bot backend has been successfully deployed.\n\n`;
    }

    if (options?.version) {
      text += `📌 *Version:* \`${options.version}\`\n`;
    }

    if (options?.releaseNotes) {
      text += `\n📝 *Release Notes:*\n${options.releaseNotes}\n`;
    }

    text += `\n⏰ _Deployed at:_ \`${new Date().toISOString()}\``;

    const result = await this.broadcastMessage(text, { parseMode: "Markdown" });

    // Mark deployment as notified if deployId is known
    if (deployId) {
      await SubscriberService.markDeploymentNotified(deployId);
    }

    return result;
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
