"use client";

import { BadgeCheck, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export type VendorTier = "BASIC" | "VERIFIED" | "PREMIUM";

interface VendorTierBadgeProps {
  tier: VendorTier | string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const TIER_CONFIG: Record<
  VendorTier,
  {
    icon: typeof BadgeCheck | typeof Crown | null;
    label: string;
    tooltip: string;
    className: string;
    bgClassName: string;
  }
> = {
  BASIC: {
    icon: null,
    label: "",
    tooltip: "",
    className: "",
    bgClassName: "",
  },
  VERIFIED: {
    icon: BadgeCheck,
    label: "Verified",
    tooltip: "Verified seller with priority support",
    className: "text-primary",
    bgClassName: "bg-info/10 dark:bg-primary/20",
  },
  PREMIUM: {
    icon: Crown,
    label: "Premium",
    tooltip: "Featured seller with lowest fees",
    className: "text-warning",
    bgClassName: "bg-warning/10 dark:bg-warning/20",
  },
};

const SIZE_CLASSES = {
  sm: {
    icon: "w-4 h-4",
    text: "text-xs",
    padding: "px-1.5 py-0.5",
  },
  md: {
    icon: "w-5 h-5",
    text: "text-sm",
    padding: "px-2 py-1",
  },
  lg: {
    icon: "w-6 h-6",
    text: "text-base",
    padding: "px-2.5 py-1.5",
  },
};

export function VendorTierBadge({
  tier,
  size = "md",
  showLabel = false,
  className,
}: VendorTierBadgeProps) {
  // Handle invalid or missing tier
  const validTier = (tier === "VERIFIED" || tier === "PREMIUM" ? tier : "BASIC") as VendorTier;
  const config = TIER_CONFIG[validTier];

  // Don't render anything for BASIC tier
  if (!config.icon) return null;

  const Icon = config.icon;
  const sizeConfig = SIZE_CLASSES[size];

  if (showLabel) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-medium cursor-help",
          config.className,
          config.bgClassName,
          sizeConfig.padding,
          sizeConfig.text,
          className
        )}
        title={config.tooltip}
      >
        <Icon className={sizeConfig.icon} />
        <span>{config.label}</span>
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center cursor-help", config.className, className)}
      title={config.tooltip}
    >
      <Icon className={sizeConfig.icon} />
    </span>
  );
}

// Export tier utilities for use in other components
export function getTierDisplayName(tier: VendorTier | string): string {
  switch (tier) {
    case "PREMIUM":
      return "Premium Vendor";
    case "VERIFIED":
      return "Verified Vendor";
    default:
      return "Basic Vendor";
  }
}

export function getTierDescription(tier: VendorTier | string): string {
  switch (tier) {
    case "PREMIUM":
      return "Featured seller with lowest fees (5% commission)";
    case "VERIFIED":
      return "Verified seller with priority support (10% commission)";
    default:
      return "Standard marketplace seller (15% commission)";
  }
}

export function getTierCommission(tier: VendorTier | string): number {
  switch (tier) {
    case "PREMIUM":
      return 5;
    case "VERIFIED":
      return 10;
    default:
      return 15;
  }
}
