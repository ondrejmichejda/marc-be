import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { UserAiSettingsService } from "@/lib/openai";

/**
 * GET /api/user/ai-settings/usage
 * Returns the usage, cost statistics, and OpenAI credit balance for the active user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || "anonymous";

    const usage = await UserAiSettingsService.getUserUsageOverview(userId);
    return NextResponse.json({
      success: true,
      usage,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/ai-settings/usage
 * Computes usage statistics and checks credit balance for a given custom key or organization.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || "anonymous";
    const body = await req.json().catch(() => ({}));

    const usage = await UserAiSettingsService.getUserUsageOverview(
      userId,
      body.apiKey,
      body.organization
    );

    return NextResponse.json({
      success: true,
      usage,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
