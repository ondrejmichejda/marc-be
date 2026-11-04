import { Bot } from "grammy";
import { MessageService } from "../messages";
import { BotContext } from "../types";
import { getUserState, setUserState } from "../userState";
import {
  sendMainMenu,
  executeMockedTaskCalculation,
} from "./menuHandler";
import { executeWhereCommand } from "./commandHandler";
import { respondToTelegramUserByName } from "../../openai/service";

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

    if (!text) {
      return;
    }

    const chatId = ctx.chat?.id || ctx.from?.id || 0;
    const currentState = getUserState(chatId);

    // 1. If user is in task calculation input mode, evaluate this message as input
    if (currentState.state === "awaiting_task_input") {
      await executeMockedTaskCalculation(ctx, text);
      return;
    }

    // 2. Direct text matches for menu options (case-insensitive & trimmed)
    const normalized = text.trim().toLowerCase();
    if (
      normalized === "kde dnes trenovat" ||
      normalized === "kde dnes trénovat" ||
      normalized === "kde trenovat" ||
      normalized === "kde trénovat"
    ) {
      await executeWhereCommand(ctx);
      return;
    }

    if (
      normalized === "spocitat ulohu" ||
      normalized === "spočítat úlohu" ||
      normalized === "vypocitat ulohu" ||
      normalized === "vypočítat úlohu"
    ) {
      setUserState(chatId, {
        state: "awaiting_task_input",
        timestamp: Date.now(),
      });

      const promptText =
        "🧮 *Výpočet úlohy*\n\n" +
        "Prosím zadejte **vstupní data** pro výpočet úlohy (např. parametry, text zadání, čísla nebo konfiguraci):\n\n" +
        "_Vaše následující zpráva bude zpracována jako vstup pro výpočet._";

      const sent = await ctx.reply(promptText, { parse_mode: "Markdown" });

      if (ctx.chat?.id) {
        MessageService.logMessage({
          messageId: sent?.message_id,
          chatId: ctx.chat.id,
          userId: ctx.me?.id,
          username: ctx.me?.username,
          firstName: ctx.me?.first_name,
          chatType: ctx.chat.type,
          text: promptText,
          direction: "outgoing",
          messageType: "task_prompt",
          rawPayload: sent,
        }).catch((err) => {
          console.error("[MessageHandler] Error logging task prompt message:", err);
        });
      }
      return;
    }

    // 3. Direct inquiry addressed to Johan bot
    if (
      normalized.startsWith("johan ") ||
      normalized.startsWith("johan,") ||
      normalized.startsWith("johan:") ||
      normalized.startsWith("ai:") ||
      normalized.startsWith("dotaz:")
    ) {
      const promptQuery = text.replace(/^(johan[,:]?|ai:|dotaz:)\s*/i, "").trim();
      if (promptQuery) {
        const fromUser = ctx.from;
        const name = fromUser?.first_name || "Příteli";
        const surname = fromUser?.last_name;
        const fullName = [name, surname].filter(Boolean).join(" ");

        await ctx.reply("🤖 *Johan Bot přemýšlí...*", { parse_mode: "Markdown" });

        try {
          const response = await respondToTelegramUserByName({
            name,
            surname,
            fullName,
            prompt: promptQuery,
            userEmail: fromUser?.username ? `${fromUser.username}@telegram` : undefined,
          });

          if (!response.telegramDelivery.sent) {
            await ctx.reply(
              `🤖 *Johan Bot Odpověď pro ${fullName}:*\n\n${response.completion}`,
              { parse_mode: "Markdown" }
            );
          }
        } catch (err) {
          console.error("[MessageHandler] Error in Johan Bot AI reply:", err);
          await ctx.reply("❌ *Omlouvám se, nastala chyba při generování AI odpovědi.*", {
            parse_mode: "Markdown",
          });
        }
        return;
      }
    }

    // 4. For any other incoming message not recognized as a command, show main menu with buttons
    await sendMainMenu(ctx);
  });
}
