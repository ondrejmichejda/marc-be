import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { WishListService } from "@/lib/wishlist";

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
 * GET /api/wish-list
 * Returns wish list items belonging exclusively to the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resolvedUserId = await resolveUserId(req);
    const targetUserId = searchParams.get("userId") || resolvedUserId;

    // Enforce per-user privacy: standard users can only access their own wishes
    const currentUser = await getCurrentUser(req);
    const effectiveUserId =
      currentUser && currentUser.role !== "admin" ? currentUser.id : targetUserId;

    const searchParam = searchParams.get("search");
    const statusParam = searchParams.get("status") as "all" | "waiting" | "ready" | "completed" | null;

    const wishes = await WishListService.getWishesByUser(effectiveUserId, {
      search: searchParam || undefined,
      status: statusParam || undefined,
    });

    const summary = await WishListService.getSummary(effectiveUserId);

    return NextResponse.json({
      success: true,
      userId: effectiveUserId,
      count: wishes.length,
      wishes,
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
 * POST /api/wish-list
 * Creates a new wish list item with name, description, created date metadata, waiting period (1week, 2weeks, 1month), counter, and max counter.
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

    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const waitingPeriod = typeof body?.waitingPeriod === "string" ? body.waitingPeriod : "1week";
    const counter = Number.isFinite(Number(body?.counter)) ? Math.max(0, Math.floor(Number(body?.counter))) : 0;
    const maxCounter = Number.isFinite(Number(body?.maxCounter))
      ? Math.max(1, Math.floor(Number(body?.maxCounter)))
      : 5;

    const userId = (typeof body?.userId === "string" && body.userId.trim()) || resolvedUserId;
    const createdAt = typeof body?.createdAt === "string" && body.createdAt.trim() ? body.createdAt.trim() : undefined;
    const notifyTelegram = body?.notifyTelegram !== undefined ? Boolean(body.notifyTelegram) : true;

    const wish = await WishListService.createWish({
      userId,
      name,
      description,
      waitingPeriod,
      counter,
      maxCounter,
      notifyTelegram,
      createdAt,
    });

    return NextResponse.json(
      {
        success: true,
        wish,
        message: `Wish '${wish.name}' created successfully.`,
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
 * DELETE /api/wish-list
 * Clears wishes (for tests).
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("clearAll") === "true") {
      await WishListService.clearAll();
      return NextResponse.json({ success: true, message: "All wishes cleared." });
    }

    return NextResponse.json(
      { error: "Provide clearAll=true to clear all wishes." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
