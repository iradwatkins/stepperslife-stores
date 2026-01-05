/**
 * JWKS (JSON Web Key Set) utilities for RS256 token signing
 *
 * This module handles RSA keypair management for Convex authentication.
 * Uses RS256 (RSA + SHA-256) for asymmetric signing which allows Convex
 * to verify tokens using the public key from our JWKS endpoint.
 */

import { generateKeyPairSync, createPrivateKey, createPublicKey, KeyObject } from "crypto";
import { exportJWK, importPKCS8, importSPKI, type JWK } from "jose";

// The key ID for our RSA key
const KEY_ID = "stepperslife-auth-key-1";

// Cache the keys in memory to avoid regenerating on every request
let cachedPrivateKey: KeyObject | null = null;
let cachedPublicKey: KeyObject | null = null;
let cachedJwks: { keys: JWK[] } | null = null;

/**
 * Get or generate RSA keypair from environment variable
 *
 * The private key should be stored in JWT_PRIVATE_KEY environment variable
 * as a base64-encoded PEM string. If not present, falls back to deriving
 * a deterministic key from JWT_SECRET for backwards compatibility.
 */
function getKeyPair(): { privateKey: KeyObject; publicKey: KeyObject } {
  if (cachedPrivateKey && cachedPublicKey) {
    return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey };
  }

  const privateKeyPem = process.env.JWT_PRIVATE_KEY;
  const publicKeyPem = process.env.JWT_PUBLIC_KEY;

  if (privateKeyPem && publicKeyPem) {
    // Use provided keys
    const decodedPrivate = Buffer.from(privateKeyPem, "base64").toString("utf-8");
    const decodedPublic = Buffer.from(publicKeyPem, "base64").toString("utf-8");

    cachedPrivateKey = createPrivateKey(decodedPrivate);
    cachedPublicKey = createPublicKey(decodedPublic);
  } else {
    // Generate a deterministic keypair from JWT_SECRET for development
    // WARNING: In production, you should use proper RSA keys stored in environment
    console.warn(
      "[JWKS] No JWT_PRIVATE_KEY/JWT_PUBLIC_KEY found. " +
      "Generating ephemeral keypair. This should only happen in development."
    );

    // Generate a new keypair (this is ephemeral and will change on restart)
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    cachedPrivateKey = createPrivateKey(privateKey);
    cachedPublicKey = createPublicKey(publicKey);
  }

  return { privateKey: cachedPrivateKey, publicKey: cachedPublicKey };
}

/**
 * Get the private key for signing JWTs
 */
export async function getPrivateKey(): Promise<KeyObject> {
  const { privateKey } = getKeyPair();
  return privateKey;
}

/**
 * Get the public key for JWKS endpoint
 */
export async function getPublicKey(): Promise<KeyObject> {
  const { publicKey } = getKeyPair();
  return publicKey;
}

/**
 * Get the JWKS (JSON Web Key Set) containing our public key
 * This endpoint should be accessible at /.well-known/jwks.json
 */
export async function getJwks(): Promise<{ keys: JWK[] }> {
  if (cachedJwks) {
    return cachedJwks;
  }

  const publicKey = await getPublicKey();
  const jwk = await exportJWK(publicKey);

  // Add key metadata
  jwk.kid = KEY_ID;
  jwk.alg = "RS256";
  jwk.use = "sig";

  cachedJwks = { keys: [jwk] };
  return cachedJwks;
}

/**
 * Get the key ID to include in JWT headers
 */
export function getKeyId(): string {
  return KEY_ID;
}

/**
 * Clear cached keys (useful for testing or key rotation)
 */
export function clearKeyCache(): void {
  cachedPrivateKey = null;
  cachedPublicKey = null;
  cachedJwks = null;
}
