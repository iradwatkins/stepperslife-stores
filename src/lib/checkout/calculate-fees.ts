/**
 * Centralized fee calculation utility for checkout flows
 *
 * This utility handles all fee calculations following the payment config rules:
 * - PREPAY/PRE_PURCHASE: No fees (organizer paid upfront)
 * - CREDIT_CARD/PAY_AS_SELL: Platform fee + processing fee
 */

export type PaymentModel = 'PREPAY' | 'PRE_PURCHASE' | 'CREDIT_CARD' | 'PAY_AS_SELL';

export interface FeeCalculationParams {
  /** Subtotal in cents (before discounts) */
  subtotal: number;
  /** Payment model from event payment config */
  paymentModel: PaymentModel;
  /** Optional discount amount in cents */
  discountAmount?: number;
  /** Apply charity discount (50% off platform fees) */
  charityDiscount?: boolean;
  /** Apply low-price discount (50% off platform fees) */
  lowPriceDiscount?: boolean;
}

export interface FeeBreakdown {
  /** Original subtotal before discount */
  subtotal: number;
  /** Discount amount applied */
  discountAmount: number;
  /** Subtotal after discount */
  subtotalAfterDiscount: number;
  /** Platform fee (SteppersLife commission) */
  platformFee: number;
  /** Payment processor fee (Stripe/Square) */
  processingFee: number;
  /** Final total amount to charge */
  totalAmount: number;
  /** Payment model used for calculation */
  paymentModel: PaymentModel;
}

// Fee constants (can be moved to environment variables later)
const DEFAULT_PLATFORM_FEE_PERCENT = 3.7;
const DEFAULT_PLATFORM_FEE_FIXED_CENTS = 179; // $1.79
const DEFAULT_PROCESSING_FEE_PERCENT = 2.9;
const DEFAULT_PROCESSING_FEE_FIXED_CENTS = 30; // $0.30

/**
 * Calculate order fees based on payment model and discounts
 *
 * @param params - Fee calculation parameters
 * @returns Detailed fee breakdown
 *
 * @example
 * ```typescript
 * const fees = calculateOrderFees({
 *   subtotal: 5000, // $50.00
 *   paymentModel: 'CREDIT_CARD',
 *   discountAmount: 500, // $5.00 discount
 * });
 *
 * console.log(fees.totalAmount); // Final charge in cents
 * ```
 */
export function calculateOrderFees(params: FeeCalculationParams): FeeBreakdown {
  const {
    subtotal,
    paymentModel,
    discountAmount = 0,
    charityDiscount = false,
    lowPriceDiscount = false,
  } = params;

  // Apply discount to subtotal
  const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);

  let platformFee = 0;
  let processingFee = 0;

  // Determine if fees should be charged
  const isPrepaidModel = paymentModel === 'PREPAY' || paymentModel === 'PRE_PURCHASE';

  if (isPrepaidModel) {
    // Organizer already paid platform fee upfront - no additional fees for customer
    platformFee = 0;
    processingFee = 0;
  } else {
    // CREDIT_CARD or PAY_AS_SELL - fees added to customer's purchase

    // Calculate platform fee with possible discounts
    let platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT;
    let platformFeeFixed = DEFAULT_PLATFORM_FEE_FIXED_CENTS;

    if (charityDiscount || lowPriceDiscount) {
      // Apply 50% discount for charity or low-price events
      platformFeePercent = platformFeePercent / 2;
      platformFeeFixed = Math.round(platformFeeFixed / 2);
    }

    // Platform fee: percentage + fixed
    platformFee = Math.round((subtotalAfterDiscount * platformFeePercent) / 100) + platformFeeFixed;

    // Processing fee: calculated on (subtotal + platform fee)
    const totalBeforeProcessing = subtotalAfterDiscount + platformFee;
    processingFee = Math.round((totalBeforeProcessing * DEFAULT_PROCESSING_FEE_PERCENT) / 100) + DEFAULT_PROCESSING_FEE_FIXED_CENTS;
  }

  const totalAmount = subtotalAfterDiscount + platformFee + processingFee;

  return {
    subtotal,
    discountAmount,
    subtotalAfterDiscount,
    platformFee,
    processingFee,
    totalAmount,
    paymentModel,
  };
}

/**
 * Format cents to dollar string
 *
 * @param cents - Amount in cents
 * @returns Formatted dollar string (e.g., "$12.50")
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Calculate percentage of total that fees represent
 *
 * @param fees - Fee breakdown from calculateOrderFees
 * @returns Percentage string (e.g., "7.2%")
 */
export function calculateFeePercentage(fees: FeeBreakdown): string {
  if (fees.subtotalAfterDiscount === 0) return "0%";

  const totalFees = fees.platformFee + fees.processingFee;
  const percentage = (totalFees / fees.subtotalAfterDiscount) * 100;

  return `${percentage.toFixed(1)}%`;
}

/**
 * Check if an event qualifies for low-price discount
 * Based on average ticket price being under a threshold
 *
 * @param averageTicketPriceCents - Average ticket price in cents
 * @param threshold - Threshold in cents (default: $20.00)
 * @returns true if qualifies for discount
 */
export function qualifiesForLowPriceDiscount(
  averageTicketPriceCents: number,
  threshold: number = 2000 // $20.00
): boolean {
  return averageTicketPriceCents < threshold;
}
