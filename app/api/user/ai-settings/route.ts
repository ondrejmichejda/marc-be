import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { UserAiSettingsService } from "@/lib/openai";

/**
 * GET /api/user/ai-settings
 * Returns the active user's OpenAI configuration and settings status.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || "anonymous";

    const config = await UserAiSettingsService.getUserOpenAiConfig(userId);
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
 * POST / PUT /api/user/ai-settings
 * Saves or updates OpenAI configuration for the active user.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || "anonymous";
    const body = await req.json().catch(() => ({}));

    // If clear is requested or apiKey is explicitly set to empty string
    if (body.clear === true || (body.apiKey !== undefined && body.apiKey.trim() === "")) {
      await UserAiSettingsService.saveSettings(userId, {
        apiKey: "",
        defaultModel: body.defaultModel,
        webSearchEnabled: body.webSearchEnabled,
        organization: body.organization,
        temperature: body.temperature,
        reasoningEffort: body.reasoningEffort,
        customModel: body.customModel,
      });

      const config = await UserAiSettingsService.getUserOpenAiConfig(userId);
      return NextResponse.json({
        success: true,
        message: "OpenAI API token cleared successfully.",
        config,
      });
    }

    // Save updated settings
    await UserAiSettingsService.saveSettings(userId, {
      apiKey: body.apiKey,
      defaultModel: body.defaultModel,
      webSearchEnabled: body.webSearchEnabled,
      organization: body.organization,
      temperature: body.temperature,
      reasoningEffort: body.reasoningEffort,
      customModel: body.customModel,
    });

    const config = await UserAiSettingsService.getUserOpenAiConfig(userId);
    return NextResponse.json({
      success: true,
      message: "OpenAI settings saved successfully.",
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
 * DELETE /api/user/ai-settings
 * Clears or resets OpenAI settings for the active user.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || "anonymous";

    await UserAiSettingsService.deleteSettings(userId);
    const config = await UserAiSettingsService.getUserOpenAiConfig(userId);

    return NextResponse.json({
      success: true,
      message: "OpenAI settings deleted successfully.",
      config,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
