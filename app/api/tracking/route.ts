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
 * GET /api/tracking
 * Returns trackers belonging exclusively to the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resolvedUserId = await resolveUserId(req);
    const targetUserId = searchParams.get("userId") || resolvedUserId;

    // Enforce per-user privacy: standard users can only access their own trackers
    const currentUser = await getCurrentUser(req);
    const effectiveUserId =
      currentUser && currentUser.role !== "admin" ? currentUser.id : targetUserId;

    const searchParam = searchParams.get("search");
    const statusParam = searchParams.get("status") as "active" | "completed" | "all" | null;

    const trackers = await TrackingService.getTrackersByUser(effectiveUserId, {
      search: searchParam || undefined,
      status: statusParam || undefined,
    });

    const summary = await TrackingService.getSummary(effectiveUserId);

    return NextResponse.json({
      success: true,
      userId: effectiveUserId,
      count: trackers.length,
      trackers,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tracking
 * Creates a new tracked item with custom name, duration (days, hours, minutes), and telegram notification option.
 */
export async function POST(req: NextRequest) {
  try {
    const resolvedUserId = await resolveUserId(req);
    const body = await req.json();

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Field 'name' is required and cannot be empty." },
        { status: 400 }
      );
    }

    const durationDays = Number(body?.durationDays) || 0;
    const durationHours = Number(body?.durationHours) || 0;
    const durationMinutes = Number(body?.durationMinutes) || 0;

    if (durationDays === 0 && durationHours === 0 && durationMinutes === 0) {
      return NextResponse.json(
        { error: "Duration must be greater than 0 (set days, hours, or minutes)." },
        { status: 400 }
      );
    }

    const userId = (typeof body?.userId === "string" && body.userId.trim()) || resolvedUserId;
    const notifyTelegram = Boolean(body?.notifyTelegram);

    const tracker = await TrackingService.createTracker({
      userId,
      name,
      durationDays,
      durationHours,
      durationMinutes,
      notifyTelegram,
    });

    return NextResponse.json(
      {
        success: true,
        tracker,
        message: `Tracked item '${tracker.name}' created successfully.`,
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
 * DELETE /api/tracking
 * Clears trackers (for tests).
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("clearAll") === "true") {
      await TrackingService.clearAll();
      return NextResponse.json({ success: true, message: "All trackers cleared." });
    }

    return NextResponse.json(
      { error: "Provide clearAll=true to clear all trackers." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
