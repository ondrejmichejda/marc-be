import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ensureDb, isDbConfigured } from "@/lib/db";
import { isTelegramConfigured, getTelegramConfig } from "@/lib/telegram/config";
import { MessageService } from "@/lib/telegram/messages";
import { TaskService } from "@/lib/telegram/handlers/taskHandler";
import { SubscriberService } from "@/lib/telegram/subscribers";
import { MessageLog, TaskItem, Subscriber } from "@/lib/telegram/types";
import { WebhookDeploymentControls } from "@/app/components/WebhookDeploymentControls";

interface SystemHealth {
  overallStatus: "operational" | "degraded" | "partially_configured";
  timestamp: string;
  dbStatus: "healthy" | "error" | "unconfigured";
  dbLatencyMs: number | null;
  dbError: string | null;
  telegramConfigured: boolean;
  botMode: "webhook" | "polling / direct";
  appUrl?: string;
  hasAdmin: boolean;
  activeSubscribers: number;
  totalSubscribers: number;
  totalTasks: number;
  totalMessages: number;
  recentMessages: MessageLog[];
  recentTasks: TaskItem[];
  subscribers: Subscriber[];
}

async function getSystemHealth(): Promise<SystemHealth> {
  await connection();
  const timestamp = new Date().toISOString();
  let dbStatus: "healthy" | "error" | "unconfigured" = "unconfigured";
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;

  let recentMessages: MessageLog[] = [];
  let recentTasks: TaskItem[] = [];
  let subscribers: Subscriber[] = [];
  let totalMessages = 0;

  if (isDbConfigured()) {
    try {
      const dbStart = Date.now();
      const sql = await ensureDb();
      await sql`SELECT 1 as ping;`;
      dbLatencyMs = Date.now() - dbStart;
      dbStatus = "healthy";

      const [subs, tasks, msgs] = await Promise.all([
        SubscriberService.getAllSubscribers().catch(() => []),
        TaskService.listTasks().catch(() => []),
        MessageService.listMessages({ limit: 8 }).catch(() => []),
      ]);

      subscribers = subs;
      recentTasks = tasks.slice(0, 8);
      recentMessages = msgs;

      try {
        const countRes = (await sql`SELECT COUNT(*)::int as total FROM messages;`) as Array<{ total: number }>;
        totalMessages = countRes[0]?.total ?? recentMessages.length;
      } catch {
        totalMessages = recentMessages.length;
      }
    } catch (err) {
      dbStatus = "error";
      dbError = err instanceof Error ? err.message : String(err);
    }
  } else {
    try {
      subscribers = await SubscriberService.getAllSubscribers();
      recentTasks = (await TaskService.listTasks()).slice(0, 8);
      recentMessages = await MessageService.listMessages({ limit: 8 });
      totalMessages = recentMessages.length;
    } catch {
      // fallback safe
    }
  }

  let telegramConfigured = false;
  let appUrl: string | undefined;
  let hasAdmin = false;

  try {
    telegramConfigured = isTelegramConfigured();
    if (telegramConfigured) {
      const config = getTelegramConfig();
      appUrl = config.appUrl;
      hasAdmin = Boolean(config.adminIds && config.adminIds.length > 0);
    }
  } catch {
    telegramConfigured = false;
  }

  const overallStatus =
    dbStatus === "healthy" && telegramConfigured
      ? "operational"
      : dbStatus === "error"
      ? "degraded"
      : "partially_configured";

  return {
    overallStatus,
    timestamp,
    dbStatus,
    dbLatencyMs,
    dbError,
    telegramConfigured,
    botMode: appUrl ? "webhook" : "polling / direct",
    appUrl,
    hasAdmin,
    activeSubscribers: subscribers.filter((s: Subscriber) => s.isActive).length,
    totalSubscribers: subscribers.length,
    totalTasks: recentTasks.length,
    totalMessages,
    recentMessages,
    recentTasks,
    subscribers,
  };
}

