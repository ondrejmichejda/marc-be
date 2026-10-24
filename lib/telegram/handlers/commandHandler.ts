import { Bot } from "grammy";
import { BotContext } from "../types";

/**
 * Registers all bot command handlers (/start, /help, /ping, /where)
 */
export function registerCommandHandlers(bot: Bot<BotContext>): void {
  // /start command
  bot.command("start", async (ctx) => {
    const user = ctx.from;
    const greeting = user?.first_name ? `Hello, ${user.first_name}!` : "Hello!";

    await ctx.reply(
      `👋 *${greeting} Welcome to your Telegram Task Bot!*\n\n` +
        `This bot is connected to the backend for managing and tracking tasks.\n\n` +
        `*Commands:*\n` +
        `• \`/ping\` - Check backend server health\n` +
        `• \`/help\` - View available commands`,
      { parse_mode: "Markdown" }
    );
  });

  // /help command
  bot.command("help", async (ctx) => {
    await ctx.reply(
      `📖 *Bot Help & Instructions*\n\n` +
        `• Receive and manage task notifications from the backend.\n` +
        `• \`/ping\` - Check server response time and status\n` +
        `• \`/start\` - Restart bot welcome message\n` +
        `• \`/help\` - View available commands`,
      { parse_mode: "Markdown" }
    );
  });

  // /ping command
  bot.command("ping", async (ctx) => {
    const start = Date.now();
    await ctx.reply(
      `🏓 *Pong!*\n\n` +
        `• Backend: \`Next.js App Router\`\n` +
        `• Server Time: \`${new Date().toISOString()}\`\n` +
        `• Latency: \`${Date.now() - start}ms\``,
      { parse_mode: "Markdown" }
    );
  });

  // /where command (disabled)
  bot.command("where", async (ctx) => {
    await ctx.reply(
      "ℹ️ The `/where` functionality is currently disabled.",
      { parse_mode: "Markdown" }
    );
  });
}
