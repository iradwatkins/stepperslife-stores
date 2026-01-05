/**
 * Restaurant Subscription Plans Configuration
 *
 * Defines the available plans for restaurant partners with their
 * features, limits, and pricing.
 */

export const RESTAURANT_PLAN_TIERS = {
  STARTER: "STARTER",
  GROWTH: "GROWTH",
  PROFESSIONAL: "PROFESSIONAL",
} as const;

export type RestaurantPlanTier = typeof RESTAURANT_PLAN_TIERS[keyof typeof RESTAURANT_PLAN_TIERS];

export interface RestaurantPlan {
  tier: RestaurantPlanTier;
  name: string;
  description: string;
  priceMonthly: number; // in cents, 0 = free
  priceAnnual: number; // in cents, 0 = free
  transactionFeePercent: number; // e.g., 10 = 10%
  features: {
    menuItemLimit: number; // -1 = unlimited
    categoryLimit: number; // -1 = unlimited
    staffLimit: number; // -1 = unlimited
    hasAdvancedAnalytics: boolean;
    hasCustomBranding: boolean;
    hasPromotionalTools: boolean;
    hasPrioritySupport: boolean;
    hasApiAccess: boolean;
    hasMultiLocation: boolean;
  };
  featuresList: string[]; // For display on pricing page
}

export const RESTAURANT_PLANS: Record<RestaurantPlanTier, RestaurantPlan> = {
  STARTER: {
    tier: "STARTER",
    name: "Starter",
    description: "Perfect for getting started with online ordering",
    priceMonthly: 0,
    priceAnnual: 0,
    transactionFeePercent: 10,
    features: {
      menuItemLimit: 10,
      categoryLimit: 3,
      staffLimit: 2,
      hasAdvancedAnalytics: false,
      hasCustomBranding: false,
      hasPromotionalTools: false,
      hasPrioritySupport: false,
      hasApiAccess: false,
      hasMultiLocation: false,
    },
    featuresList: [
      "Up to 10 menu listings",
      "Up to 3 menu categories",
      "Basic order management",
      "Basic analytics dashboard",
      "Email order notifications",
      "Standard customer support",
      "Mobile-friendly menu page",
    ],
  },
  GROWTH: {
    tier: "GROWTH",
    name: "Growth",
    description: "For growing restaurants ready to scale",
    priceMonthly: 1900, // $19
    priceAnnual: 18240, // $19 * 12 * 0.8 = $152/year (~$12.67/mo)
    transactionFeePercent: 6,
    features: {
      menuItemLimit: 100,
      categoryLimit: 20,
      staffLimit: 10,
      hasAdvancedAnalytics: true,
      hasCustomBranding: false,
      hasPromotionalTools: true,
      hasPrioritySupport: true,
      hasApiAccess: false,
      hasMultiLocation: false,
    },
    featuresList: [
      "Up to 100 menu listings",
      "Up to 20 menu categories",
      "Advanced analytics & reports",
      "Customer reviews & ratings",
      "Menu categories & organization",
      "Custom pickup time slots",
      "Priority email support",
      "Order history & insights",
      "Promotional tools",
    ],
  },
  PROFESSIONAL: {
    tier: "PROFESSIONAL",
    name: "Professional",
    description: "For established restaurants with high volume",
    priceMonthly: 4900, // $49
    priceAnnual: 47040, // $49 * 12 * 0.8 = $392/year (~$32.67/mo)
    transactionFeePercent: 4,
    features: {
      menuItemLimit: -1, // unlimited
      categoryLimit: -1, // unlimited
      staffLimit: -1, // unlimited
      hasAdvancedAnalytics: true,
      hasCustomBranding: true,
      hasPromotionalTools: true,
      hasPrioritySupport: true,
      hasApiAccess: true,
      hasMultiLocation: true,
    },
    featuresList: [
      "Unlimited menu listings",
      "Unlimited menu categories",
      "Real-time analytics dashboard",
      "Priority customer support",
      "Custom branding options",
      "Advanced promotional tools",
      "Multi-location support",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
      "Early access to new features",
    ],
  },
};

/**
 * Get plan by tier
 */
export function getRestaurantPlan(tier: RestaurantPlanTier): RestaurantPlan {
  return RESTAURANT_PLANS[tier];
}

/**
 * Check if a restaurant can add more menu items based on their plan
 */
export function canAddMenuItem(
  planTier: RestaurantPlanTier,
  currentItemCount: number
): { allowed: boolean; limit: number; message?: string } {
  const plan = RESTAURANT_PLANS[planTier];
  const limit = plan.features.menuItemLimit;

  if (limit === -1) {
    return { allowed: true, limit: -1 };
  }

  if (currentItemCount >= limit) {
    return {
      allowed: false,
      limit,
      message: `You've reached the ${limit} menu item limit for the ${plan.name} plan. Upgrade to add more items.`,
    };
  }

  return { allowed: true, limit };
}

/**
 * Check if a restaurant can add more categories based on their plan
 */
export function canAddCategory(
  planTier: RestaurantPlanTier,
  currentCategoryCount: number
): { allowed: boolean; limit: number; message?: string } {
  const plan = RESTAURANT_PLANS[planTier];
  const limit = plan.features.categoryLimit;

  if (limit === -1) {
    return { allowed: true, limit: -1 };
  }

  if (currentCategoryCount >= limit) {
    return {
      allowed: false,
      limit,
      message: `You've reached the ${limit} category limit for the ${plan.name} plan. Upgrade to add more categories.`,
    };
  }

  return { allowed: true, limit };
}

/**
 * Get the default plan tier for new restaurants
 */
export function getDefaultPlanTier(): RestaurantPlanTier {
  return "STARTER";
}