const apiEndpoints = [
  {
    method: "GET",
    path: "/api/health",
    description: "Live system health, database latency, and service metrics",
    category: "System",
  },
  {
    method: "GET / POST",
    path: "/api/tasks",
    description: "CRUD operations and querying for managed tasks",
    category: "Tasks",
  },
  {
    method: "GET",
    path: "/api/telegram/messages",
    description: "Query and filter persisted Telegram interaction audit logs",
    category: "Telegram",
  },
  {
    method: "POST",
    path: "/api/telegram/webhook",
    description: "Main Telegram webhook update receiver & event router",
    category: "Telegram",
  },
  {
    method: "GET / POST",
    path: "/api/telegram/setup-webhook",
    description: "Registers and validates Telegram bot webhook URL with Telegram API",
    category: "Telegram",
  },
  {
    method: "POST",
    path: "/api/telegram/notify-deployment",
    description: "Broadcasts deployment notifications to registered subscribers",
    category: "Deployment",
  },
  {
    method: "GET",
    path: "/api/draculino/where",
    description: "Finds training locations and schedule timetable for Draculino",
    category: "Draculino",
  },
  {
    method: "GET",
    path: "/api/draculino/sitemap",
    description: "Parses and returns sitemap data for Draculino website",
    category: "Draculino",
  },
];

