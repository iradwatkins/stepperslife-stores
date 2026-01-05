/**
 * Payment Success Component
 *
 * Unified success screen with appropriate actions for different order types
 *
 * Features:
 * - Order confirmation display
 * - Next steps guidance
 * - Action buttons (view tickets, track order, etc.)
 * - Different layouts for tickets vs products vs cash orders
 */

import Link from "next/link";
import {
  CheckCircle2,
  Mail,
  Phone,
  Ticket,
  Package,
  Clock,
  Download,
  ArrowRight,
} from "lucide-react";

export type OrderType = "ticket" | "product" | "bundle";
export type PaymentType = "card" | "cashapp" | "cash";

export interface ActionButton {
  /** Button label */
  label: string;
  /** Link href */
  href: string;
  /** Primary action (styled differently) */
  primary?: boolean;
  /** Optional icon */
  icon?: "ticket" | "download" | "arrow";
}

export interface ConfirmationDetails {
  /** Buyer email (if provided) */
  email?: string;
  /** Buyer phone number */
  phone: string;
  /** Number of tickets (for ticket orders) */
  ticketCount?: number;
  /** Delivery method (for product orders) */
  deliveryMethod?: string;
  /** Hold expiration timestamp (for cash orders) */
  holdExpiresAt?: number;
}

export interface PaymentSuccessProps {
  /** Order number/ID */
  orderNumber: string;
  /** Type of order */
  orderType: OrderType;
  /** Payment method used */
  paymentType: PaymentType;
  /** Confirmation details */
  confirmationDetails: ConfirmationDetails;
  /** Action buttons */
  actions: ActionButton[];
}

/**
 * Get icon component for action button
 */
function getActionIcon(icon?: string) {
  switch (icon) {
    case "ticket":
      return Ticket;
    case "download":
      return Download;
    case "arrow":
      return ArrowRight;
    default:
      return ArrowRight;
  }
}

/**
 * Format timestamp to readable time
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function PaymentSuccess({
  orderNumber,
  orderType,
  paymentType,
  confirmationDetails,
  actions,
}: PaymentSuccessProps) {
  const isCashOrder = paymentType === "cash";
  const isTicketOrder = orderType === "ticket" || orderType === "bundle";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success Icon */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-success/10 rounded-full mb-4">
          <CheckCircle2 className="w-12 h-12 text-success" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {isCashOrder ? "Order Reserved!" : "Payment Successful!"}
        </h1>
        <p className="text-lg text-muted-foreground">
          {isCashOrder
            ? "Your order is being held for cash payment"
            : "Your order has been confirmed"}
        </p>
      </div>

      {/* Order Details Card */}
      <div className="bg-card rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Order Confirmation</h2>

        {/* Order Number */}
        <div className="mb-4 p-3 bg-accent/50 border border-border rounded-lg">
          <div className="text-sm text-foreground mb-1">Order Number</div>
          <div className="text-xl font-bold text-foreground font-mono">{orderNumber}</div>
        </div>

        {/* Cash Order - Hold Expiration Warning */}
        {isCashOrder && confirmationDetails.holdExpiresAt && (
          <div className="mb-4 p-4 bg-warning/10 border border-warning rounded-lg">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Payment Hold</h3>
                <p className="text-sm text-muted-foreground">
                  Your order is reserved until{" "}
                  <strong>{formatTime(confirmationDetails.holdExpiresAt)}</strong>. Please complete
                  cash payment with staff before this time.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Details */}
        <div className="space-y-3">
          {confirmationDetails.email && (
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">Confirmation sent to</div>
                <div className="font-medium text-foreground">{confirmationDetails.email}</div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <div className="text-sm text-muted-foreground">Phone number</div>
              <div className="font-medium text-foreground">{confirmationDetails.phone}</div>
            </div>
          </div>

          {isTicketOrder && confirmationDetails.ticketCount && (
            <div className="flex items-start gap-3">
              <Ticket className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">Tickets</div>
                <div className="font-medium text-foreground">
                  {confirmationDetails.ticketCount}{" "}
                  {confirmationDetails.ticketCount === 1 ? "ticket" : "tickets"}
                </div>
              </div>
            </div>
          )}

          {orderType === "product" && confirmationDetails.deliveryMethod && (
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">Delivery</div>
                <div className="font-medium text-foreground">
                  {confirmationDetails.deliveryMethod}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-accent/50 border border-border rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-foreground mb-3">What's Next?</h3>
        <ul className="space-y-2 text-sm text-accent-foreground">
          {isCashOrder ? (
            <>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">1.</span>
                <span>Staff has been notified of your cash order</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">2.</span>
                <span>Complete payment with cash before the hold expires</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">3.</span>
                <span>Staff will activate your tickets once payment is received</span>
              </li>
            </>
          ) : isTicketOrder ? (
            <>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">1.</span>
                <span>
                  {confirmationDetails.email
                    ? "Check your email for your ticket QR codes"
                    : "Your tickets are ready to view"}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">2.</span>
                <span>Save your tickets to your phone or print them</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">3.</span>
                <span>Present your QR code at the event entrance</span>
              </li>
            </>
          ) : (
            <>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">1.</span>
                <span>You'll receive an order confirmation email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">2.</span>
                <span>Your order will be prepared for pickup/delivery</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">3.</span>
                <span>You'll be notified when your order is ready</span>
              </li>
            </>
          )}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {actions.map((action, index) => {
          const Icon = getActionIcon(action.icon);

          return (
            <Link
              key={index}
              href={action.href}
              className={`
                block w-full px-6 py-4 rounded-lg font-semibold text-center
                transition-all shadow-md hover:shadow-lg
                flex items-center justify-center gap-2
                ${
                  action.primary
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-card text-foreground border-2 border-border hover:border-border"
                }
              `}
            >
              {action.label}
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Need help?{" "}
          <Link href="/help" className="text-primary hover:underline font-medium">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}
