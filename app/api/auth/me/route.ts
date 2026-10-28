import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isGoogleAuthConfigured, RolesService } from "@/lib/auth";

/**
 * GET /api/auth/me
 * Returns information about the currently authenticated user session, their role, and accessible menu items.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  const configured = isGoogleAuthConfigured();

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      role: null,
      roleInfo: null,
      menu: [],
      configured,
    });
  }

  const menu = await RolesService.getMenuItemsForRole(user.role);
  const roleInfo = await RolesService.getRoleBadgeInfo(user.role);

  return NextResponse.json({
    authenticated: true,
    user,
    role: user.role,
    roleInfo,
    menu,
    configured,
  });
}
