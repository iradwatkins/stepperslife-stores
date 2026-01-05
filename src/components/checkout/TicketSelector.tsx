/**
 * Ticket Selector Component
 *
 * Displays available ticket tiers and bundles for selection
 * Features:
 * - Tier selection with early bird pricing indicators
 * - Bundle selection with savings display
 * - Stock warnings and countdown timers
 * - Quantity picker
 */

import { useState } from "react";
import { Ticket, Package, Zap, TrendingDown, Minus, Plus } from "lucide-react";
import { TierCountdown, TierAvailabilityBadge } from "@/components/events/TierCountdown";
import { format } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";

export interface TicketTier {
  _id: Id<"ticketTiers">;
  name: string;
  description?: string;
  price: number;
  currentPrice: number;
  quantity: number;
  sold: number;
  saleStart?: number;
  saleEnd?: number;
  isEarlyBird?: boolean;
  currentTierName?: string;
  nextPriceChange?: {
    price: number;
    date: number;
  };
}

export interface TicketBundle {
  _id: Id<"ticketBundles">;
  name: string;
  description?: string;
  price: number;
  regularPrice?: number;
  percentageSavings: number;
  available: number;
  includedTiers: Array<{
    tierId: Id<"ticketTiers">;
    tierName: string;
    quantity: number;
  }>;
}

export interface TicketSelectorProps {
  tiers: TicketTier[];
  bundles?: TicketBundle[];
  selectedTierId: Id<"ticketTiers"> | null;
  selectedBundleId: Id<"ticketBundles"> | null;
  purchaseType: "tier" | "bundle";
  quantity: number;
  onTierSelect: (tierId: Id<"ticketTiers">) => void;
  onBundleSelect: (bundleId: Id<"ticketBundles">) => void;
  onPurchaseTypeChange: (type: "tier" | "bundle") => void;
  onQuantityChange: (quantity: number) => void;
  maxQuantity?: number;
}

export function TicketSelector({
  tiers,
  bundles = [],
  selectedTierId,
  selectedBundleId,
  purchaseType,
  quantity,
  onTierSelect,
  onBundleSelect,
  onPurchaseTypeChange,
  onQuantityChange,
  maxQuantity = 10,
}: TicketSelectorProps) {
  const now = Date.now();

  // Filter available tiers
  const availableTiers = tiers.filter((tier) => {
    const isAvailable =
      (!tier.saleStart || now >= tier.saleStart) &&
      (!tier.saleEnd || now <= tier.saleEnd) &&
      tier.sold < tier.quantity;
    return isAvailable;
  });

  const hasBundles = bundles.length > 0;
  const hasSelection = selectedTierId || selectedBundleId;

  return (
    <div className="space-y-6">
      {/* Purchase Type Tabs (only if bundles exist) */}
      {hasBundles && (
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => onPurchaseTypeChange("tier")}
            className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
              purchaseType === "tier"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Ticket className="w-4 h-4" />
            Individual Tickets
          </button>
          <button
            type="button"
            onClick={() => onPurchaseTypeChange("bundle")}
            className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${
              purchaseType === "bundle"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="w-4 h-4" />
            Bundles
          </button>
        </div>
      )}

      {/* Tier Selection */}
      {purchaseType === "tier" && (
        <div className="space-y-3">
          {availableTiers.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">
                No tickets currently available
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back later or contact the organizer
              </p>
            </div>
          ) : (
            availableTiers.map((tier) => {
              const isSoldOut = tier.sold >= tier.quantity;
              const remaining = tier.quantity - tier.sold;
              const isLowStock = remaining <= 10 && remaining > 0;
              const showEarlyBird = tier.isEarlyBird && tier.currentTierName;
              const nextPriceIncrease =
                tier.nextPriceChange && tier.nextPriceChange.price > tier.currentPrice;

              return (
                <button
                  type="button"
                  key={tier._id}
                  onClick={() => !isSoldOut && onTierSelect(tier._id)}
                  disabled={isSoldOut}
                  className={`w-full text-left p-4 border-2 rounded-xl transition-all ${
                    selectedTierId === tier._id
                      ? showEarlyBird
                        ? "border-warning bg-warning/5 ring-2 ring-warning/20"
                        : "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : isSoldOut
                        ? "border-border bg-muted opacity-60 cursor-not-allowed"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-foreground">{tier.name}</p>
                          {showEarlyBird && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-warning text-white rounded-full font-medium">
                              <Zap className="w-3 h-3" />
                              {tier.currentTierName}
                            </span>
                          )}
                          <TierAvailabilityBadge
                            saleStart={tier.saleStart}
                            saleEnd={tier.saleEnd}
                            sold={tier.sold}
                            quantity={tier.quantity}
                          />
                        </div>
                        {tier.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {tier.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className={`text-xl font-bold ${showEarlyBird ? "text-warning" : "text-foreground"}`}>
                          ${(tier.currentPrice / 100).toFixed(2)}
                        </p>
                        {showEarlyBird && tier.price !== tier.currentPrice && (
                          <p className="text-sm text-muted-foreground line-through">
                            ${(tier.price / 100).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>

                    {nextPriceIncrease && tier.nextPriceChange && (
                      <div className="mt-2 p-2 bg-warning/10 border border-warning/30 rounded-lg text-xs">
                        <p className="text-warning font-medium">
                          Price increases to ${(tier.nextPriceChange.price / 100).toFixed(2)} on{" "}
                          {format(tier.nextPriceChange.date, "MMM d")}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      {tier.saleEnd && tier.saleEnd > now && (
                        <TierCountdown endDate={tier.saleEnd} />
                      )}
                      {isLowStock && (
                        <span className="text-warning font-medium">Only {remaining} left!</span>
                      )}
                      {!isLowStock && !isSoldOut && (
                        <span className="text-muted-foreground">{remaining} available</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Bundle Selection */}
      {purchaseType === "bundle" && bundles.length > 0 && (
        <div className="space-y-3">
          {bundles.map((bundle) => (
            <button
              type="button"
              key={bundle._id}
              onClick={() => onBundleSelect(bundle._id)}
              className={`w-full text-left p-4 border-2 rounded-xl transition-all ${
                selectedBundleId === bundle._id
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground">{bundle.name}</p>
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-success text-white rounded-full font-bold">
                        <TrendingDown className="w-3 h-3" />
                        Save {bundle.percentageSavings}%
                      </span>
                    </div>
                    {bundle.description && (
                      <p className="text-sm text-muted-foreground mt-1">{bundle.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {bundle.includedTiers.map((includedTier) => (
                        <span
                          key={includedTier.tierId}
                          className="text-xs px-2 py-0.5 bg-accent text-primary rounded"
                        >
                          {includedTier.quantity}x {includedTier.tierName}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xl font-bold text-primary">
                      ${(bundle.price / 100).toFixed(2)}
                    </p>
                    {bundle.regularPrice && (
                      <p className="text-sm text-muted-foreground line-through">
                        ${(bundle.regularPrice / 100).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-sm text-success font-medium">
                  {bundle.available} bundle{bundle.available !== 1 ? "s" : ""} available
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Quantity Selector - Only show when something is selected */}
      {hasSelection && (
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center text-xl font-bold text-foreground">{quantity}</span>
              <button
                type="button"
                onClick={() => onQuantityChange(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity}
                className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
