import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { UserAiSettingsService } from "@/lib/openai";

/**
 * GET /api/user/ai-settings/models
 * Returns all available OpenAI models (live from OpenAI API when a token is configured or catalog fallback).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || "anonymous";

    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get("apiKey") || undefined;
    const organization = searchParams.get("organization") || undefined;

    const result = await UserAiSettingsService.getAvailableModels(
      userId,
      apiKey,
      organization
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Failed to retrieve OpenAI models.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/ai-settings/models
 * Queries available OpenAI models for a specific provided API key and organization.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user?.id || "anonymous";

    const body = await req.json().catch(() => ({}));
    const apiKey = body.apiKey;
    const organization = body.organization;

    const result = await UserAiSettingsService.getAvailableModels(
      userId,
      apiKey,
      organization
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Failed to retrieve OpenAI models.",
      },
      { status: 500 }
    );
  }
}
