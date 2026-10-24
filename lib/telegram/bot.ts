import { Bot } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { getTelegramConfig } from "./config";
import { registerCommandHandlers } from "./handlers/commandHandler";
import { registerMessageHandlers } from "./handlers/messageHandler";
import { handleTaskCallbackQuery } from "./handlers/taskHandler";
import { BotContext } from "./types";

declare global {
  var __telegramBotInfo: UserFromGetMe | undefined;
}

/**
 * Creates and configures a fresh Telegram Bot instance with registered handlers.
 */
export function createTelegramBot(botInfo?: UserFromGetMe): Bot<BotContext> {
  const config = getTelegramConfig();
  const bot = new Bot<BotContext>(config.botToken, {
    botInfo: botInfo || global.__telegramBotInfo,
  });

  // Global error handler
  bot.catch((err) => {
    console.error("[TelegramBot] Error while handling update:", err.error);
  });

  // Logging middleware: prints incoming updates, messages, commands, and callbacks
  bot.use(async (ctx, next) => {
    const timestamp = new Date().toLocaleTimeString();
    const fromUser = ctx.from
      ? `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim() +
        (ctx.from.username ? ` (@${ctx.from.username})` : "") +
        ` [ID: ${ctx.from.id}]`
      : "Unknown User";

    if (ctx.message?.text) {
      console.log(
        `\n==================== 📩 TELEGRAM INCOMING MESSAGE ====================` +
        `\n⏰ Time:   ${timestamp}` +
        `\n👤 From:   ${fromUser}` +
        `\n💬 Chat:   ${ctx.chat?.id}` +
        `\n📝 Text:   "${ctx.message.text}"` +
        `\n====================================================================\n`
      );
    } else if (ctx.message?.document) {
      console.log(
        `\n==================== 📎 TELEGRAM INCOMING DOCUMENT ====================` +
        `\n⏰ Time:   ${timestamp}` +
        `\n👤 From:   ${fromUser}` +
        `\n📁 File:   ${ctx.message.document.file_name || "unnamed"} (${ctx.message.document.file_size || 0} bytes)` +
        `\n📝 Caption: ${ctx.message.caption || "(no caption)"}` +
        `\n====================================================================\n`
      );
    } else if (ctx.callbackQuery) {
      console.log(
        `\n==================== 🔘 TELEGRAM BUTTON CLICKED ====================` +
        `\n⏰ Time:   ${timestamp}` +
        `\n👤 From:   ${fromUser}` +
        `\n🔘 Data:   "${ctx.callbackQuery.data}"` +
        `\n====================================================================\n`
      );
    } else {
      console.log(
        `\n==================== ⚡ TELEGRAM UPDATE [${ctx.update.update_id}] ====================` +
        `\n⏰ Time:   ${timestamp}` +
        `\n👤 From:   ${fromUser}` +
        `\n====================================================================\n`
      );
    }

    await next();
  });

  // Register command handlers (/start, /help, /ping)
  registerCommandHandlers(bot);

  // Register inline button callback query handlers
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data.startsWith("where:")) {
      await ctx.answerCallbackQuery({
        text: "The /where feature is disabled.",
      });
    } else {
      await handleTaskCallbackQuery(ctx);
    }
  });

  // Register message listeners
  registerMessageHandlers(bot);

  return bot;
}

/**
 * Initializes and configures the Telegram Bot instance.
 */
export function getTelegramBot(): Bot<BotContext> {
  return createTelegramBot();
}

/**
 * Returns an initialized Telegram Bot instance.
 * Ensures botInfo is loaded and cached so subsequent handler calls don't require network initialization.
 */
export async function initTelegramBot(): Promise<Bot<BotContext>> {
  if (!global.__telegramBotInfo) {
    const tempBot = createTelegramBot();
    await tempBot.init();
    global.__telegramBotInfo = tempBot.botInfo;
  }

  return createTelegramBot(global.__telegramBotInfo);
}
