import { NextRequest, NextResponse } from "next/server";
import {
  getGoogleAuthorizationUrl,
  isGoogleAuthConfigured,
  fetchGoogleUserProfile,
  verifyGoogleIdToken,
  UserService,
  attachSessionCookie,
} from "@/lib/auth";

const STATE_COOKIE_NAME = "marc_oauth_state";

/**
 * GET /api/auth/google
 * Initiates Google OAuth 2.0 flow by redirecting to Google's consent screen or returning the URL.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const json = searchParams.get("json") === "true";
  const returnTo = searchParams.get("returnTo") || "/";
  const prompt = (searchParams.get("prompt") as "consent" | "select_account" | "none") || "select_account";

  if (!isGoogleAuthConfigured()) {
    return NextResponse.json(
      {
        error: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.",
        configured: false,
      },
      { status: 500 }
    );
  }

  const { url, state } = getGoogleAuthorizationUrl({
    req,
    prompt,
  });

  if (json) {
    const res = NextResponse.json({ url, state, configured: true });
    res.cookies.set({
      name: STATE_COOKIE_NAME,
      value: JSON.stringify({ state, returnTo }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });
    return res;
  }

  const res = NextResponse.redirect(url);
  res.cookies.set({
    name: STATE_COOKIE_NAME,
    value: JSON.stringify({ state, returnTo }),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return res;
}

/**
 * POST /api/auth/google
 * Directly verifies a Google ID Token or Access Token (e.g. from Google One-Tap or Google Sign-In button)
 * and logs in or registers the user.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credential, id_token, access_token } = body;

    const tokenToVerify = credential || id_token;

    let profile;
    if (tokenToVerify) {
      profile = await verifyGoogleIdToken(tokenToVerify);
    } else if (access_token) {
      profile = await fetchGoogleUserProfile(access_token);
    } else {
      return NextResponse.json(
        { error: "Missing 'credential', 'id_token', or 'access_token' in request body" },
        { status: 400 }
      );
    }

    const { user, token, isNewUser } = await UserService.registerOrLoginGoogleUser(profile);

    const res = NextResponse.json({
      success: true,
      user,
      token,
      isNewUser,
      message: isNewUser
        ? "User successfully registered with Google / Gmail"
        : "User successfully authenticated with Google / Gmail",
    });

    return attachSessionCookie(res, token, req);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
