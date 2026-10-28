import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthConfig, AUTH_COOKIE_NAME } from "./config";
import { verifySessionToken } from "./crypto";
import { UserService } from "./userService";
import { User, AuthSessionPayload } from "./types";

/**
 * Extracts session token from headers/cookies of a Request, NextRequest, or next/headers cookies.
 */
export async function getSessionToken(req?: Request | NextRequest): Promise<string | null> {
  // 1. Check Authorization Bearer header
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      return authHeader.substring(7).trim();
    }
  }

  // 2. Check NextRequest cookies
  if (req && "cookies" in req && typeof req.cookies?.get === "function") {
    const cookie = req.cookies.get(AUTH_COOKIE_NAME);
    if (cookie?.value) {
      return cookie.value;
    }
  }

  // 3. Check raw Cookie header on Request
  if (req) {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
      if (match) {
        return decodeURIComponent(match.split("=")[1]);
      }
    }
  }

  // 4. Try next/headers cookies() for Server Components
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (cookie?.value) {
      return cookie.value;
    }
  } catch {
    // Outside request context / not in Server Component
  }

  return null;
}

/**
 * Verifies the session token and returns the payload if valid.
 */
export function verifySession(token: string): AuthSessionPayload | null {
  const config = getGoogleAuthConfig();
  return verifySessionToken(token, config.authSecret);
}

/**
 * Retrieves the currently authenticated user from the session cookie or token.
 */
export async function getCurrentUser(req?: Request | NextRequest): Promise<User | null> {
  const token = await getSessionToken(req);
  if (!token) {
    return null;
  }

  const payload = verifySession(token);
  if (!payload || !payload.userId) {
    return null;
  }

  return await UserService.getUserById(payload.userId);
}

/**
 * Attaches the auth session cookie to a NextResponse.
 */
export function attachSessionCookie(
  response: NextResponse,
  token: string,
  req?: Request
): NextResponse {
  const config = getGoogleAuthConfig(req);
  const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: config.cookieName,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: config.cookieMaxAgeSeconds,
  });

  return response;
}

/**
 * Clears the auth session cookie from a NextResponse.
 */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
