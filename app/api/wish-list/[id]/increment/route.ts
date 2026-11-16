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
 * POST /api/wish-list/[id]/increment
 * Increments the wish's counter by +1 (or specified amount).
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(req);

    let amount = 1;
    try {
      const body = await req.json();
      if (body && Number.isFinite(Number(body.amount))) {
        amount = Math.max(1, Math.floor(Number(body.amount)));
      }
    } catch {
      // Empty body is valid and defaults to +1
      amount = 1;
    }

    const updated = await WishListService.incrementCounter(id, userId, amount);
    if (!updated) {
      return NextResponse.json(
        { error: `Wish with ID '${id}' not found or access denied.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      wish: updated,
      message: `Counter increased to ${updated.counter} (max: ${updated.maxCounter}).`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
