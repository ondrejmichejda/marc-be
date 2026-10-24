import { Bot } from "grammy";
import { BotContext } from "../types";

/**
 * Registers message listeners for incoming Telegram updates.
 */
export function registerMessageHandlers(bot: Bot<BotContext>): void {
  // Handle general text messages (non-commands)
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;

    // Ignore commands (they start with / and are handled by commandHandler)
    if (text.startsWith("/")) return;

    await ctx.reply(
      "ℹ️ Direct AI chat is disabled. Use `/help` to view available commands.",
      { parse_mode: "Markdown" }
    );
  });

  // Handle document/file uploads
  bot.on("message:document", async (ctx) => {
    const doc = ctx.message.document;
    const fileName = doc.file_name || "unnamed file";
    const fileSize = doc.file_size
      ? ` (${(doc.file_size / 1024).toFixed(1)} KB)`
      : "";

    await ctx.reply(
      `📎 Received document: *${fileName}*${fileSize}\n\nUse \`/help\` to view available commands.`,
      { parse_mode: "Markdown" }
    );
  });
}
