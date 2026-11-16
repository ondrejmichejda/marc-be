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
 * GET /api/tracking/[id]/resets
 * Retrieves full reset history logs for a tracked item.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(req);

    const tracker = await TrackingService.getTrackerById(id, userId);
    if (!tracker) {
      return NextResponse.json(
        { error: `Tracked item with id '${id}' not found or access denied.` },
        { status: 404 }
      );
    }

    const resets = await TrackingService.getResetLogs(id, userId);

    return NextResponse.json({
      success: true,
      trackerId: id,
      count: resets.length,
      resets,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
