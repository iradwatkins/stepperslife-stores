/**
 * Unified Payment Method Selector Component
 *
 * Payment method selection:
 * - Card / Cash App Pay (via Stripe) - online payments
 * - PayPal (direct PayPal payments) - online payments
 * - Cash (physical USD at door) - in-person payments
 *
 * Features:
 * - Automatically hides unavailable methods
 * - Shows Stripe branding for card payments
 * - Shows PayPal branding for PayPal payments
 * - Displays cash requirements (staff approval, 30-min hold)
 * - Accessibility compliant (keyboard navigation, ARIA labels)
 */

import { CreditCard, Banknote, AlertCircle, Smartphone, Wallet } from "lucide-react";
import type {
  PaymentMethod,
  AvailablePaymentMethods,
} from "@/lib/checkout/payment-availability";
import {
  getPaymentMethodDisplayName,
  getMerchantProcessorDisplayName,
} from "@/lib/checkout/payment-availability";

export interface PaymentMethodSelectorProps {
  /** Available payment methods based on config */
  availableMethods: AvailablePaymentMethods;
  /** Currently selected payment method */
  selectedMethod: PaymentMethod;
  /** Callback when payment method changes */
  onMethodChange: (method: PaymentMethod) => void;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Get icon component for payment method
 */
function getPaymentMethodIcon(method: PaymentMethod) {
  switch (method) {
    case "card":
      return CreditCard;
    case "paypal":
      return Wallet;
    case "cash":
      return Banknote;
    default:
      return CreditCard;
  }
}

/**
 * Get description for payment method
 */
function getPaymentMethodDescription(method: PaymentMethod): string {
  switch (method) {
    case "card":
      return "Pay securely with card or Cash App Pay via Stripe";
    case "paypal":
      return "Pay securely with your PayPal account";
    case "cash":
      return "Pay with cash when picking up your tickets (requires staff approval)";
    default:
      return "";
  }
}

export function PaymentMethodSelector({
  availableMethods,
  selectedMethod,
  onMethodChange,
  disabled = false,
}: PaymentMethodSelectorProps) {
  const methods: PaymentMethod[] = [];

  if (availableMethods.creditCard) methods.push("card");
  if (availableMethods.paypal) methods.push("paypal");
  if (availableMethods.cash) methods.push("cash");

  // If no methods available, show error state
  if (methods.length === 0) {
    return (
      <div className="bg-warning/10 border border-warning rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">No Payment Methods Available</h3>
            <p className="text-sm text-muted-foreground">
              The organizer has not configured any payment methods for this event. Please contact
              the event organizer for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground mb-4">Select Payment Method</h3>

      {/* Payment Method Options */}
      <div className="space-y-3">
        {methods.map((method) => {
          const Icon = getPaymentMethodIcon(method);
          const isSelected = selectedMethod === method;
          const description = getPaymentMethodDescription(method);

          return (
            <button
              key={method}
              type="button"
              onClick={() => onMethodChange(method)}
              disabled={disabled}
              className={`
                w-full p-4 border-2 rounded-lg text-left transition-all
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  isSelected
                    ? "border-primary bg-accent/50"
                    : "border-border bg-card hover:border-border hover:bg-muted"
                }
              `}
              aria-pressed={isSelected}
              aria-label={`Pay with ${getPaymentMethodDisplayName(method)}`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`
                    w-12 h-12 rounded-lg flex items-center justify-center shrink-0
                    ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                  `}
                >
                  <Icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4
                      className={`font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}
                    >
                      {getPaymentMethodDisplayName(method)}
                    </h4>
                    {isSelected && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{description}</p>

                  {/* Card-specific info - show Cash App Pay badge */}
                  {method === "card" && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Smartphone className="w-4 h-4" />
                      <span>Cash App Pay available</span>
                    </div>
                  )}

                  {/* PayPal-specific info */}
                  {method === "paypal" && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="text-brand-paypal-primary font-semibold">Pay</span>
                      <span className="text-brand-paypal-secondary font-semibold">Pal</span>
                      <span>checkout</span>
                    </div>
                  )}

                  {/* Cash-specific warnings */}
                  {method === "cash" && (
                    <div className="mt-2 p-2 bg-accent/50 border border-border rounded text-xs text-foreground">
                      <strong>Note:</strong> Your order will be held for 30 minutes. Staff must
                      approve your payment within this time.
                    </div>
                  )}
                </div>

                {/* Selection Indicator */}
                <div
                  className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                    ${isSelected ? "border-primary" : "border-border"}
                  `}
                >
                  {isSelected && <div className="w-3 h-3 rounded-full bg-primary"></div>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Processor Info */}
      {availableMethods.merchantProcessor && (
        <div className="mt-4 p-3 bg-muted border border-border rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            Payments processed securely by{" "}
            <span className="font-semibold">
              {getMerchantProcessorDisplayName(availableMethods.merchantProcessor)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
