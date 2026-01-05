/**
 * Email Types for SteppersLife Marketplace
 * Comprehensive type definitions for order receipt emails
 */

// Email recipient types
export type EmailRecipientType = "CUSTOMER" | "VENDOR" | "STAFF";

// Email status for logging
export type EmailStatus = "PENDING" | "SENT" | "FAILED" | "RESENT";

// Email send result
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  attempts: number;
  recipientType: EmailRecipientType;
  recipientEmail: string;
}

// Shipping address structure
export interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  phone?: string;
}

// Order item for receipts
export interface OrderReceiptItem {
  productId?: string;
  productName: string;
  productImage?: string; // Product image URL for email display
  variantName?: string;
  quantity: number;
  unitPrice: number; // in cents
  totalPrice: number; // in cents
  vendorId?: string;
  vendorName?: string;
  vendorEmail?: string;
}

// Base order receipt data (used for customer emails)
export interface OrderReceiptData {
  orderNumber: string;
  orderId?: string;
  orderDate: Date;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: OrderReceiptItem[];
  subtotal: number; // in cents
  shippingCost: number; // in cents
  taxAmount: number; // in cents
  totalAmount: number; // in cents
  shippingMethod: "DELIVERY" | "PICKUP";
  shippingAddress?: ShippingAddress;
  pickupNotes?: string;
  paymentStatus?: string;
  paymentMethod?: string;
}

// Vendor-specific receipt data (extends base with vendor-specific items)
export interface VendorReceiptData extends OrderReceiptData {
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  vendorItems: OrderReceiptItem[];
  vendorSubtotal: number; // in cents
}

// Staff notification data (extends base with additional stats)
export interface StaffNotificationData extends OrderReceiptData {
  vendorCount: number;
  totalItems: number;
  vendorBreakdown: VendorBreakdownItem[];
  emailResults?: {
    customerSent: boolean;
    vendorsSent: number;
    vendorsFailed: number;
  };
}

// Vendor breakdown for staff email
export interface VendorBreakdownItem {
  vendorName: string;
  vendorEmail: string;
  itemCount: number;
  subtotal: number; // in cents
}

// Email template output
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Email log entry for database
export interface EmailLogEntry {
  orderNumber: string;
  orderId?: string;
  recipientType: EmailRecipientType;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  templateType: string;
  status: EmailStatus;
  messageId?: string;
  attempts: number;
  lastAttemptAt: number;
  errorMessage?: string;
  resentAt?: number;
  resentBy?: string;
  resentMessageId?: string;
  createdAt: number;
  updatedAt: number;
}

// Combined results from sending all order emails
export interface OrderEmailResults {
  customer: EmailSendResult;
  vendors: EmailSendResult[];
  staff: EmailSendResult | null;
  allSuccess: boolean;
  summary: {
    customerSent: boolean;
    vendorsSent: number;
    vendorsFailed: number;
    staffSent: boolean;
  };
}

// Email service configuration
export interface EmailServiceConfig {
  maxRetries: number;
  retryDelayMs: number;
  staffEmail: string;
  staffEnabled: boolean;
  fromEmail: string;
  supportEmail: string;
}
