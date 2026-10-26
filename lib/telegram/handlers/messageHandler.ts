import { Bot } from "grammy";
import { MessageService } from "../messages";
import { BotContext } from "../types";

/**
 * Registers message listeners for incoming Telegram updates.
 */
export function registerMessageHandlers(bot: Bot<BotContext>): void {
  // Handle any incoming message except commands
  bot.on("message", async (ctx) => {
    const text = ctx.message.text || ctx.message.caption;

    // Ignore commands (they start with / and are handled by commandHandler)
    if (text && text.startsWith("/")) {
      return;
    }

    if (text) {
      try {
        const sent = await ctx.reply(text);

        if (ctx.chat?.id) {
          MessageService.logMessage({
            messageId: sent?.message_id,
            chatId: ctx.chat.id,
            userId: ctx.me?.id,
            username: ctx.me?.username,
            firstName: ctx.me?.first_name,
            chatType: ctx.chat.type,
            text,
            direction: "outgoing",
            messageType: "echo",
            rawPayload: sent,
          }).catch((err) => {
            console.error("[TelegramBot] Error logging outgoing echo message:", err);
          });
        }
      } catch (error) {
        console.error("[TelegramBot] Error sending echo reply:", error);
      }
    }
  });
}
