import { NextResponse } from "next/server";
import { connection } from "next/server";
import { ensureDb, isDbConfigured } from "@/lib/db";
import { isTelegramConfigured, getTelegramConfig } from "@/lib/telegram/config";
import { MessageService } from "@/lib/telegram/messages";
import { TaskService } from "@/lib/telegram/handlers/taskHandler";
import { SubscriberService } from "@/lib/telegram/subscribers";

export async function GET() {
  await connection();
  const startTime = Date.now();
  let dbStatus = "unconfigured";
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;

  let subscriberCount = 0;
  let activeSubscriberCount = 0;
  let taskCount = 0;
  let messageCount = 0;

  if (isDbConfigured()) {
    try {
      const dbStart = Date.now();
      const sql = await ensureDb();
      await sql`SELECT 1 as ping;`;
      dbLatencyMs = Date.now() - dbStart;
      dbStatus = "healthy";

      const [subscribers, tasks, messages] = await Promise.all([
        SubscriberService.getAllSubscribers(),
        TaskService.listTasks(),
        MessageService.listMessages({ limit: 1 }),
      ]);

      subscriberCount = subscribers.length;
      activeSubscriberCount = subscribers.filter((s) => s.isActive).length;
      taskCount = tasks.length;
      // We can also query total message count
      const countRes = (await sql`SELECT COUNT(*)::int as total FROM messages;`) as Array<{ total: number }>;
      messageCount = countRes[0]?.total ?? messages.length;
    } catch (err) {
      dbStatus = "error";
      dbError = err instanceof Error ? err.message : String(err);
    }
  } else {
    // Fallback store counts
    try {
      const subscribers = await SubscriberService.getAllSubscribers();
      subscriberCount = subscribers.length;
      activeSubscriberCount = subscribers.filter((s) => s.isActive).length;
      const tasks = await TaskService.listTasks();
      taskCount = tasks.length;
      const messages = await MessageService.listMessages({ limit: 1000 });
      messageCount = messages.length;
    } catch {
      // ignore
    }
  }

  let telegramConfigured = false;
  let botWebhookUrl: string | null = null;
  let hasAdmin = false;

  try {
    telegramConfigured = isTelegramConfigured();
    if (telegramConfigured) {
      const config = getTelegramConfig();
      botWebhookUrl = config.appUrl ? `${config.appUrl}/api/telegram/webhook` : null;
      hasAdmin = Boolean(config.adminIds && config.adminIds.length > 0);
    }
  } catch {
    telegramConfigured = false;
  }

  const isHealthy = dbStatus === "healthy" || dbStatus === "unconfigured";
  const overallStatus =
    dbStatus === "healthy" && telegramConfigured
      ? "operational"
      : dbStatus === "error"
      ? "degraded"
      : "partially_configured";

  const totalDurationMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: overallStatus,
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
      responseTimeMs: totalDurationMs,
      services: {
        database: {
          status: dbStatus,
          provider: isDbConfigured() ? "Neon PostgreSQL" : "Local JSON / Memory Fallback",
          latencyMs: dbLatencyMs,
          error: dbError,
        },
        telegramBot: {
          status: telegramConfigured ? "configured" : "unconfigured",
          mode: botWebhookUrl ? "webhook" : "polling / fallback",
          webhookUrl: botWebhookUrl,
          hasAdminConfigured: hasAdmin,
          interactiveMenuMode: true,
          openAiEnabled: false,
        },
        draculinoService: {
          status: "operational",
          description: "BJJ schedule & sitemap finder",
        },
      },
      metrics: {
        subscribers: {
          total: subscriberCount,
          active: activeSubscriberCount,
        },
        tasks: {
          total: taskCount,
        },
        messages: {
          totalLogged: messageCount,
        },
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
