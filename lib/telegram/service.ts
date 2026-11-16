import { getTelegramBot } from "./bot";
import { isTelegramConfigured } from "./config";
import { formatTaskSummary, createTaskKeyboard } from "./handlers/taskHandler";
import { MessageService } from "./messages";
import { SubscriberService, parseFullName } from "./subscribers";
import { UserTelegramSettingsService } from "./userSettings";
import { UserService } from "../auth/userService";
import {
  BroadcastResult,
  DeploymentNotificationOptions,
  Subscriber,
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

  /**
   * Sends a message to a user directly using their configured Telegram ID or user ID.
   */
  static async sendResponseToUserById(params: {
    userId?: string;
    telegramId?: string | number;
    text: string;
    parseMode?: "Markdown" | "HTML";
  }): Promise<{
    success: boolean;
    chatId?: number | string;
    subscriber?: Subscriber;
    messageId?: number;
    error?: string;
  }> {
    let targetTelegramId = params.telegramId !== undefined && params.telegramId !== null
      ? String(params.telegramId).trim()
      : undefined;
    const userId = params.userId;

    if (!targetTelegramId && userId) {
      const settings = await UserTelegramSettingsService.getSettings(userId);
      if (settings?.telegramId && settings.notificationsEnabled) {
        targetTelegramId = settings.telegramId;
      }
    }

    if (!targetTelegramId) {
      return {
        success: false,
        error: `No configured Telegram ID found for user '${userId || "unknown"}'.`,
      };
    }

    const numericChatId = parseInt(targetTelegramId, 10);
    const effectiveChatId = Number.isNaN(numericChatId) ? targetTelegramId : numericChatId;

    try {
      if (!isTelegramConfigured()) {
        await MessageService.logMessage({
          chatId: typeof effectiveChatId === "number" ? effectiveChatId : 0,
          userId: typeof effectiveChatId === "number" ? effectiveChatId : undefined,
          text: params.text,
          direction: "outgoing",
          messageType: "simulated_user_response",
          rawPayload: { simulated: true, telegramId: targetTelegramId, userId },
        });

        return {
          success: true,
          chatId: effectiveChatId,
        };
      }

      const bot = getTelegramBot();
      const sent = await bot.api.sendMessage(effectiveChatId, params.text, {
        parse_mode: params.parseMode || "Markdown",
      });

      await MessageService.logMessage({
        messageId: sent?.message_id,
        chatId: typeof effectiveChatId === "number" ? effectiveChatId : 0,
        userId: typeof effectiveChatId === "number" ? effectiveChatId : undefined,
        text: params.text,
        direction: "outgoing",
        messageType: "user_response",
        rawPayload: sent,
      });

      return {
        success: true,
        chatId: effectiveChatId,
        messageId: sent?.message_id,
      };
    } catch (err) {
      const errorMessage = (err as Error).message || String(err);
      console.error("[TelegramService] Error sending response to user by ID:", errorMessage);

      await MessageService.logMessage({
        chatId: typeof effectiveChatId === "number" ? effectiveChatId : 0,
        userId: typeof effectiveChatId === "number" ? effectiveChatId : undefined,
        text: params.text,
        direction: "outgoing",
        messageType: "user_response_failed",
        rawPayload: { error: errorMessage, telegramId: targetTelegramId, userId },
      });

      return {
        success: false,
        chatId: effectiveChatId,
        error: errorMessage,
      };
    }
  }

  /**
   * Universal method to send response to user via Johan bot.
   * Requires configured personal Telegram ID or explicit Telegram ID.
   * Does NOT map user by name/surname.
   */
  static async sendResponseToUser(params: {
    userId?: string;
    telegramId?: string | number;
    name?: string;
    surname?: string;
    fullName?: string;
    text: string;
    parseMode?: "Markdown" | "HTML";
  }): Promise<{
    success: boolean;
    subscriber?: Subscriber;
    chatId?: number | string;
    messageId?: number;
    error?: string;
  }> {
    return this.sendResponseToUserById({
      userId: params.userId,
      telegramId: params.telegramId,
      text: params.text,
      parseMode: params.parseMode,
    });
  }

  /**
   * Refactored helper: sends response to user over Johan bot.
   * Prioritizes personal Telegram configuration / ID over name matching.
   */
  static async sendResponseToUserByName(params: {
    userId?: string;
    telegramId?: string | number;
    name?: string;
    surname?: string;
    fullName?: string;
    text: string;
    parseMode?: "Markdown" | "HTML";
  }): Promise<{
    success: boolean;
    subscriber?: Subscriber;
    chatId?: number | string;
    messageId?: number;
    error?: string;
  }> {
    return this.sendResponseToUser(params);
  }

  /**
   * Formats and delivers an AI prompt response to a user using Johan bot integration.
   * Strictly requires user's configured personal Telegram ID or explicit Telegram ID.
   * Does NOT map user by name/surname.
   */
  static async sendAiPromptResponse(params: {
    userId?: string;
    telegramId?: string | number;
    userIdentifier?: string;
    userName?: string;
    userSurname?: string;
    userEmail?: string;
    promptTitle?: string;
    promptText?: string;
    completion: string;
    scheduledTime?: string;
  }): Promise<{
    success: boolean;
    subscriber?: Subscriber;
    chatId?: number | string;
    formattedMessage: string;
    error?: string;
  }> {
    const formattedMessage = params.completion?.trim() || "";

    // 1. Direct Telegram ID
    if (params.telegramId) {
      const res = await this.sendMessageToChat(params.telegramId, formattedMessage, {
        messageType: "ai_prompt_response",
      });
      return {
        success: res.success,
        chatId: params.telegramId,
        formattedMessage,
        error: res.error,
      };
    }

    // 2. Configured user Telegram ID lookup by userId or userIdentifier
    const directUserId = params.userId || (params.userIdentifier?.startsWith("usr_") ? params.userIdentifier : undefined);
    if (directUserId) {
      const userTgId = await UserTelegramSettingsService.getTelegramIdForUser(directUserId);
      if (userTgId) {
        const res = await this.sendMessageToChat(userTgId, formattedMessage, {
          messageType: "ai_prompt_response",
        });
        return {
          success: res.success,
          chatId: userTgId,
          formattedMessage,
          error: res.error,
        };
      }
    }

    // 3. User lookup by email if available to find configured Telegram ID
    if (params.userEmail) {
      const user = await UserService.getUserByEmail(params.userEmail);
      if (user) {
        const userTgId = await UserTelegramSettingsService.getTelegramIdForUser(user.id);
        if (userTgId) {
          const res = await this.sendMessageToChat(userTgId, formattedMessage, {
            messageType: "ai_prompt_response",
          });
          return {
            success: res.success,
            chatId: userTgId,
            formattedMessage,
            error: res.error,
          };
        }
      }
    }

    // 4. No configured Telegram ID found -> fail (do not map user by name and surname)
    const target = params.userId || params.userEmail || params.userIdentifier || "user";
    return {
      success: false,
      formattedMessage,
      error: `Nebyl nalezen aktivní Telegram odběratel ani nakonfigurované Telegram ID pro uživatele '${target}'. Prosím nastavte si personální Telegram ID v nastavení.`,
    };
  }

  /**
   * Tests personal Telegram notification for a user.
   */
  static async testPersonalNotification(
    userId: string,
    customMessage?: string
  ): Promise<{ success: boolean; chatId?: number | string; error?: string }> {
    const settings = await UserTelegramSettingsService.getSettings(userId);
    if (!settings?.telegramId) {
      return {
        success: false,
        error: "Telegram ID is not configured in your personal settings.",
      };
    }

    const message =
      customMessage ||
      `🤖 *Johan Bot Test Notification*\n\n` +
      `✅ Vaše personální Telegram konfigurace je aktivní a funkční!\n` +
      `• Uživatel: \`${userId}\`\n` +
      `• Telegram ID: \`${settings.telegramId}\`\n` +
      `• Čas: \`${new Date().toLocaleString("cs-CZ")}\``;

    const res = await this.sendResponseToUserById({
      userId,
      telegramId: settings.telegramId,
      text: message,
    });

    return {
      success: res.success,
      chatId: res.chatId,
      error: res.error,
    };
  }

  /**
   * Helper to send a message to a specific chat with fallback and logging.
   */
  private static async sendMessageToChat(
    chatId: number | string,
    text: string,
    meta?: { subscriber?: Subscriber; messageType?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const numericChatId = typeof chatId === "number" ? chatId : parseInt(chatId, 10);
    const effectiveChatId = Number.isNaN(numericChatId) ? chatId : numericChatId;
    const logChatId = typeof effectiveChatId === "number" ? effectiveChatId : 0;

    try {
      if (!isTelegramConfigured()) {
        await MessageService.logMessage({
          chatId: logChatId,
          userId: meta?.subscriber?.userId,
          username: meta?.subscriber?.username,
          firstName: meta?.subscriber?.firstName,
          lastName: meta?.subscriber?.lastName,
          chatType: meta?.subscriber?.chatType || "private",
          text,
          direction: "outgoing",
          messageType: meta?.messageType || "message",
          rawPayload: { simulated: true, chatId: effectiveChatId },
        });
        return { success: true };
      }

      const bot = getTelegramBot();
      const sent = await bot.api.sendMessage(effectiveChatId, text, {
        parse_mode: "Markdown",
      });

      await MessageService.logMessage({
        messageId: sent?.message_id,
        chatId: logChatId,
        userId: meta?.subscriber?.userId,
        username: meta?.subscriber?.username,
        firstName: meta?.subscriber?.firstName,
        lastName: meta?.subscriber?.lastName,
        chatType: meta?.subscriber?.chatType || "private",
        text,
        direction: "outgoing",
        messageType: meta?.messageType || "message",
        rawPayload: sent,
      });

      return { success: true };
    } catch (err) {
      const msg = (err as Error).message || String(err);
      console.warn(`[TelegramService] Warning: Could not send message to chat ${chatId}:`, msg);

      await MessageService.logMessage({
        chatId: logChatId,
        userId: meta?.subscriber?.userId,
        username: meta?.subscriber?.username,
        firstName: meta?.subscriber?.firstName,
        lastName: meta?.subscriber?.lastName,
        chatType: meta?.subscriber?.chatType || "private",
        text,
        direction: "outgoing",
        messageType: `${meta?.messageType || "message"}_failed`,
        rawPayload: { error: msg, chatId: effectiveChatId },
      });

      return { success: false, error: msg };
    }
  }
}
