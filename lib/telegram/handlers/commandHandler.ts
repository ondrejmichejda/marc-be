import { Bot } from "grammy";
import { getTelegramConfig } from "../config";
import { TelegramService } from "../service";
import { SubscriberService } from "../subscribers";
import { BotContext } from "../types";

/**
 * Registers all bot command handlers (/start, /help, /ping, /broadcast, /subscribers, /where)
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

  // /broadcast command (admin only)
  bot.command("broadcast", async (ctx) => {
    const config = getTelegramConfig();
    const userId = ctx.from?.id;

    if (
      config.adminIds &&
      config.adminIds.length > 0 &&
      (!userId || !config.adminIds.includes(userId))
    ) {
      await ctx.reply("⛔ You are not authorized to use the `/broadcast` command.", {
        parse_mode: "Markdown",
      });
      return;
    }

    const messageText = ctx.match?.trim();
    if (!messageText) {
      await ctx.reply(
        "ℹ️ *Usage:* `/broadcast <message to send to all users>`",
        { parse_mode: "Markdown" }
      );
      return;
    }

    await ctx.reply("📢 *Broadcasting message to all active users...*", {
      parse_mode: "Markdown",
    });

    const result = await TelegramService.broadcastMessage(messageText);

    await ctx.reply(
      `✅ *Broadcast Complete*\n\n` +
        `• Total recipients: \`${result.total}\`\n` +
        `• Successfully sent: \`${result.sent}\`\n` +
        `• Failed: \`${result.failed}\`\n` +
        `• Inactive/Blocked removed: \`${result.deactivated}\``,
      { parse_mode: "Markdown" }
    );
  });

  // /subscribers command (admin only)
  bot.command("subscribers", async (ctx) => {
    const config = getTelegramConfig();
    const userId = ctx.from?.id;

    if (
      config.adminIds &&
      config.adminIds.length > 0 &&
      (!userId || !config.adminIds.includes(userId))
    ) {
      await ctx.reply("⛔ You are not authorized to view subscribers.", {
        parse_mode: "Markdown",
      });
      return;
    }

    const all = await SubscriberService.getAllSubscribers();
    const active = all.filter((s) => s.isActive);

    await ctx.reply(
      `👥 *Bot Subscribers Status*\n\n` +
        `• Active subscribers: \`${active.length}\`\n` +
        `• Total registered: \`${all.length}\`\n` +
        `• Inactive (blocked/left): \`${all.length - active.length}\``,
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
