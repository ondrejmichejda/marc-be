import { NextRequest, NextResponse } from "next/server";
import { initTelegramBot } from "@/lib/telegram/bot";
import { getTelegramConfig, isTelegramConfigured } from "@/lib/telegram/config";

/**
 * Handles incoming webhook updates from Telegram Bot API.
 */
export async function POST(req: NextRequest) {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "Telegram is not configured. Set TELEGRAM_BOT_TOKEN in .env.local" },
      { status: 500 }
    );
  }

  const config = getTelegramConfig();

  // Validate the secret token header if configured in environment
  if (config.webhookSecret) {
    const incomingSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (incomingSecret !== config.webhookSecret) {
      console.warn("[TelegramWebhook] Received update with invalid secret token.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const update = await req.json();
    console.log(`[TelegramWebhook] Received update #${update.update_id || "unknown"}`);
    const bot = await initTelegramBot();

    // Process update through grammY bot pipeline
    await bot.handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[TelegramWebhook] Error processing update:", error);
    // Returning 200 prevents Telegram from indefinitely retrying a malformed update
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 200 }
    );
  }
}

/**
 * Health check endpoint for the webhook route.
 */
export async function GET() {
  const configured = isTelegramConfigured();
  return NextResponse.json({
    status: configured ? "ready" : "unconfigured",
    message: configured
      ? "Telegram webhook endpoint is operational."
      : "Please configure TELEGRAM_BOT_TOKEN in .env.local.",
    timestamp: new Date().toISOString(),
  });
}
