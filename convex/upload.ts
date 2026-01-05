import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Self-hosted Convex backend URL.
 * IMPORTANT: This is hardcoded because Convex functions run in an isolated runtime
 * where Next.js environment variables are NOT available.
 * For self-hosted Convex at Toolbox Hosting, this is always the same URL.
 */
const CONVEX_BACKEND_URL = "https://convex.toolboxhosting.com";

/**
 * Helper to resolve storage URLs to full absolute URLs.
 * Self-hosted Convex returns relative paths like /api/storage/...
 * This ensures we always return a full URL that browsers can access.
 */
function resolveStorageUrl(url: string | null): string | null {
  if (!url) return null;

  // If it's already an absolute URL (http:// or https://), return as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // If it's a relative storage path, prepend the Convex backend URL
  if (url.startsWith("/api/storage/")) {
    return `${CONVEX_BACKEND_URL}${url}`;
  }

  // For other relative paths (shouldn't happen), prepend anyway
  if (url.startsWith("/")) {
    return `${CONVEX_BACKEND_URL}${url}`;
  }

  // For any other format, return as-is
  return url;
}

/**
 * Generate an upload URL for file uploads (images, etc.)
 */
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

/**
 * Get a public URL for a stored file
 */
export const getImageUrl = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    return resolveStorageUrl(url);
  },
});

/**
 * Get a public URL for a stored file (query version)
 */
export const getImageUrlQuery = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    return resolveStorageUrl(url);
  },
});
