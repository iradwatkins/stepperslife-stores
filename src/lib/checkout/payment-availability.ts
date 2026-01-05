/**
 * Payment availability checker for CUSTOMER checkout flows
 *
 * Determines which payment methods are available for CUSTOMERS buying tickets
 *
 * Available for customers:
 * - Stripe (includes Card + Cash App Pay via Stripe integration)
 * - PayPal (direct PayPal payments)
 * - Cash (physical USD, staff validated, DEFAULT when no processor connected)
 */

export type MerchantProcessor = 'STRIPE' | 'PAYPAL';
export type PaymentMethod = 'card' | 'paypal' | 'cash';

export interface PaymentConfig {
  merchantProcessor?: MerchantProcessor;
  stripeConnectAccountId?: string;
  paypalMerchantId?: string;
  creditCardEnabled?: boolean;
  paypalEnabled?: boolean;
}

export interface AvailablePaymentMethods {
  /** Credit/debit card payments available (via Stripe, includes Cash App Pay) */
  creditCard: boolean;
  /** PayPal payments available */
  paypal: boolean;
  /** Cash in-person available (physical USD, staff validated, DEFAULT) */
  cash: boolean;
  /** Active merchant processor */
  merchantProcessor?: MerchantProcessor;
  /** Cash requires staff approval */
  cashRequiresStaffApproval: boolean;
}

/**
 * Determine available payment methods based on payment config and staff settings
 *
 * Payment Hierarchy:
 * - Organizer Level: Configure Stripe Connect + enable/disable PayPal
 * - Staff Level: Toggle "Accept Cash In-Person" only
 *
 * Visibility Rules:
 * - No Stripe Connect: Only PayPal (if enabled) and Cash (if staff accepts)
 * - Stripe configured: Card + Cash App Pay + PayPal (if enabled) + Cash (if staff accepts)
 * - Cash orders: Do not require Stripe setup, always available when staff opts in
 *
 * @param paymentConfig - Event payment configuration from Convex
 * @param staffAcceptsCash - Whether any staff member accepts cash for this event
 * @returns Available payment methods
 */
export function getAvailablePaymentMethods(
  paymentConfig: PaymentConfig | null | undefined,
  staffAcceptsCash: boolean = false
): AvailablePaymentMethods {
  // No payment config means no online payments configured
  // DEFAULT: Cash only (physical USD, staff validated)
  if (!paymentConfig) {
    return {
      creditCard: false,
      paypal: false,
      cash: staffAcceptsCash, // Cash is DEFAULT when no Stripe/PayPal connected
      merchantProcessor: undefined,
      cashRequiresStaffApproval: true,
    };
  }

  // Check if Stripe is configured (has connect account)
  const hasStripe = !!paymentConfig.stripeConnectAccountId;
  const creditCard = hasStripe && (paymentConfig.creditCardEnabled ?? true);

  // PayPal is enabled if:
  // 1. Explicitly enabled via paypalEnabled flag, OR
  // 2. Organizer has a PayPal merchant ID configured
  const hasPayPal = !!paymentConfig.paypalMerchantId;
  const paypal = (paymentConfig.paypalEnabled ?? false) || hasPayPal;

  return {
    creditCard,
    paypal,
    cash: staffAcceptsCash, // Cash always available alongside online methods
    merchantProcessor: hasStripe ? 'STRIPE' : (paypal ? 'PAYPAL' : undefined),
    cashRequiresStaffApproval: true,
  };
}

/**
 * Check if any online payment method is available
 *
 * @param methods - Available payment methods
 * @returns true if card or paypal is available
 */
export function hasOnlinePaymentMethod(methods: AvailablePaymentMethods): boolean {
  return methods.creditCard || methods.paypal;
}

/**
 * Get default payment method (first available)
 *
 * Priority: card (Stripe) > paypal > cash (USD)
 *
 * @param methods - Available payment methods
 * @returns Default payment method or null if none available
 */
export function getDefaultPaymentMethod(methods: AvailablePaymentMethods): PaymentMethod | null {
  if (methods.creditCard) return 'card';
  if (methods.paypal) return 'paypal';
  if (methods.cash) return 'cash';
  return null;
}

/**
 * Validate if a selected payment method is available
 *
 * @param method - Selected payment method
 * @param methods - Available payment methods
 * @returns true if method is available
 */
export function isPaymentMethodAvailable(
  method: PaymentMethod,
  methods: AvailablePaymentMethods
): boolean {
  switch (method) {
    case 'card':
      return methods.creditCard;
    case 'paypal':
      return methods.paypal;
    case 'cash':
      return methods.cash;
    default:
      return false;
  }
}

/**
 * Get payment method display name
 *
 * @param method - Payment method
 * @returns Human-readable display name
 */
export function getPaymentMethodDisplayName(method: PaymentMethod): string {
  switch (method) {
    case 'card':
      return 'Card / Cash App Pay';
    case 'paypal':
      return 'PayPal';
    case 'cash':
      return 'Cash In-Person (USD)';
    default:
      return 'Unknown';
  }
}

/**
 * Get merchant processor display name
 *
 * @param processor - Merchant processor
 * @returns Human-readable display name
 */
export function getMerchantProcessorDisplayName(processor?: MerchantProcessor): string {
  if (!processor) return 'Not configured';

  switch (processor) {
    case 'STRIPE':
      return 'Stripe';
    case 'PAYPAL':
      return 'PayPal';
    default:
      return 'Unknown';
  }
}

/**
 * Check if email is required for a payment method
 * Cash payments don't require email (phone is sufficient)
 *
 * @param method - Payment method
 * @returns true if email is required
 */
export function isEmailRequired(method: PaymentMethod): boolean {
  return method !== 'cash';
}