async function LiveHealthSection() {
  const health = await getSystemHealth();

  const statusBadge = {
    operational: {
      text: "All Systems Operational",
      bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
      dot: "bg-emerald-400 animate-pulse",
    },
    degraded: {
      text: "Degraded Performance",
      bg: "bg-rose-500/15 border-rose-500/30 text-rose-400",
      dot: "bg-rose-400",
    },
    partially_configured: {
      text: "Partially Configured",
      bg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
      dot: "bg-amber-400",
    },
  }[health.overallStatus];

  return (
    <div className="space-y-8">
      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${statusBadge.bg}`}>
            <span className={`h-2 w-2 rounded-full ${statusBadge.dot}`} />
            {statusBadge.text}
          </div>
          <span className="text-xs text-zinc-400 hidden sm:inline">
            Checked at {new Date(health.timestamp).toLocaleTimeString()}
          </span>
        </div>

        <div className="text-xs font-mono text-zinc-400">
          Latency: <span className="text-zinc-200">{health.dbLatencyMs !== null ? `${health.dbLatencyMs}ms` : "N/A"}</span>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Database Status */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <span>Database (PostgreSQL)</span>
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                health.dbStatus === "healthy"
                  ? "bg-emerald-400"
                  : health.dbStatus === "error"
                  ? "bg-rose-400"
                  : "bg-amber-400"
              }`}
            />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white capitalize">
              {health.dbStatus === "healthy" ? "Connected" : health.dbStatus}
            </div>
            <p className="text-xs text-zinc-400 mt-1 truncate">
              {health.dbLatencyMs !== null
                ? `Response latency: ${health.dbLatencyMs}ms (Neon Serverless)`
                : health.dbError || "No DATABASE_URL configured"}
            </p>
          </div>
        </div>

        {/* Card 2: Telegram Bot */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <span>Telegram Bot</span>
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                health.telegramConfigured ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {health.telegramConfigured ? "Active" : "Unconfigured"}
            </div>
            <p className="text-xs text-zinc-400 mt-1 truncate">
              Mode: {health.botMode} • Interactive Menu
            </p>
          </div>
        </div>

        {/* Card 3: Subscribers */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <span>Subscribers</span>
            <span className="text-xs text-indigo-400 font-semibold">
              {health.activeSubscribers} Active
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {health.totalSubscribers}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Registered chats receiving broadcast alerts
            </p>
          </div>
        </div>

        {/* Card 4: Messages Logged */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <span>Message Audit Logs</span>
            <span className="text-xs text-emerald-400 font-semibold">Persisted</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {health.totalMessages}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {health.totalTasks} managed tasks in store
            </p>
          </div>
        </div>
      </section>

      {/* Infrastructure & Services Detail Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service Configuration Box */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-indigo-400">⚡</span> Core Infrastructure & Configuration
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-zinc-800/80">
              <span className="text-zinc-400">Database Engine</span>
              <span className="font-mono text-xs text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded">
                {isDbConfigured() ? "Neon PostgreSQL (Serverless)" : "Local JSON Fallback"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-800/80">
              <span className="text-zinc-400">Telegram Bot Handler</span>
              <span className="font-mono text-xs text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded">
                GrammY Engine (Interactive Menu)
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-800/80">
              <span className="text-zinc-400">Webhook Target URL</span>
              <span className="font-mono text-xs text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded truncate max-w-[220px]">
                {health.appUrl ? `${health.appUrl}/api/telegram/webhook` : "Not defined (Set APP_URL)"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-800/80">
              <span className="text-zinc-400">OpenAI Integration</span>
              <span className="font-mono text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                Disabled (Interactive task solver & Draculino)
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-zinc-400">Admin Authentication</span>
              <span className="font-mono text-xs text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded">
                {health.hasAdmin ? "Admin IDs Configured" : "Default / Unrestricted"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Setup & Operations Guide */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-emerald-400">🛠️</span> Telegram Webhook & Deployment
            </h2>
            <span className="text-xs font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/50">
              Direct Controls
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Execute Telegram webhook operations and trigger deployment notifications directly from the dashboard or copy CLI commands.
          </p>
          <WebhookDeploymentControls
            defaultAppUrl={health.appUrl}
            telegramConfigured={health.telegramConfigured}
          />
        </div>
      </section>

      {/* Live Message & Task Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Message Audit Log */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-purple-400">💬</span> Recent Telegram Logs
            </h2>
            <Link
              href="/api/telegram/messages"
              target="_blank"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View all in API ↗
            </Link>
          </div>

          {health.recentMessages.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              No messages logged yet. Send a message to your Telegram bot to test logging.
            </div>
          ) : (
            <div className="space-y-2.5">
              {health.recentMessages.map((msg) => (
                <div
                  key={String(msg.id)}
                  className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/60 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          msg.direction === "incoming"
                            ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {msg.direction}
                      </span>
                      <span className="font-mono text-zinc-300">
                        {msg.username ? `@${msg.username}` : `Chat #${msg.chatId}`}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="text-zinc-200 font-mono text-[11px] bg-black/40 px-2 py-1 rounded truncate">
                    {msg.text || `[${msg.messageType}]`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Tasks Overview */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-amber-400">📋</span> Managed Tasks
            </h2>
            <Link
              href="/api/tasks"
              target="_blank"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View all in API ↗
            </Link>
          </div>

          {health.recentTasks.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              No tasks registered yet. Create tasks via Telegram /tasks or via POST /api/tasks.
            </div>
          ) : (
            <div className="space-y-2.5">
              {health.recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/60 text-xs flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-zinc-400">{task.id}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-medium capitalize ${
                          task.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : task.status === "in_progress"
                            ? "bg-indigo-500/15 text-indigo-400"
                            : "bg-amber-500/15 text-amber-400"
                        }`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="font-medium text-zinc-200 truncate">{task.title}</div>
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-zinc-500 shrink-0">
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-14 rounded-xl bg-zinc-900/80 border border-zinc-800" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-zinc-900/60 border border-zinc-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 rounded-xl bg-zinc-900/40 border border-zinc-800" />
        <div className="h-64 rounded-xl bg-zinc-900/40 border border-zinc-800" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Accent Gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-600/10 blur-[130px]" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[140px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400 animate-pulse" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Marc Backend Status
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-zinc-900 border-zinc-700 text-zinc-300">
                v0.1.0
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Real-time monitoring, service health metrics, and API control dashboard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/api/health"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <span>JSON Health Check</span>
              <span className="text-zinc-500">↗</span>
            </Link>
          </div>
        </header>

        {/* Live Dynamic Health Stream */}
        <Suspense fallback={<DashboardSkeleton />}>
          <LiveHealthSection />
        </Suspense>

        {/* API Endpoints Catalog */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-sky-400">🌐</span> Available API Endpoints & Routes
            </h2>
            <span className="text-xs text-zinc-500 font-mono">{apiEndpoints.length} registered routes</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {apiEndpoints.map((endpoint) => (
              <div
                key={endpoint.path}
                className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 transition-colors flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {endpoint.method}
                    </span>
                    <span className="font-mono text-xs text-zinc-200 font-medium">
                      {endpoint.path}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {endpoint.description}
                  </p>
                </div>
                <Link
                  href={endpoint.path}
                  target="_blank"
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium transition-colors shrink-0"
                >
                  Test ↗
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>
            Marc Backend Microservice • Next.js App Router
          </div>
          <div className="flex items-center gap-4">
            <Link href="/api/health" className="hover:text-zinc-300 transition-colors">
              Health Check API
            </Link>
            <Link href="/api/tasks" className="hover:text-zinc-300 transition-colors">
              Tasks API
            </Link>
            <Link href="/api/telegram/messages" className="hover:text-zinc-300 transition-colors">
              Messages Log
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
