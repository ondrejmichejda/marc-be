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
 * GET /api/tracking/[id]
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

    return NextResponse.json({
      success: true,
      tracker,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tracking/[id]
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(req);
    const body = await req.json();

    const updated = await TrackingService.updateTracker(id, userId, {
      name: body?.name,
      durationDays: body?.durationDays !== undefined ? Number(body.durationDays) : undefined,
      durationHours: body?.durationHours !== undefined ? Number(body.durationHours) : undefined,
      durationMinutes: body?.durationMinutes !== undefined ? Number(body.durationMinutes) : undefined,
      notifyTelegram: body?.notifyTelegram !== undefined ? Boolean(body.notifyTelegram) : undefined,
    });

    return NextResponse.json({
      success: true,
      tracker: updated,
      message: `Tracked item '${updated.name}' updated successfully.`,
    });
  } catch (error) {
    const status = (error as Error).message.includes("not found") ? 404 : 400;
    return NextResponse.json(
      { error: (error as Error).message },
      { status }
    );
  }
}

/**
 * DELETE /api/tracking/[id]
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(req);

    const deleted = await TrackingService.deleteTracker(id, userId);
    if (!deleted) {
      return NextResponse.json(
        { error: `Tracked item with id '${id}' not found or access denied.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      id,
      message: "Tracked item deleted successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
