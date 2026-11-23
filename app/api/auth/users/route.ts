import { NextRequest, NextResponse } from "next/server";
import { UserService, getCurrentUser, RolesService } from "@/lib/auth";

/**
 * GET /api/auth/users
 * Returns list of registered users.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  const users = await UserService.listUsers({ limit });

  return NextResponse.json({
    count: users.length,
    users,
  });
}

/**
 * PATCH /api/auth/users
 * Updates a user's role (Admin access required).
 */
export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can modify user roles." },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be an object." },
        { status: 400 }
      );
    }
    const { userId, role } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Missing required parameter 'userId'." },
        { status: 400 }
      );
    }

    if (!role || typeof role !== "string") {
      return NextResponse.json(
        { error: "Missing required parameter 'role'." },
        { status: 400 }
      );
    }

    const normalizedRole = RolesService.normalizeRoleId(role);
    const existingRole = await RolesService.getRole(normalizedRole);
    if (!existingRole) {
      return NextResponse.json(
        { error: `Role '${role}' does not exist.` },
        { status: 400 }
      );
    }

    const updatedUser = await UserService.updateUserRole(userId, normalizedRole);

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update user role", details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/users?userId=...
 * Deletes a registered user (Admin access required).
 */
export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can delete users." },
        { status: 403 }
      );
    }

    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId || !userId.trim()) {
      return NextResponse.json(
        { error: "Missing required parameter 'userId'." },
        { status: 400 }
      );
    }

    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: "Administrators cannot delete their own account." },
        { status: 400 }
      );
    }

    const deleted = await UserService.deleteUser(userId);
    if (!deleted) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete user", details: (error as Error).message },
      { status: 500 }
    );
  }
}
