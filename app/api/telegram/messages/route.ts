import { NextRequest, NextResponse } from "next/server";
import { MessageService } from "@/lib/telegram/messages";
import { MessageDirection } from "@/lib/telegram/types";

/**
 * GET /api/telegram/messages
 * Retrieves message logs with optional filtering by chatId, userId, direction, and limit.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const chatId = searchParams.get("chatId");
    const userId = searchParams.get("userId");
    const direction = searchParams.get("direction") as MessageDirection | null;
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const messages = await MessageService.listMessages({
      chatId: chatId ? parseInt(chatId, 10) : undefined,
      userId: userId ? parseInt(userId, 10) : undefined,
      direction: direction || undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return NextResponse.json({
      count: messages.length,
      messages,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
