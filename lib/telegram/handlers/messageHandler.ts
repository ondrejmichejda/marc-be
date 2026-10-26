import { Bot } from "grammy";
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
        await ctx.reply(text);
      } catch (error) {
        console.error("[TelegramBot] Error sending echo reply:", error);
      }
    }
  });
}
