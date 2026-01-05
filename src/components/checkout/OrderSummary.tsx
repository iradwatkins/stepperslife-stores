/**
 * Order Summary Component
 *
 * Consistent order summary display across all checkout types
 *
 * Features:
 * - Itemized list with quantities
 * - Collapsible fee breakdown
 * - Mobile-optimized layout
 * - Visual hierarchy (subtotal → fees → total)
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { formatCurrency } from "@/lib/checkout/calculate-fees";

export interface OrderItem {
  /** Item name/description */
  name: string;
  /** Quantity */
  quantity: number;
  /** Price per unit in cents */
  pricePerUnit: number;
  /** Optional description/details */
  description?: string;
}

export interface OrderFees {
  /** Platform fee in cents */
  platform?: number;
  /** Payment processing fee in cents */
  processing?: number;
}

export interface OrderSummaryProps {
  /** Line items */
  items: OrderItem[];
  /** Subtotal in cents (before fees) */
  subtotal: number;
  /** Fee breakdown */
  fees: OrderFees;
  /** Total amount in cents */
  total: number;
  /** Show detailed fee breakdown */
  showFeeBreakdown?: boolean;
  /** Discount amount in cents (if any) */
  discountAmount?: number;
  /** Discount code used */
  discountCode?: string;
  /** Callback to remove discount */
  onRemoveDiscount?: () => void;
}

export function OrderSummary({
  items,
  subtotal,
  fees,
  total,
  showFeeBreakdown = true,
  discountAmount = 0,
  discountCode,
  onRemoveDiscount,
}: OrderSummaryProps) {
  const [feeBreakdownExpanded, setFeeBreakdownExpanded] = useState(false);

  const hasFees = (fees.platform || 0) + (fees.processing || 0) > 0;
  const subtotalAfterDiscount = subtotal - discountAmount;

  return (
    <div className="bg-card rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-foreground mb-4">Order Summary</h2>

      {/* Line Items */}
      <div className="space-y-3 pb-4 border-b border-border">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="font-medium text-foreground truncate">{item.name}</h3>
              {item.description && (
                <p className="text-sm text-muted-foreground truncate">{item.description}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {item.quantity} × {formatCurrency(item.pricePerUnit)}
              </p>
            </div>
            <div className="font-semibold text-foreground shrink-0">
              {formatCurrency(item.quantity * item.pricePerUnit)}
            </div>
          </div>
        ))}
      </div>

      {/* Subtotal */}
      <div className="py-4 space-y-2">
        <div className="flex justify-between text-foreground">
          <span>Subtotal</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>

        {/* Discount */}
        {discountAmount > 0 && (
          <div className="flex justify-between text-success">
            <div className="flex items-center gap-2">
              <span>Discount</span>
              {discountCode && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success">
                  {discountCode}
                </span>
              )}
              {onRemoveDiscount && (
                <button
                  type="button"
                  onClick={onRemoveDiscount}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Remove
                </button>
              )}
            </div>
            <span className="font-medium">-{formatCurrency(discountAmount)}</span>
          </div>
        )}

        {/* Subtotal After Discount */}
        {discountAmount > 0 && (
          <div className="flex justify-between text-foreground pt-2 border-t border-border">
            <span>Subtotal after discount</span>
            <span className="font-medium">{formatCurrency(subtotalAfterDiscount)}</span>
          </div>
        )}
      </div>

      {/* Fees Section */}
      {hasFees && (
        <div className="py-4 border-t border-border">
          <button
            type="button"
            onClick={() => setFeeBreakdownExpanded(!feeBreakdownExpanded)}
            className="w-full flex items-center justify-between text-foreground hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-2">
              <span>Fees</span>
              <Info className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {formatCurrency((fees.platform || 0) + (fees.processing || 0))}
              </span>
              {showFeeBreakdown && (
                <div className="text-muted-foreground">
                  {feeBreakdownExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              )}
            </div>
          </button>

          {/* Fee Breakdown (Collapsible) */}
          {showFeeBreakdown && feeBreakdownExpanded && (
            <div className="mt-3 pl-4 space-y-2 text-sm">
              {fees.platform && fees.platform > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform fee</span>
                  <span>{formatCurrency(fees.platform)}</span>
                </div>
              )}
              {fees.processing && fees.processing > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Processing fee</span>
                  <span>{formatCurrency(fees.processing)}</span>
                </div>
              )}
              <div className="pt-2 text-xs text-muted-foreground">
                Platform and processing fees support secure payment processing and event management.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Total */}
      <div className="pt-4 border-t-2 border-border">
        <div className="flex justify-between items-baseline">
          <span className="text-lg font-bold text-foreground">Total</span>
          <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
        </div>
        {hasFees && <p className="text-xs text-muted-foreground mt-1 text-right">All fees included</p>}
      </div>
    </div>
  );
}

/**
 * Compact Order Summary for mobile/small spaces
 */
export function CompactOrderSummary({ items, total }: Pick<OrderSummaryProps, "items" | "total">) {
  const [expanded, setExpanded] = useState(false);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-card rounded-lg shadow-md p-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="text-left">
          <div className="text-sm text-muted-foreground">
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </div>
          <div className="text-lg font-bold text-primary">{formatCurrency(total)}</div>
        </div>
        <div className="text-muted-foreground">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.quantity}× {item.name}
              </span>
              <span className="font-medium text-foreground">
                {formatCurrency(item.quantity * item.pricePerUnit)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
