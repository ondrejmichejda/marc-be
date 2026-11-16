import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { UserTelegramSettingsService } from "@/lib/telegram/userSettings";

/**
 * GET /api/user/telegram-settings
 * Returns the active user's personal Telegram configuration status.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || "anonymous";

    const config = await UserTelegramSettingsService.getUserTelegramConfig(userId);
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST / PUT /api/user/telegram-settings
 * Saves or updates personal Telegram ID and configuration for the active user.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || "anonymous";
    const body = await req.json().catch(() => ({}));

    // If clear is requested or telegramId is explicitly set to empty string
    if (body.clear === true || (body.telegramId !== undefined && String(body.telegramId).trim() === "")) {
      await UserTelegramSettingsService.saveSettings(userId, {
        telegramId: "",
        telegramUsername: body.telegramUsername,
        notificationsEnabled: body.notificationsEnabled,
      });

      const config = await UserTelegramSettingsService.getUserTelegramConfig(userId);
      return NextResponse.json({
        success: true,
        message: "Personal Telegram ID cleared successfully.",
        config,
      });
    }

    // Save updated Telegram settings
    await UserTelegramSettingsService.saveSettings(userId, {
      telegramId: body.telegramId,
      telegramUsername: body.telegramUsername,
      notificationsEnabled: body.notificationsEnabled,
    });

    const config = await UserTelegramSettingsService.getUserTelegramConfig(userId);
    return NextResponse.json({
      success: true,
      message: "Personal Telegram settings saved successfully.",
      config,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

/**
 * DELETE /api/user/telegram-settings
 * Clears or resets personal Telegram settings for the active user.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || "anonymous";

    await UserTelegramSettingsService.deleteSettings(userId);
    const config = await UserTelegramSettingsService.getUserTelegramConfig(userId);

    return NextResponse.json({
      success: true,
      message: "Personal Telegram settings deleted successfully.",
      config,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
