/**
 * Google OAuth Helper Library
 *
 * Handles Google OAuth 2.0 authentication flow
 * Uses stateless OAuth with encrypted state to avoid cookie issues.
 */

import { randomBytes, createCipheriv, createDecipheriv, createHash } from "crypto";

const GOOGLE_CLIENT_ID = process.env.AUTH_GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.AUTH_GOOGLE_CLIENT_SECRET!;

// Use the client secret as the encryption key (hashed to get correct length)
// This ensures the same key across all serverless function instances
function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_GOOGLE_CLIENT_SECRET || "fallback-secret-key";
  return createHash("sha256").update(secret).digest();
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export interface OAuthStateData {
  callbackUrl: string;
  nonce: string;
  timestamp: number;
}

/**
 * Encrypt OAuth state data into a URL-safe string
 * Uses AES-256-GCM for authenticated encryption
 */
export function encryptOAuthState(data: OAuthStateData): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine: iv + authTag + encrypted data
  const combined = Buffer.concat([iv, authTag, encrypted]);

  // Return as URL-safe base64
  return combined.toString("base64url");
}

/**
 * Decrypt OAuth state data from the encrypted string
 * Returns null if decryption fails or state is expired
 */
export function decryptOAuthState(encryptedState: string): OAuthStateData | null {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedState, "base64url");

    // Extract parts
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const data: OAuthStateData = JSON.parse(decrypted.toString("utf8"));

    // Check if state is expired
    if (Date.now() - data.timestamp > STATE_EXPIRY_MS) {
      console.error("[Google OAuth] State expired");
      return null;
    }

    return data;
  } catch (error) {
    console.error("[Google OAuth] Failed to decrypt state:", error);
    return null;
  }
}

/**
 * Get the OAuth redirect URI based on environment
 *
 * Priority:
 * 1. NEXTAUTH_URL environment variable (if set)
 * 2. VERCEL_URL (automatically set by Vercel in production/preview)
 * 3. Production domain (stepperslife.com) if NODE_ENV is production
 * 4. localhost:3004 for local development
 */
function getRedirectUri(): string {
  let uri: string;

  // Check NEXTAUTH_URL first (explicit configuration)
  if (process.env.NEXTAUTH_URL) {
    uri = `${process.env.NEXTAUTH_URL}/api/auth/callback/google`;
  }
  // Check VERCEL_URL (automatically set by Vercel)
  else if (process.env.VERCEL_URL) {
    uri = `https://${process.env.VERCEL_URL}/api/auth/callback/google`;
  }
  // Production fallback to main domain
  else if (process.env.NODE_ENV === "production") {
    uri = "https://stepperslife.com/api/auth/callback/google";
  }
  // Local development fallback
  else {
    uri = "http://localhost:3004/api/auth/callback/google";
  }

  return uri;
}

const REDIRECT_URI = getRedirectUri();


/**
 * Generate OAuth authorization URL
 * User will be redirected here to sign in with Google
 */
export function getGoogleAuthUrl(state?: string): string {
  const stateParam = state || randomBytes(32).toString("hex");

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state: stateParam,
    access_type: "offline",
    prompt: "consent",
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return url;
}

/**
 * Exchange authorization code for access token and user info
 */
export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Google OAuth] Token exchange FAILED:");
    console.error("[Google OAuth]   Status:", response.status);
    console.error("[Google OAuth]   Error:", error);
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Get user info from Google using access token
 */
export async function getGoogleUserInfo(accessToken: string): Promise<{
  id: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get user info from Google");
  }

  const data = await response.json();
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
    emailVerified: data.verified_email,
  };
}

/**
 * Complete OAuth flow: exchange code and get user info
 */
export async function completeGoogleOAuth(code: string) {
  const { accessToken } = await exchangeCodeForToken(code);
  const userInfo = await getGoogleUserInfo(accessToken);
  return userInfo;
}
// Force deploy 1764688721
// Deploy trigger: 1733154433
