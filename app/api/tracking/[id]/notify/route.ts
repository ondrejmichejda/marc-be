import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { TrackingService } from "@/lib/tracking";

async function resolveUserId(req: NextRequest): Promise<string> {
  const currentUser = await getCurrentUser(req);
  if (currentUser) {
    return currentUser.id;
  }
  const headerUserId = req.headers.get("x-user-id") || req.headers.get("user-id");
  if (headerUserId && headerUserId.trim()) {
    return headerUserId.trim();
  }
  return "default_user";
}

/**
 * POST /api/tracking/[id]/notify
 * Manually dispatches or tests a Telegram notification for a tracked item.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(req);

    const result = await TrackingService.notifyTrackerTelegram(id, userId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to deliver Telegram notification.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: "Telegram notification delivered successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
