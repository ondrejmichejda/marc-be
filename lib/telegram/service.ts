import { getTelegramBot } from "./bot";
import { isTelegramConfigured } from "./config";
import { formatTaskSummary, createTaskKeyboard } from "./handlers/taskHandler";
import { MessageService } from "./messages";
import { SubscriberService, parseFullName } from "./subscribers";
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
   * Finds an active Telegram subscriber by name and surname and sends them a message via Johan bot.
   */
  static async sendResponseToUserByName(params: {
    name?: string;
    surname?: string;
    fullName?: string;
    text: string;
    parseMode?: "Markdown" | "HTML";
  }): Promise<{
    success: boolean;
    subscriber?: Subscriber;
    messageId?: number;
    error?: string;
  }> {
    const targetName = params.name || params.fullName;
    const targetSurname = params.surname;

    if (!targetName && !targetSurname) {
      return { success: false, error: "Missing name or surname parameter for user lookup." };
    }

    const subscriber = await SubscriberService.findSubscriberByNameAndSurname(
      targetName || "",
      targetSurname
    );

    if (!subscriber) {
      const formattedLookup = [targetName, targetSurname].filter(Boolean).join(" ");
      return {
        success: false,
        error: `No active Telegram subscriber found matching '${formattedLookup}'.`,
      };
    }

    try {
      if (!isTelegramConfigured()) {
        // Simulation mode for tests / offline dev
        await MessageService.logMessage({
          chatId: subscriber.chatId,
          userId: subscriber.userId,
          username: subscriber.username,
          firstName: subscriber.firstName,
          lastName: subscriber.lastName,
          chatType: subscriber.chatType || "private",
          text: params.text,
          direction: "outgoing",
          messageType: "simulated_user_response",
          rawPayload: { simulated: true, recipient: subscriber },
        });

        return {
          success: true,
          subscriber,
        };
      }

      const bot = getTelegramBot();
      const sent = await bot.api.sendMessage(subscriber.chatId, params.text, {
        parse_mode: params.parseMode || "Markdown",
      });

      await MessageService.logMessage({
        messageId: sent?.message_id,
        chatId: subscriber.chatId,
        userId: subscriber.userId,
        username: subscriber.username,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        chatType: subscriber.chatType || "private",
        text: params.text,
        direction: "outgoing",
        messageType: "user_response",
        rawPayload: sent,
      });

      return {
        success: true,
        subscriber,
        messageId: sent?.message_id,
      };
    } catch (err) {
      const errorMessage = (err as Error).message || String(err);
      console.error("[TelegramService] Error sending response to matched user:", errorMessage);

      // Still log message as outgoing failed attempt
      await MessageService.logMessage({
        chatId: subscriber.chatId,
        userId: subscriber.userId,
        username: subscriber.username,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        chatType: subscriber.chatType || "private",
        text: params.text,
        direction: "outgoing",
        messageType: "user_response_failed",
        rawPayload: { error: errorMessage },
      });

      return {
        success: false,
        subscriber,
        error: errorMessage,
      };
    }
  }

  /**
   * Formats and delivers an AI prompt response to a user matched by name and surname using Johan bot integration.
   */
  static async sendAiPromptResponse(params: {
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
    formattedMessage: string;
    error?: string;
  }> {
    // Determine lookup names
    let firstName = params.userName;
    let lastName = params.userSurname;

    if (params.userName && !params.userSurname) {
      const parsed = parseFullName(params.userName);
      firstName = parsed.firstName;
      lastName = parsed.lastName;
    }

    // Lookup subscriber
    let subscriber = await SubscriberService.findSubscriberByNameAndSurname(
      firstName || "",
      lastName
    );

    if (!subscriber && params.userEmail) {
      subscriber = await SubscriberService.matchSubscriberForUser({
        name: params.userName,
        email: params.userEmail,
      });
    }

    const timeEmoji =
      params.scheduledTime === "9am"
        ? "🌅 (09:00 Ráno)"
        : params.scheduledTime === "1pm"
        ? "☀️ (13:00 Odpoledne)"
        : params.scheduledTime === "5pm"
        ? "🌇 (17:00 Večer)"
        : "✨";

    const greeting = subscriber?.firstName
      ? `Ahoj ${subscriber.firstName}!`
      : params.userName
      ? `Ahoj ${params.userName}!`
      : "Ahoj!";

    let formattedMessage =
      `🤖 *Johan Bot AI Odpověď* ${timeEmoji}\n\n` +
      `${greeting}\n\n`;

    if (params.promptTitle) {
      formattedMessage += `📌 *${params.promptTitle}*\n`;
    }

    if (params.promptText) {
      const truncatedPrompt =
        params.promptText.length > 120
          ? `${params.promptText.slice(0, 117)}...`
          : params.promptText;
      formattedMessage += `💬 _Zadání: "${truncatedPrompt}"_\n\n`;
    } else {
      formattedMessage += "\n";
    }

    formattedMessage +=
      `📝 *Výstup:*\n${params.completion}\n\n` +
      `_Odesláno přes Johan Bot Telegram integraci_`;

    if (!subscriber) {
      const queryStr = [firstName, lastName].filter(Boolean).join(" ") || params.userEmail || "user";
      return {
        success: false,
        formattedMessage,
        error: `Nebyl nalezen aktivní Telegram odběratel pro uživatele '${queryStr}'.`,
      };
    }

    const sendRes = await this.sendMessageToChat(subscriber.chatId, formattedMessage, {
      subscriber,
      messageType: "ai_prompt_response",
    });

    return {
      success: sendRes.success,
      subscriber,
      formattedMessage,
      error: sendRes.error,
    };
  }

  /**
   * Helper to send a message to a specific chat with fallback and logging.
   */
  private static async sendMessageToChat(
    chatId: number,
    text: string,
    meta?: { subscriber?: Subscriber; messageType?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!isTelegramConfigured()) {
        await MessageService.logMessage({
          chatId,
          userId: meta?.subscriber?.userId,
          username: meta?.subscriber?.username,
          firstName: meta?.subscriber?.firstName,
          lastName: meta?.subscriber?.lastName,
          chatType: meta?.subscriber?.chatType || "private",
          text,
          direction: "outgoing",
          messageType: meta?.messageType || "message",
          rawPayload: { simulated: true },
        });
        return { success: true };
      }

      const bot = getTelegramBot();
      const sent = await bot.api.sendMessage(chatId, text, {
        parse_mode: "Markdown",
      });

      await MessageService.logMessage({
        messageId: sent?.message_id,
        chatId,
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
        chatId,
        userId: meta?.subscriber?.userId,
        username: meta?.subscriber?.username,
        firstName: meta?.subscriber?.firstName,
        lastName: meta?.subscriber?.lastName,
        chatType: meta?.subscriber?.chatType || "private",
        text,
        direction: "outgoing",
        messageType: `${meta?.messageType || "message"}_failed`,
        rawPayload: { error: msg },
      });

      return { success: false, error: msg };
    }
  }
}
