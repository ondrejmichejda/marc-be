import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { RolesService } from "@/lib/auth/rolesService";
import { FireSafetySolutionService } from "@/lib/fss";

async function resolveUser(req: NextRequest): Promise<{
  userId: string;
  userEmail?: string;
  isSystemUser: boolean;
}> {
  const currentUser = await getCurrentUser(req);
  if (currentUser) {
    const role = await RolesService.getRole(currentUser.role);
    const isSystemUser = role?.isSystem ?? false;
    return { userId: currentUser.id, userEmail: currentUser.email, isSystemUser };
  }

  const headerUserId = req.headers.get("x-user-id") || req.headers.get("user-id");
  if (headerUserId && headerUserId.trim()) {
    return {
      userId: headerUserId.trim(),
      userEmail: req.headers.get("x-user-email") || undefined,
      isSystemUser: false,
    };
  }

  return { userId: "default_user", userEmail: "user@marc.dev", isSystemUser: false };
}

/**
 * GET /api/fss
 * Lists Fire Safety Solutions with optional search and userId filters.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resolved = await resolveUser(req);
    const targetUserId = searchParams.get("userId") || resolved.userId;
    const search = searchParams.get("search") || undefined;

    const solutions = await FireSafetySolutionService.listSolutions({
      userId: searchParams.has("all") || resolved.isSystemUser ? undefined : targetUserId,
      search,
      isSystemUser: resolved.isSystemUser,
    });

    return NextResponse.json({
      success: true,
      count: solutions.length,
      solutions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fss
 * Creates a new Fire Safety Solution.
 */
export async function POST(req: NextRequest) {
  try {
    const resolved = await resolveUser(req);
    const body = await req.json();

    const userId = (typeof body?.userId === "string" && body.userId.trim()) || resolved.userId;

    const created = await FireSafetySolutionService.createSolution({
      ...body,
      userId,
    });

    return NextResponse.json(
      {
        success: true,
        solution: created,
        message: "Fire Safety Solution created successfully.",
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
 * DELETE /api/fss
 * Resets or clears all solutions (when clearAll=true).
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("clearAll") === "true") {
      await FireSafetySolutionService.clearAll();
      return NextResponse.json({ success: true, message: "All Fire Safety Solutions cleared." });
    }

    return NextResponse.json(
      { error: "Provide clearAll=true parameter to clear all Fire Safety Solutions." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
