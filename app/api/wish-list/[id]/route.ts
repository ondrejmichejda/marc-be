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
 * GET /api/wish-list/[id]
 * Retrieves a single wish by ID.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(req);

    const wish = await WishListService.getWishById(id, userId);
    if (!wish) {
      return NextResponse.json(
        { error: `Wish with ID '${id}' not found or access denied.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      wish,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/wish-list/[id]
 * Updates wish properties: name, description, waitingPeriod, counter, and maxCounter.
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(req);
    const body = await req.json();

    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    if (name !== undefined && !name) {
      return NextResponse.json(
        { error: "Field 'name' cannot be empty." },
        { status: 400 }
      );
    }

    const description =
      typeof body?.description === "string" ? body.description.trim() : undefined;
    const waitingPeriod =
      typeof body?.waitingPeriod === "string" ? body.waitingPeriod : undefined;
    const counter =
      body?.counter !== undefined && Number.isFinite(Number(body?.counter))
        ? Math.max(0, Math.floor(Number(body.counter)))
        : undefined;
    const maxCounter =
      body?.maxCounter !== undefined && Number.isFinite(Number(body?.maxCounter))
        ? Math.max(1, Math.floor(Number(body.maxCounter)))
        : undefined;

    const updated = await WishListService.updateWish(
      id,
      {
        name,
        description,
        waitingPeriod,
        counter,
        maxCounter,
      },
      userId
    );

    if (!updated) {
      return NextResponse.json(
        { error: `Wish with ID '${id}' not found or access denied.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      wish: updated,
      message: `Wish '${updated.name}' updated successfully.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wish-list/[id]
 * Deletes a wish by ID.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = await resolveUserId(req);

    const deleted = await WishListService.deleteWish(id, userId);
    if (!deleted) {
      return NextResponse.json(
        { error: `Wish with ID '${id}' not found or access denied.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      id,
      message: "Wish deleted successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
