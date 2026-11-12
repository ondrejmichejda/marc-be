import { NextRequest, NextResponse } from "next/server";
import { UserAiSettingsService } from "@/lib/openai";

/**
 * POST /api/user/ai-settings/validate
 * Validates an OpenAI API key against OpenAI's models API.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = body.apiKey;
    const organization = body.organization;

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
      return NextResponse.json(
        { valid: false, error: "OpenAI API token cannot be empty." },
        { status: 400 }
      );
    }

    const result = await UserAiSettingsService.validateApiKey(apiKey, organization);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
