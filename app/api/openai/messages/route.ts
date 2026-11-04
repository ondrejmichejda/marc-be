import { NextRequest, NextResponse } from "next/server";
import { OpenAiLogService } from "@/lib/openai";

/**
 * GET /api/openai/messages
 * Retrieves OpenAI interaction logs with optional filtering by model, status, search, and limit.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const model = searchParams.get("model") || undefined;
    const status = searchParams.get("status") as "success" | "error" | null;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const messages = await OpenAiLogService.listLogs({
      model,
      status: status || undefined,
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return NextResponse.json({
      count: messages.length,
      messages,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/openai/messages
 * Clears local OpenAI log history.
 */
export async function DELETE() {
  try {
    OpenAiLogService.clearLocalLogs();
    return NextResponse.json({
      success: true,
      message: "OpenAI message log history reset successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
