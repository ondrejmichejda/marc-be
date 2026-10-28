import crypto from "crypto";
import { AuthSessionPayload } from "./types";

function base64UrlEncode(str: string | Buffer): string {
  const buf = typeof str === "string" ? Buffer.from(str, "utf8") : str;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

/**
 * Creates a signed JWT session token.
 */
export function signSessionToken(
  payload: Omit<AuthSessionPayload, "iat" | "exp">,
  secret: string,
  expiresInSeconds: number = 30 * 24 * 60 * 60
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AuthSessionPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(dataToSign);
  const signature = base64UrlEncode(hmac.digest());

  return `${dataToSign}.${signature}`;
}

/**
 * Verifies and decodes a signed JWT session token.
 */
export function verifySessionToken(
  token: string,
  secret: string
): AuthSessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(dataToSign);
    const expectedSig = base64UrlEncode(hmac.digest());

    const sigBuf = Buffer.from(signature);
    const expectedSigBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expectedSigBuf.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
      return null;
    }

    const payload: AuthSessionPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generates a random cryptographic state string for OAuth CSRF protection.
 */
export function generateRandomState(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}
