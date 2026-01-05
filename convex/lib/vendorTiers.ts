/**
 * Vendor Tier Configuration
 *
 * This file defines vendor tiers, commission rates, and benefits for marketplace vendors.
 * Using constants prevents typos and makes tier management more maintainable.
 *
 * @module vendorTiers
 */

/**
 * Vendor tier levels
 *
 * BASIC: Standard marketplace seller (default for new vendors)
 * VERIFIED: Verified seller with priority support
 * PREMIUM: Featured seller with lowest fees and maximum visibility
 */
export const VENDOR_TIERS = {
  /** Standard marketplace seller - 15% commission */
  BASIC: "BASIC",
  /** Verified seller with priority support - 10% commission */
  VERIFIED: "VERIFIED",
  /** Featured seller with lowest fees - 5% commission */
  PREMIUM: "PREMIUM",
} as const;

/** Vendor tier type */
export type VendorTier = (typeof VENDOR_TIERS)[keyof typeof VENDOR_TIERS];

/**
 * Commission rates by tier (percentage taken by platform)
 * Lower tier = higher commission for platform
 */
export const TIER_COMMISSION_RATES: Record<VendorTier, number> = {
  BASIC: 15, // 15% platform fee
  VERIFIED: 10, // 10% platform fee
  PREMIUM: 5, // 5% platform fee
};

/**
 * Default tier for new vendors
 */
export const DEFAULT_VENDOR_TIER: VendorTier = VENDOR_TIERS.BASIC;

/**
 * Default commission rate (for backwards compatibility)
 */
export const DEFAULT_COMMISSION_PERCENT = TIER_COMMISSION_RATES.BASIC;

/**
 * Tier benefits configuration
 */
export const TIER_BENEFITS: Record<
  VendorTier,
  {
    verificationBadge: boolean;
    featuredPlacement: boolean;
    prioritySupport: boolean;
    commissionRate: number;
    displayName: string;
    description: string;
    badgeColor: string;
  }
> = {
  BASIC: {
    verificationBadge: false,
    featuredPlacement: false,
    prioritySupport: false,
    commissionRate: 15,
    displayName: "Basic Vendor",
    description: "Standard marketplace seller",
    badgeColor: "gray",
  },
  VERIFIED: {
    verificationBadge: true,
    featuredPlacement: false,
    prioritySupport: true,
    commissionRate: 10,
    displayName: "Verified Vendor",
    description: "Verified seller with priority support",
    badgeColor: "blue",
  },
  PREMIUM: {
    verificationBadge: true,
    featuredPlacement: true,
    prioritySupport: true,
    commissionRate: 5,
    displayName: "Premium Vendor",
    description: "Featured seller with lowest fees",
    badgeColor: "gold",
  },
};

/**
 * Tier sort order (for featured placement)
 * Lower number = higher priority in listings
 */
export const TIER_SORT_ORDER: Record<VendorTier, number> = {
  PREMIUM: 0,
  VERIFIED: 1,
  BASIC: 2,
};

/**
 * Get commission rate for a tier
 */
export function getTierCommissionRate(tier: VendorTier): number {
  return TIER_COMMISSION_RATES[tier] ?? TIER_COMMISSION_RATES.BASIC;
}

/**
 * Get tier benefits
 */
export function getTierBenefits(tier: VendorTier) {
  return TIER_BENEFITS[tier] ?? TIER_BENEFITS.BASIC;
}

/**
 * Check if tier has verification badge
 */
export function hasBadge(tier: VendorTier): boolean {
  return TIER_BENEFITS[tier]?.verificationBadge ?? false;
}

/**
 * Check if tier has featured placement
 */
export function hasFeaturedPlacement(tier: VendorTier): boolean {
  return TIER_BENEFITS[tier]?.featuredPlacement ?? false;
}

/**
 * Type guard to check if a value is a valid vendor tier
 */
export function isVendorTier(value: unknown): value is VendorTier {
  return Object.values(VENDOR_TIERS).includes(value as VendorTier);
}

/**
 * Get human-readable tier name
 */
export function getTierName(tier: VendorTier): string {
  return TIER_BENEFITS[tier]?.displayName ?? "Unknown Tier";
}

/**
 * Get tier description
 */
export function getTierDescription(tier: VendorTier): string {
  return TIER_BENEFITS[tier]?.description ?? "Unknown tier";
}
