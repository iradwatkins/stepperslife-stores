/**
 * Centralized Application Configuration
 *
 * Single source of truth for:
 * - Domain configuration
 * - Base URL construction
 * - Environment detection
 *
 * This eliminates hardcoded domain strings across the codebase.
 */

import { NextRequest } from "next/server";

/**
 * Application domain configuration
 *
 * These values should be set via environment variables in production.
 * Defaults are provided for development.
 */
export const APP_CONFIG = {
  /**
   * Primary application domain (without protocol)
   */
  DOMAIN:
    process.env.NEXT_PUBLIC_APP_DOMAIN || "stepperslife.com",

  /**
   * Cookie domain (includes subdomain wildcard)
   */
  COOKIE_DOMAIN:
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN || ".stepperslife.com",

  /**
   * Protocol (http in dev, https in production)
   */
  PROTOCOL: process.env.NODE_ENV === "production" ? "https" : "http",

  /**
   * Environment
   */
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
} as const;

/**
 * Get the full base URL for the application
 *
 * In production behind a reverse proxy (like Nginx), this respects
 * X-Forwarded-Proto and X-Forwarded-Host headers.
 *
 * @param request - Optional NextRequest to detect forwarded headers
 * @returns Full base URL with protocol (e.g., "https://events.stepperslife.com")
 */
export function getBaseUrl(request?: NextRequest): string {
  if (request) {
    // Check for forwarded headers (production behind Nginx/proxy)
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      APP_CONFIG.DOMAIN;
    return `${protocol}://${host}`;
  }

  // Fallback to environment-based URL
  return `${APP_CONFIG.PROTOCOL}://${APP_CONFIG.DOMAIN}`;
}

/**
 * Check if request is from localhost
 *
 * @param request - NextRequest to check
 * @returns True if request is from localhost, false otherwise
 */
export function isLocalhost(request: NextRequest): boolean {
  const host = request.headers.get("host");
  return host?.includes("localhost") ?? false;
}

/**
 * Get appropriate cookie domain based on environment
 *
 * Returns undefined for localhost (cookies work on exact domain),
 * returns configured domain for production (enables subdomain sharing).
 *
 * @param request - NextRequest to check environment
 * @returns Cookie domain string or undefined for localhost
 */
export function getCookieDomain(request: NextRequest): string | undefined {
  return isLocalhost(request) ? undefined : APP_CONFIG.COOKIE_DOMAIN;
}

/**
 * Get the protocol for the current environment
 *
 * Respects X-Forwarded-Proto header in production behind proxies.
 *
 * @param request - Optional NextRequest to check forwarded protocol
 * @returns "http" or "https"
 */
export function getProtocol(request?: NextRequest): "http" | "https" {
  if (request) {
    const forwarded = request.headers.get("x-forwarded-proto");
    if (forwarded === "http" || forwarded === "https") {
      return forwarded;
    }
  }
  return APP_CONFIG.PROTOCOL === "https" ? "https" : "http";
}
