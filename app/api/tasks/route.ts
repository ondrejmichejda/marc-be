import { NextRequest, NextResponse } from "next/server";
import { TaskService } from "@/lib/telegram/handlers/taskHandler";
import { TaskPriority, TaskStatus } from "@/lib/telegram/types";

/**
 * GET /api/tasks
 * Returns tasks, optionally filtered by status, userId, or chatId.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") as TaskStatus | null;
  const userId = searchParams.get("userId");
  const chatId = searchParams.get("chatId");

  const tasks = await TaskService.listTasks({
    status: status || undefined,
    telegramUserId: userId ? parseInt(userId, 10) : undefined,
    telegramChatId: chatId ? parseInt(chatId, 10) : undefined,
  });

  return NextResponse.json({
    count: tasks.length,
    tasks,
  });
}

/**
 * POST /api/tasks
 * Creates a task programmatically.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title) {
      return NextResponse.json(
        { error: "Field 'title' is required" },
        { status: 400 }
      );
    }

    const task = await TaskService.createTask({
      title: body.title,
      description: body.description,
      priority: body.priority as TaskPriority,
      telegramChatId: body.telegramChatId || 0,
      telegramUserId: body.telegramUserId || 0,
      telegramUsername: body.telegramUsername,
      metadata: body.metadata,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
