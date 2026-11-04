import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  ScheduledPromptService,
  normalizeScheduledTime,
  SCHEDULED_TIME_OPTIONS,
} from "@/lib/prompts";

/**
 * Resolves the effective user ID for the request.
 */
async function resolveUserId(req: NextRequest): Promise<{ userId: string; userEmail?: string }> {
  const currentUser = await getCurrentUser(req);
  if (currentUser) {
    return { userId: currentUser.id, userEmail: currentUser.email };
  }

  // Fallback for API clients or dev / headers
  const headerUserId = req.headers.get("x-user-id") || req.headers.get("user-id");
  if (headerUserId && headerUserId.trim()) {
    return { userId: headerUserId.trim(), userEmail: req.headers.get("x-user-email") || undefined };
  }

  return { userId: "default_user", userEmail: "user@marc.dev" };
}

/**
 * GET /api/prompts
 * Returns scheduled AI prompts for the authenticated/specified user.
 * Optional query parameters:
 *  - time: "6am" | "9am" | "1pm" | "5pm" | "all"
 *  - status: "active" | "paused" | "all"
 *  - search: string
 *  - userId: string (admin or override)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resolved = await resolveUserId(req);
    const targetUserId = searchParams.get("userId") || resolved.userId;

    const timeParam = searchParams.get("time");
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search");

    let isActiveFilter: boolean | undefined;
    if (statusParam === "active") isActiveFilter = true;
    else if (statusParam === "paused" || statusParam === "inactive") isActiveFilter = false;

    const prompts = await ScheduledPromptService.getPromptsByUser(targetUserId, {
      scheduledTime: timeParam && timeParam !== "all" ? timeParam : undefined,
      isActive: isActiveFilter,
      search: searchParam || undefined,
    });

    const summary = await ScheduledPromptService.getSummary(targetUserId);

    return NextResponse.json({
      success: true,
      userId: targetUserId,
      count: prompts.length,
      prompts,
      summary,
      timeOptions: SCHEDULED_TIME_OPTIONS,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prompts
 * Creates a new scheduled AI prompt for the user.
 * Body parameters:
 *  - prompt: string (required)
 *  - scheduledTime: "6am" | "9am" | "1pm" | "5pm" (required)
 *  - title?: string
 *  - isActive?: boolean (default: true)
 *  - userId?: string (override)
 */
export async function POST(req: NextRequest) {
  try {
    const resolved = await resolveUserId(req);
    const body = await req.json();

    const promptText = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!promptText) {
      return NextResponse.json(
        { error: "Field 'prompt' is required and cannot be empty." },
        { status: 400 }
      );
    }

    const scheduledTimeRaw = body?.scheduledTime;
    if (!scheduledTimeRaw) {
      return NextResponse.json(
        {
          error: "Field 'scheduledTime' is required. Allowed options are: 6am, 9am, 1pm, 5pm.",
          allowedOptions: SCHEDULED_TIME_OPTIONS,
        },
        { status: 400 }
      );
    }

    let scheduledTime;
    try {
      scheduledTime = normalizeScheduledTime(scheduledTimeRaw);
    } catch {
      return NextResponse.json(
        {
          error: `Invalid scheduledTime '${scheduledTimeRaw}'. Allowed options are: 6am, 9am, 1pm, 5pm.`,
          allowedOptions: SCHEDULED_TIME_OPTIONS,
        },
        { status: 400 }
      );
    }

    const userId = (typeof body?.userId === "string" && body.userId.trim()) || resolved.userId;
    const userEmail = body?.userEmail || resolved.userEmail;
    const title = typeof body?.title === "string" ? body.title : undefined;
    const isActive = body?.isActive !== undefined ? Boolean(body.isActive) : true;

    const createdPrompt = await ScheduledPromptService.createPrompt({
      userId,
      userEmail,
      prompt: promptText,
      scheduledTime,
      title,
      isActive,
    });

    return NextResponse.json(
      {
        success: true,
        prompt: createdPrompt,
        message: `AI prompt scheduled successfully for ${createdPrompt.scheduledTime}.`,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/prompts
 * Clears prompts (for tests or reset if requested).
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("clearAll") === "true") {
      await ScheduledPromptService.clearAll();
      return NextResponse.json({ success: true, message: "All prompts cleared." });
    }

    return NextResponse.json(
      { error: "Provide clearAll=true to clear all prompts." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
