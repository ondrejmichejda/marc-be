import { NextRequest, NextResponse } from "next/server";
import { getTelegramConfig, isTelegramConfigured } from "@/lib/telegram/config";
import { TelegramService } from "@/lib/telegram/service";
import { SubscriberService } from "@/lib/telegram/subscribers";

function isAuthorized(req: NextRequest): boolean {
  const config = getTelegramConfig();
  const secretKey = config.adminApiKey || config.webhookSecret;

  // If no secret key is set up, allow the request (or in production recommend setting one)
  if (!secretKey) {
    return true;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.replace(/^Bearer\s+/i, "") === secretKey) {
    return true;
  }

  const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
  if (secretToken === secretKey) {
    return true;
  }

  const apiKeyHeader = req.headers.get("x-api-key");
  if (apiKeyHeader === secretKey) {
    return true;
  }

  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secretKey || url.searchParams.get("key") === secretKey) {
    return true;
  }

  return false;
}

/**
 * POST /api/telegram/notify-deployment
 * Broadcasts a deployment notification to all active Telegram subscribers.
 */
export async function POST(req: NextRequest) {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "Telegram bot is not configured" },
      { status: 500 }
    );
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const result = await TelegramService.broadcastDeploymentNotification({
      version: body.version,
      message: body.message,
      releaseNotes: body.releaseNotes,
      deployId: body.deployId,
      force: body.force,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error("[NotifyDeploymentAPI] Error broadcasting notification:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/telegram/notify-deployment
 * Returns subscriber summary and bot status.
 */
export async function GET(req: NextRequest) {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "Telegram bot is not configured" },
      { status: 500 }
    );
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const all = await SubscriberService.getAllSubscribers();
  const active = all.filter((s) => s.isActive);

  return NextResponse.json({
    ok: true,
    totalSubscribers: all.length,
    activeSubscribers: active.length,
  });
}
