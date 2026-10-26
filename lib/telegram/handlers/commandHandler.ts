import { Bot } from "grammy";
import { getTelegramConfig } from "../config";
import { TelegramService } from "../service";
import { SubscriberService } from "../subscribers";
import { TaskService } from "./taskHandler";
import { DraculinoService } from "../../draculino/service";
import { BotContext } from "../types";

/**
 * Executes the /where training schedule check and replies with formatted results.
 */
export async function executeWhereCommand(
  ctx: BotContext,
  rawArgs: string = ""
): Promise<void> {
  const args = rawArgs.trim();
  const user = ctx.from;
  const chatId = ctx.chat?.id || 0;
  const userId = user?.id || 0;
  const username = user?.username || user?.first_name || "User";

  const targetDay = DraculinoService.parseDayArgument(args);
  const targetBranch = DraculinoService.findBranch(args);
  const isSitemapRequest = args.toLowerCase() === "sitemap";

  const currentPrague = DraculinoService.getCurrentDayInPrague();
  const effectiveDay = targetDay || currentPrague.day;

  try {
    const result = await DraculinoService.getTrainingUnits({
      day: effectiveDay,
      branchId: targetBranch?.id,
    });

    // Create a background task entry to track the request in TaskService
    await TaskService.createTask({
      title: `Where to train (${result.dayNameCz}${targetBranch ? ` - ${targetBranch.name}` : ""})`,
      description: `Queried Draculino timetables for ${result.dayNameCz}. Found ${result.totalUnits} training units${
        result.isToday && result.currentTimeStr
          ? ` (${result.remainingCount ?? 0} active/upcoming at ${result.currentTimeStr})`
          : ""
      }.`,
      priority: "low",
      telegramChatId: chatId,
      telegramUserId: userId,
      telegramUsername: username,
      metadata: {
        query: args || "today",
        day: effectiveDay,
        branchId: targetBranch?.id,
        totalUnits: result.totalUnits,
        remainingUnits: result.remainingCount,
        currentTime: result.currentTimeStr,
        isToday: result.isToday,
        sitemapCount: result.sitemap.length,
      },
    });

    const messageText = DraculinoService.formatWhereSummaryMarkdown(result, {
      showSitemap: isSitemapRequest,
      filterBranchName: targetBranch?.name,
    });

    const keyboard = DraculinoService.createWhereKeyboard(
      effectiveDay,
      targetBranch?.id
    );

    await ctx.reply(messageText, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error("[CommandHandler] Error executing /where:", error);
    await ctx.reply(
      "❌ *Chyba při načítání rozvrhu Draculino.*\nZkuste to prosím znovu za chvíli.",
      { parse_mode: "Markdown" }
    );
  }
}

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
        `• \`/where\` - Check Draculino training units & timetables for today\n` +
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
        `• \`/where\` - Search training units for today across all Draculino gym branches (sitemap & timetables)\n` +
        `  _Examples:_ \`/where\`, \`/where ostrava\`, \`/where zitra\`, \`/where sitemap\`\n` +
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

  // /where command: checks timetables from www.draculino.cz sitemap & returns training units for today
  bot.command("where", async (ctx) => {
    const rawText = ctx.message?.text || "";
    // Extract argument if provided (e.g. "/where ostrava", "/where zitra", "/where sitemap")
    const args = rawText.replace(/^\/where(@\w+)?\s*/i, "").trim();
    await executeWhereCommand(ctx, args);
  });
}
