import { Bot } from "grammy";
import { generateFunnyInsult } from "@/lib/openai/service";
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

    try {
      const insult = await generateFunnyInsult(text || "");
      await ctx.reply(insult);
    } catch (error) {
      console.error("[TelegramBot] Error generating insult from OpenAI:", error);
      await ctx.reply("Omlouvám se, nepodařilo se mi vygenerovat odpověď.");
    }
  });
}
