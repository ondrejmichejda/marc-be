import { NextRequest, NextResponse } from "next/server";
import { getTelegramConfig, isTelegramConfigured } from "@/lib/telegram/config";
import { TelegramService } from "@/lib/telegram/service";

/**
 * GET /api/telegram/setup-webhook
 * Retrieves current webhook status and bot profile from Telegram API.
 */
export async function GET() {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN is not configured" },
      { status: 500 }
    );
  }

  try {
    const [botInfo, webhookInfo] = await Promise.all([
      TelegramService.getBotMe(),
      TelegramService.getWebhookInfo(),
    ]);

    return NextResponse.json({
      bot: botInfo,
      webhook: webhookInfo,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/telegram/setup-webhook
 * Registers the webhook with Telegram.
 * Accepts optional JSON body { url?: string }. If not provided, uses configured APP_URL.
 */
export async function POST(req: NextRequest) {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN is not configured" },
      { status: 500 }
    );
  }

  try {
    const config = getTelegramConfig();
    let webhookUrl: string | undefined;

    // Check if body contains custom URL
    try {
      const body = await req.json();
      webhookUrl = body?.url;
    } catch {
      // Empty body is okay
    }

    if (!webhookUrl) {
      if (!config.appUrl) {
        return NextResponse.json(
          {
            error:
              "APP_URL environment variable is missing and no url was provided in request body. Provide { url: 'https://...' } or set APP_URL in .env.local",
          },
          { status: 400 }
        );
      }
      // Trim trailing slash and append webhook path
      const baseUrl = config.appUrl.replace(/\/+$/, "");
      webhookUrl = `${baseUrl}/api/telegram/webhook`;
    }

    const success = await TelegramService.setWebhook(
      webhookUrl,
      config.webhookSecret
    );

    const info = await TelegramService.getWebhookInfo();

    return NextResponse.json({
      success,
      webhookUrl,
      webhookInfo: info,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/telegram/setup-webhook
 * Removes the currently registered webhook from Telegram.
 */
export async function DELETE() {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN is not configured" },
      { status: 500 }
    );
  }

  try {
    const success = await TelegramService.deleteWebhook();
    return NextResponse.json({ success, message: "Webhook deleted." });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
