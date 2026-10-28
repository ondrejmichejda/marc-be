import { NextResponse } from "next/server";
import { OpenAiLogService, getOpenAiConfig } from "@/lib/openai";

/**
 * GET /api/openai/usage
 * Returns aggregate token usage, costs, model distributions, and configuration status.
 */
export async function GET() {
  try {
    const [usage, config] = await Promise.all([
      OpenAiLogService.getUsageSummary(),
      Promise.resolve(getOpenAiConfig()),
    ]);

    return NextResponse.json({
      config,
      usage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
