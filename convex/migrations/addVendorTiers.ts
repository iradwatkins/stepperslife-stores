import { mutation } from "../_generated/server";
import { TIER_COMMISSION_RATES, type VendorTier } from "../lib/vendorTiers";

/**
 * Migration: Add Vendor Tiers
 *
 * This one-time migration assigns tiers to existing vendors based on their
 * current commission rate:
 * - commission <= 5%  → PREMIUM
 * - commission <= 10% → VERIFIED
 * - otherwise         → BASIC
 *
 * Run this migration once after deploying the vendor tier feature.
 * Command: npx convex run migrations/addVendorTiers:migrateVendorTiers
 */
export const migrateVendorTiers = mutation({
  args: {},
  handler: async (ctx) => {
    const vendors = await ctx.db.query("vendors").collect();
    let updated = 0;
    let skipped = 0;

    for (const vendor of vendors) {
      // Skip if vendor already has a tier assigned
      if (vendor.tier) {
        skipped++;
        continue;
      }

      // Determine tier based on current commission rate
      let tier: VendorTier = "BASIC";
      const commission = vendor.commissionPercent ?? 15;

      if (commission <= TIER_COMMISSION_RATES.PREMIUM) {
        tier = "PREMIUM";
      } else if (commission <= TIER_COMMISSION_RATES.VERIFIED) {
        tier = "VERIFIED";
      }

      // Update vendor with tier
      await ctx.db.patch(vendor._id, {
        tier,
        updatedAt: Date.now(),
      });
      updated++;
    }

    return {
      message: `Migration completed: ${updated} vendors updated, ${skipped} skipped (already had tier)`,
      updated,
      skipped,
      total: vendors.length,
    };
  },
});

/**
 * Check migration status
 *
 * Use this to see how many vendors have tiers assigned vs missing.
 * Command: npx convex run migrations/addVendorTiers:checkMigrationStatus
 */
export const checkMigrationStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const vendors = await ctx.db.query("vendors").collect();

    const withTier = vendors.filter((v) => v.tier).length;
    const withoutTier = vendors.filter((v) => !v.tier).length;

    const tierCounts = {
      BASIC: vendors.filter((v) => v.tier === "BASIC").length,
      VERIFIED: vendors.filter((v) => v.tier === "VERIFIED").length,
      PREMIUM: vendors.filter((v) => v.tier === "PREMIUM").length,
      NONE: withoutTier,
    };

    return {
      total: vendors.length,
      withTier,
      withoutTier,
      tierCounts,
      migrationNeeded: withoutTier > 0,
    };
  },
});
