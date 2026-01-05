import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { PRIMARY_ADMIN_EMAIL } from "./roles";

/**
 * Check if testing mode is enabled (only in development deployments)
 * Production deployment: expert-vulture-775
 * Development deployment: fearless-dragon-613
 */
export const isTestingModeAllowed = (): boolean => {
  const convexUrl = process.env.CONVEX_CLOUD_URL || "";
  // Only allow testing mode on development deployments, NOT production
  const isProduction = convexUrl.includes("expert-vulture-775");
  return !isProduction;
};

/**
 * Get the current authenticated user from the context.
 * Throws an error if user is not authenticated or not found in database.
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  // PRODUCTION: Require authentication - no testing mode bypass
  if (!identity) {
    throw new Error("Not authenticated - please sign in");
  }

  // Extract email from identity
  // Convex auth identity can have different structures depending on the provider
  // The email is passed as a custom claim in the JWT
  let email: string | undefined = undefined;

  // Try direct email field first
  if (identity.email && typeof identity.email === "string") {
    email = identity.email;
  }

  // Try extracting from tokenIdentifier (format: "provider|userId|email" or similar)
  if (!email && identity.tokenIdentifier) {
    const tokenParts = identity.tokenIdentifier.split("|");
    // Try last part first (often the email)
    const lastPart = tokenParts[tokenParts.length - 1];
    if (lastPart && lastPart.includes("@")) {
      email = lastPart;
    }
  }

  // Try subject claim which might contain email
  if (!email && identity.subject) {
    const subject = identity.subject;
    if (subject.includes("@")) {
      const emailMatch = subject.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        email = emailMatch[0];
      }
    }
  }

  if (!email) {
    throw new Error("No email found in authentication token - please sign in again");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email as string))
    .first();

  if (!user) {
    throw new Error("User not found in database - please sign in again");
  }

  return user;
}

/**
 * Verify that the current user owns the specified event or is an admin.
 * Throws an error if not authorized.
 * Returns both the user and event for convenience.
 */
export async function requireEventOwnership(ctx: QueryCtx | MutationCtx, eventId: Id<"events">) {
  const user = await getCurrentUser(ctx);
  const event = await ctx.db.get(eventId);

  if (!event) {
    throw new Error("Event not found");
  }

  // Admins can access any event
  if (user.role === "admin") {
    return { user, event };
  }

  // Organizers can only access their own events
  if (event.organizerId !== user._id) {
    throw new Error("Not authorized to access this event");
  }

  return { user, event };
}

/**
 * Verify that the current user is an admin.
 * Throws an error if not an admin.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);

  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}

/**
 * Check if the current user can access an event.
 * Returns true if user is admin or event organizer, false otherwise.
 */
export async function canAccessEvent(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">
): Promise<boolean> {
  try {
    await requireEventOwnership(ctx, eventId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current authenticated user from the context, or null if not authenticated.
 * Does NOT throw an error if user is not authenticated.
 */
export async function getCurrentUserOrNull(ctx: QueryCtx | MutationCtx) {
  try {
    return await getCurrentUser(ctx);
  } catch {
    return null;
  }
}
