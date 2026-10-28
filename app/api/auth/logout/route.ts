import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

/**
 * POST /api/auth/logout
 * Clears the session cookie and signs out the user.
 */
export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });
  return clearSessionCookie(response);
}

/**
 * GET /api/auth/logout
 * Clears the session cookie and redirects user to landing page or redirect URL.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const redirectUrl = searchParams.get("redirect") || "/";

  const response = NextResponse.redirect(new URL(redirectUrl, req.url));
  return clearSessionCookie(response);
}
