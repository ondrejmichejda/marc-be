import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { TelegramService } from "@/lib/telegram/service";
import { UserTelegramSettingsService } from "@/lib/telegram/userSettings";

/**
 * POST /api/user/telegram-settings/test
 * Sends a test ping message via Johan bot to user's configured Telegram ID.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || "anonymous";
    const body = await req.json().catch(() => ({}));

    // If an explicit telegramId is passed in the test request body, save or test it directly
    const targetTelegramId = body.telegramId ? String(body.telegramId).trim() : undefined;

    let testUserId = userId;
    if (targetTelegramId) {
      // Temporarily save or update settings if requested
      await UserTelegramSettingsService.saveSettings(userId, {
        telegramId: targetTelegramId,
        telegramUsername: body.telegramUsername,
        notificationsEnabled: true,
      });
    }

    const testResult = await TelegramService.testPersonalNotification(
      testUserId,
      body.customMessage
    );

    if (!testResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: testResult.error || "Failed to send test message via Johan bot.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test message sent successfully via Johan bot.",
      chatId: testResult.chatId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
