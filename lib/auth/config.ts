export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  appUrl: string;
  authSecret: string;
  cookieName: string;
  cookieMaxAgeSeconds: number;
}

export const AUTH_COOKIE_NAME = "marc_auth_session";
export const AUTH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export function isGoogleAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}

export function getAppBaseUrl(req?: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (req) {
    try {
      const url = new URL(req.url);
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
      const proto = req.headers.get("x-forwarded-proto") || (url.protocol.replace(":", "") || "http");
      return `${proto}://${host}`;
    } catch {
      // fallback
    }
  }
  return "http://localhost:3000";
}

export function getGoogleAuthConfig(req?: Request): GoogleAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const appUrl = getAppBaseUrl(req);
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/auth/google/callback`;
  const authSecret =
    process.env.AUTH_SECRET ||
    process.env.JWT_SECRET ||
    process.env.TELEGRAM_WEBHOOK_SECRET ||
    "marc-be-default-dev-secret-key-change-in-production";

  return {
    clientId,
    clientSecret,
    redirectUri,
    appUrl,
    authSecret,
    cookieName: AUTH_COOKIE_NAME,
    cookieMaxAgeSeconds: AUTH_COOKIE_MAX_AGE,
  };
}
