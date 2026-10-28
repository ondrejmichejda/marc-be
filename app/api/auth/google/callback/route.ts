import { NextRequest, NextResponse } from "next/server";
import {
  exchangeAuthorizationCode,
  fetchGoogleUserProfile,
  verifyGoogleIdToken,
  UserService,
  attachSessionCookie,
} from "@/lib/auth";

const STATE_COOKIE_NAME = "marc_oauth_state";

/**
 * GET /api/auth/google/callback
 * Handles the OAuth 2.0 callback redirect from Google, exchanges authorization code,
 * loads Google user profile, authenticates or registers the user, and sets session cookie.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Read saved state cookie
  let savedReturnTo = "/";
  let savedState: string | null = null;

  const stateCookie = req.cookies.get(STATE_COOKIE_NAME);
  if (stateCookie?.value) {
    try {
      const parsed = JSON.parse(stateCookie.value);
      savedState = parsed.state;
      savedReturnTo = parsed.returnTo || "/";
    } catch {
      savedState = stateCookie.value;
    }
  }

  // Handle Google OAuth errors (e.g. user cancelled)
  if (error) {
    console.warn("[Google Auth Callback] Error returned from Google:", error, errorDescription);
    const redirectUrl = new URL(savedReturnTo, req.url);
    redirectUrl.searchParams.set("auth_error", error);
    if (errorDescription) {
      redirectUrl.searchParams.set("error_description", errorDescription);
    }
    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete(STATE_COOKIE_NAME);
    return response;
  }

  if (!code) {
    const redirectUrl = new URL(savedReturnTo, req.url);
    redirectUrl.searchParams.set("auth_error", "missing_code");
    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete(STATE_COOKIE_NAME);
    return response;
  }

  // Validate state parameter if state cookie existed
  if (savedState && state && savedState !== state) {
    console.warn("[Google Auth Callback] State mismatch error");
    const redirectUrl = new URL(savedReturnTo, req.url);
    redirectUrl.searchParams.set("auth_error", "state_mismatch");
    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete(STATE_COOKIE_NAME);
    return response;
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenData = await exchangeAuthorizationCode(code, req);

    // 2. Fetch user profile from Google
    let profile;
    if (tokenData.accessToken) {
      try {
        profile = await fetchGoogleUserProfile(tokenData.accessToken);
      } catch (err) {
        if (tokenData.idToken) {
          profile = await verifyGoogleIdToken(tokenData.idToken);
        } else {
          throw err;
        }
      }
    } else if (tokenData.idToken) {
      profile = await verifyGoogleIdToken(tokenData.idToken);
    } else {
      throw new Error("No access token or ID token received from Google");
    }

    // 3. Register or Login user in DB / Local Storage
    const { user, token, isNewUser } = await UserService.registerOrLoginGoogleUser(profile);

    // 4. Redirect with session cookie
    const redirectUrl = new URL(savedReturnTo, req.url);
    redirectUrl.searchParams.set("auth", "success");
    redirectUrl.searchParams.set("registered", isNewUser ? "true" : "false");
    redirectUrl.searchParams.set("email", user.email);

    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete(STATE_COOKIE_NAME);

    return attachSessionCookie(response, token, req);
  } catch (err) {
    console.error("[Google Auth Callback] Authentication failed:", err);
    const redirectUrl = new URL(savedReturnTo, req.url);
    redirectUrl.searchParams.set("auth_error", "auth_failed");
    redirectUrl.searchParams.set("error_message", (err as Error).message);

    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete(STATE_COOKIE_NAME);
    return response;
  }
}
