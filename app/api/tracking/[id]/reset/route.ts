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
 * POST /api/tracking/[id]/reset
 * Resets the duration of a tracked item and saves an immutable audit reset log.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(req);

    let note: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.note === "string") {
        note = body.note;
      }
    } catch {
      // Body is optional
    }

    const { tracker, resetLog } = await TrackingService.resetTracker(id, userId, { note });

    return NextResponse.json({
      success: true,
      tracker,
      resetLog,
      message: `Duration for '${tracker.name}' has been successfully reset.`,
    });
  } catch (error) {
    const status = (error as Error).message.includes("not found") ? 404 : 400;
    return NextResponse.json(
      { error: (error as Error).message },
      { status }
    );
  }
}
