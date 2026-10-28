import { getGoogleAuthConfig } from "./config";
import { GoogleProfile } from "./types";
import { generateRandomState } from "./crypto";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";

export interface GoogleAuthUrlOptions {
  req?: Request;
  state?: string;
  returnTo?: string;
  prompt?: "consent" | "select_account" | "none";
}

/**
 * Builds the Google OAuth 2.0 authorization URL for signing in / registering with Gmail.
 */
export function getGoogleAuthorizationUrl(options: GoogleAuthUrlOptions = {}): {
  url: string;
  state: string;
} {
  const config = getGoogleAuthConfig(options.req);
  const state = options.state || generateRandomState(16);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: options.prompt || "select_account",
    state: state,
  });

  return {
    url: `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`,
    state,
  };
}

/**
 * Exchanges an OAuth 2.0 authorization code for access and ID tokens from Google.
 */
export async function exchangeAuthorizationCode(
  code: string,
  req?: Request
): Promise<{
  accessToken: string;
  idToken?: string;
  expiresIn?: number;
  scope?: string;
  tokenType?: string;
}> {
  const config = getGoogleAuthConfig(req);

  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorDetail = errorText;
    try {
      const parsed = JSON.parse(errorText);
      errorDetail = parsed.error_description || parsed.error || errorText;
    } catch {
      // ignore
    }
    throw new Error(`Google token exchange failed (${response.status}): ${errorDetail}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    tokenType: data.token_type,
  };
}

/**
 * Fetches the user profile from Google's UserInfo API using an access token.
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Google user profile (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.id && !data.sub) {
    throw new Error("Invalid Google profile response: missing user ID");
  }

  if (!data.email) {
    throw new Error("Invalid Google profile response: missing email address");
  }

  return {
    id: data.id || data.sub,
    email: data.email,
    emailVerified: Boolean(data.verified_email ?? data.email_verified),
    name: data.name || data.email.split("@")[0],
    givenName: data.given_name,
    familyName: data.family_name,
    picture: data.picture,
    locale: data.locale,
  };
}

/**
 * Verifies a Google ID Token (JWT) directly via Google's tokeninfo API.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const url = `${GOOGLE_TOKENINFO_ENDPOINT}?id_token=${encodeURIComponent(idToken)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google ID token verification failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.sub) {
    throw new Error("Invalid tokeninfo response: missing sub field");
  }

  if (!data.email) {
    throw new Error("Invalid tokeninfo response: missing email field");
  }

  return {
    id: data.sub,
    email: data.email,
    emailVerified: data.email_verified === "true" || data.email_verified === true,
    name: data.name || data.email.split("@")[0],
    givenName: data.given_name,
    familyName: data.family_name,
    picture: data.picture,
    locale: data.locale,
  };
}
