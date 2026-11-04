import { NextRequest, NextResponse } from "next/server";
import { RolesService, getCurrentUser } from "@/lib/auth";

/**
 * GET /api/auth/roles
 * Returns all dynamic role definitions, master menu items, and current menu-to-role mappings.
 */
export async function GET() {
  try {
    const roles = await RolesService.listRoles();
    const menuItems = await RolesService.getAllMenuItems();
    const mappings = await RolesService.getMenuMappings();

    return NextResponse.json({
      roles: roles.map((r) => r.id),
      definitions: Object.fromEntries(roles.map((r) => [r.id, r])),
      allMenuItems: menuItems,
      mappings,
      mapping: Object.fromEntries(
        roles.map((r) => [
          r.id,
          {
            definition: r,
            menuItems: menuItems.filter((item) => item.allowedRoles.includes(r.id)),
          },
        ])
      ),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch roles", details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/roles
 * Creates a new role definition (Admin only).
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can create roles." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, name, description, badgeColor } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Missing required parameter 'id'." },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Missing required parameter 'name'." },
        { status: 400 }
      );
    }

    const newRole = await RolesService.createRole({
      id,
      name,
      description,
      badgeColor,
    });

    return NextResponse.json({
      success: true,
      role: newRole,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create role", details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/roles
 * Deletes a custom role (Admin only).
 */
export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can delete roles." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    let roleId = searchParams.get("roleId");

    if (!roleId) {
      try {
        const body = await req.json();
        roleId = body.roleId;
      } catch {
        // query param fallback
      }
    }

    if (!roleId) {
      return NextResponse.json(
        { error: "Missing required parameter 'roleId'." },
        { status: 400 }
      );
    }

    const deleted = await RolesService.deleteRole(roleId);
    return NextResponse.json({
      success: deleted,
      roleId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete role", details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/roles
 * Updates menu item to role mappings (Admin only).
 */
export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can update menu mappings." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { mappings } = body;

    if (!mappings || typeof mappings !== "object") {
      return NextResponse.json(
        { error: "Missing required parameter 'mappings' (object of menu_id -> role_ids[])." },
        { status: 400 }
      );
    }

    const updated = await RolesService.updateMenuMappings(mappings);
    return NextResponse.json({
      success: true,
      mappings: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update menu mappings", details: (error as Error).message },
      { status: 500 }
    );
  }
}
