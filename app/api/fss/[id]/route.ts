import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { FireSafetySolutionService } from "@/lib/fss";

async function resolveUserId(req: NextRequest): Promise<{ userId: string; userEmail?: string }> {
  const currentUser = await getCurrentUser(req);
  if (currentUser) {
    return { userId: currentUser.id, userEmail: currentUser.email };
  }
  const headerUserId = req.headers.get("x-user-id") || req.headers.get("user-id");
  if (headerUserId && headerUserId.trim()) {
    return { userId: headerUserId.trim(), userEmail: req.headers.get("x-user-email") || undefined };
  }
  return { userId: "default_user", userEmail: "user@marc.dev" };
}

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * GET /api/fss/[id]
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const solution = await FireSafetySolutionService.getSolutionById(id);

    if (!solution) {
      return NextResponse.json(
        { error: `Fire Safety Solution with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, solution });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/fss/[id]
 * Updates fields of a Fire Safety Solution.
 */
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const resolved = await resolveUserId(req);
    const body = await req.json();

    const updated = await FireSafetySolutionService.updateSolution(id, resolved.userId, body);

    return NextResponse.json({
      success: true,
      solution: updated,
      message: "Fire Safety Solution updated successfully.",
    });
  } catch (error) {
    const msg = (error as Error).message;
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/**
 * PATCH /api/fss/[id]
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  return PUT(req, context);
}

/**
 * DELETE /api/fss/[id]
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await FireSafetySolutionService.deleteSolution(id);

    if (!deleted) {
      return NextResponse.json(
        { error: `Fire Safety Solution '${id}' not found or could not be deleted.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Fire Safety Solution deleted successfully.",
      deletedId: id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
