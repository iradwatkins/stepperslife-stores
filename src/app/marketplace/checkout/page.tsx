"use client";

import { useCart, VendorGroup } from "@/contexts/CartContext";
import { ArrowLeft, Package, Loader2, Truck, Store, CreditCard, AlertTriangle, LogIn, Lock, Building2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { MarketplaceSubNav } from "@/components/layout/MarketplaceSubNav";
import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Load Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

// Payment Form Component with Stripe Elements
function PaymentForm({
  clientSecret,
  total,
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
}: {
  clientSecret: string;
  total: number;
  onSuccess: () => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/marketplace/order-confirmation`,
        },
        redirect: "if_required",
      });

      if (error) {
        console.error("[Payment] Error:", error);
        onError(error.message || "Payment failed. Please try again.");
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess();
      } else {
        // Payment might require additional action
        onError("Payment requires additional verification. Please try again.");
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error("[Payment] Exception:", err);
      onError(err.message || "Payment failed. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
          paymentMethodOrder: ["card", "cashapp"],
        }}
      />
      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full py-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Pay ${(total / 100).toFixed(2)}
          </>
        )}
      </button>
      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" />
        Secured by Stripe. Your payment info is encrypted.
      </p>
    </form>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getSubtotal, clearCart, getItemsByVendor, getVendorCount } = useCart();
  const createOrder = useMutation(api.productOrders.mutations.createProductOrder);
  const updatePaymentStatus = useMutation(api.productOrders.mutations.updatePaymentStatus);
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<Id<"productOrders"> | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [step, setStep] = useState<"info" | "payment">("info");

  // Get unique vendor IDs from cart items
  const vendorIds = useMemo(() => {
    const ids = new Set<string>();
    items.forEach(item => {
      if (item.vendorId) {
        ids.add(item.vendorId);
      }
    });
    return Array.from(ids);
  }, [items]);

  // Validate cart items on load
  const cartValidation = useQuery(
    api.products.queries.validateCartItems,
    items.length > 0
      ? {
          items: items.map((item) => ({
            productId: item.productId as string,
            quantity: item.quantity,
            variantId: item.variantId,
            variationId: item.variationId as string | undefined,
          })),
        }
      : "skip"
  );

  // Update validation errors when validation result changes
  useEffect(() => {
    if (cartValidation && !cartValidation.allValid) {
      const errors = cartValidation.results
        .filter((r) => !r.valid)
        .map((r) => `${r.productName || "Unknown product"}: ${r.error}`);
      setValidationErrors(errors);
    } else {
      setValidationErrors([]);
    }
  }, [cartValidation]);

  const [shippingMethod, setShippingMethod] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [shippingSpeed, setShippingSpeed] = useState<"standard" | "express">("standard");

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Shipping address state
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("United States");

  // Pickup location
  const [pickupLocation, setPickupLocation] = useState("");

  // Dynamic tax rate lookup based on shipping state
  // For pickup orders, default to IL (Illinois - SteppersLife HQ)
  const taxStateCode = shippingMethod === "PICKUP" ? "IL" : state.trim().toUpperCase();
  const taxRateData = useQuery(
    api.taxRates.getRateByState,
    taxStateCode.length === 2 ? { state: taxStateCode, defaultRate: 0 } : "skip"
  );

  // Tax rate as decimal (e.g., 0.0625 for 6.25%)
  // Default to 0 if not loaded yet or state not entered
  const taxRate = taxRateData ?? 0;
  const taxRatePercent = (taxRate * 100).toFixed(2).replace(/\.?0+$/, ''); // e.g., "6.25" or "7"

  const subtotal = getSubtotal();

  // Dynamic shipping rate lookup based on state
  const shippingStateCode = state.trim().toUpperCase();
  const shippingOptions = useQuery(
    api.shipping.getShippingOptions,
    shippingMethod === "DELIVERY" && shippingStateCode.length === 2
      ? { state: shippingStateCode, subtotal }
      : "skip"
  );

  // Calculate shipping cost based on selected method and speed
  const estimatedShipping = useMemo(() => {
    if (shippingMethod === "PICKUP") return 0;
    if (!shippingOptions) return 999; // Default $9.99 while loading

    if (shippingSpeed === "express") {
      return shippingOptions.express.rate;
    }
    return shippingOptions.standard.rate;
  }, [shippingMethod, shippingOptions, shippingSpeed]);

  // Get shipping delivery estimate
  const shippingDays = useMemo(() => {
    if (shippingMethod === "PICKUP") return "Available for pickup";
    if (!shippingOptions) return "5-7 business days";

    if (shippingSpeed === "express") {
      return shippingOptions.express.days;
    }
    return shippingOptions.standard.days;
  }, [shippingMethod, shippingOptions, shippingSpeed]);

  // Check if free shipping applies
  const hasFreeShipping = shippingOptions?.standard.freeShipping ?? false;
  const freeShippingThreshold = shippingOptions?.freeShippingThreshold ?? null;
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + estimatedShipping + tax;

  // Pre-fill customer info from user profile
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name && !customerName) {
        setCustomerName(currentUser.name);
      }
      if (currentUser.email && !customerEmail) {
        setCustomerEmail(currentUser.email);
      }
    }
  }, [currentUser, customerName, customerEmail]);

  // Loading state for user authentication check
  if (currentUser === undefined) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
        <PublicFooter />
      </>
    );
  }

  // Require login to checkout
  if (!currentUser) {
    const redirectUrl = encodeURIComponent("/marketplace/checkout");
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto bg-card rounded-2xl shadow-lg p-8 text-center border border-border">
              <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <LogIn className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">Sign In to Continue</h1>
              <p className="text-muted-foreground mb-8">
                Please sign in to complete your purchase.
              </p>
              <Link
                href={`/login?redirect=${redirectUrl}`}
                className="block w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Sign In
              </Link>
              <p className="text-sm text-muted-foreground mt-4">
                Don't have an account?{" "}
                <Link href={`/register?redirect=${redirectUrl}`} className="text-primary hover:underline">
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground dark:text-white mb-2">
              Your cart is empty
            </h2>
            <p className="text-muted-foreground mb-6">
              Add some products to your cart before checking out.
            </p>
            <Link
              href="/marketplace"
              className="block w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  const handleContinueToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Check cart validation first
      if (validationErrors.length > 0) {
        throw new Error("Please fix the cart issues before placing your order");
      }

      // Validate required fields
      if (!customerName.trim() || !customerEmail.trim()) {
        throw new Error("Please fill in your name and email");
      }

      if (shippingMethod === "DELIVERY") {
        if (!address1.trim() || !city.trim() || !state.trim() || !zipCode.trim()) {
          throw new Error("Please fill in your complete shipping address");
        }
      }

      // Prepare order items
      const orderItems = items.map((item) => ({
        productId: item.productId as Id<"products">,
        productName: item.productName,
        productImage: item.productImage,
        variantId: item.variantId,
        variantName: item.variantName,
        variationId: item.variationId,
        variationAttributes: item.variationAttributes,
        variationSku: item.variationSku,
        quantity: item.quantity,
        price: item.productPrice,
      }));

      // Create order with PENDING payment status
      const result = await createOrder({
        items: orderItems,
        customerEmail: customerEmail.trim().toLowerCase(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        shippingMethod,
        shippingCost: estimatedShipping, // Zone-based shipping cost
        shippingZone: shippingOptions?.zoneName, // Zone name (Local, Regional, etc.)
        shippingSpeed, // standard or express
        shippingAddress: {
          name: customerName.trim(),
          address1: address1.trim(),
          address2: address2.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          zipCode: zipCode.trim(),
          country: country.trim(),
          phone: customerPhone.trim() || undefined,
        },
        pickupLocation: shippingMethod === "PICKUP" ? pickupLocation : undefined,
      });

      setOrderId(result.orderId);
      setOrderNumber(result.orderNumber);

      // Get vendor info for the first item (for now, single-vendor checkout)
      // TODO: Support multi-vendor checkout
      const firstVendorId = items[0]?.vendorId;
      let vendorInfo = null;

      if (firstVendorId) {
        // Fetch vendor payment info
        try {
          const vendorResponse = await fetch(`/api/vendors/${firstVendorId}/payment-info`);
          if (vendorResponse.ok) {
            vendorInfo = await vendorResponse.json();
          }
        } catch {
          // Vendor info not available, use platform payment
        }
      }

      // Create Stripe payment intent
      const paymentResponse = await fetch("/api/stripe/create-product-order-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          vendorId: firstVendorId || "",
          vendorName: items[0]?.vendorName || "SteppersLife Marketplace",
          vendorStripeAccountId: vendorInfo?.stripeConnectedAccountId || null,
          commissionPercent: vendorInfo?.commissionPercent || 15, // Default 15%
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          items: orderItems.map(item => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.error || "Failed to initialize payment");
      }

      const paymentData = await paymentResponse.json();

      setClientSecret(paymentData.clientSecret);
      setPaymentIntentId(paymentData.paymentIntentId);
      setStep("payment");
      setIsSubmitting(false);
    } catch (err: any) {
      console.error("[Checkout] Setup failed:", err);
      setError(err.message || "Failed to proceed to payment. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      // Update order payment status
      if (orderId && paymentIntentId) {
        await updatePaymentStatus({
          orderId: orderId,
          paymentStatus: "PAID",
          paymentMethod: "stripe",
          stripePaymentIntentId: paymentIntentId,
        });
      }

      // Send confirmation email
      try {
        const emailItems = items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          quantity: item.quantity,
          price: item.productPrice,
          variantName: item.variantName,
        }));

        await fetch("/api/send-product-order-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerEmail: customerEmail.trim().toLowerCase(),
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim() || undefined,
            orderNumber: orderNumber,
            items: emailItems,
            subtotal,
            shippingCost: estimatedShipping,
            taxAmount: tax,
            totalAmount: total,
            shippingAddress: shippingMethod === "DELIVERY" ? {
              name: customerName.trim(),
              address1: address1.trim(),
              address2: address2.trim() || undefined,
              city: city.trim(),
              state: state.trim(),
              zipCode: zipCode.trim(),
              country: country.trim(),
            } : undefined,
            shippingMethod,
            pickupNotes: shippingMethod === "PICKUP" ? pickupLocation : undefined,
            paymentMethod: "stripe",
          }),
        });
      } catch (emailError) {
        console.error("[Checkout] Email error:", emailError);
      }

      // Clear cart and redirect
      clearCart();
      router.push(`/marketplace/order-confirmation?orderNumber=${orderNumber}`);
    } catch (err: any) {
      console.error("[Checkout] Post-payment update failed:", err);
      // Still redirect since payment succeeded
      clearCart();
      router.push(`/marketplace/order-confirmation?orderNumber=${orderNumber}`);
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // Stripe Elements appearance
  const appearance = {
    theme: "stripe" as const,
    variables: {
      colorPrimary: "#8B5CF6",
      colorBackground: "#ffffff",
      colorText: "#1f2937",
      colorDanger: "#ef4444",
      fontFamily: "system-ui, sans-serif",
      borderRadius: "8px",
    },
  };

  return (
    <>
      <PublicHeader />
      <MarketplaceSubNav />
      <div className="min-h-screen bg-background">
        {/* Back Link */}
        <div className="bg-card shadow-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Shop
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-8">Checkout</h1>

          {/* Step Indicator */}
          <div className="flex items-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${step === "info" ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === "info" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>1</div>
              <span className="font-medium">Your Info</span>
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className={`flex items-center gap-2 ${step === "payment" ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === "payment" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>2</div>
              <span className="font-medium">Payment</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2 space-y-6">
              {step === "info" ? (
                <form onSubmit={handleContinueToPayment}>
                  {/* Contact Information */}
                  <div className="bg-card rounded-xl shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold text-foreground mb-4">
                      Contact Information
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Full Name <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Email <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="john@example.com"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Phone
                          </label>
                          <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="(555) 123-4567"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Method */}
                  <div className="bg-card rounded-xl shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold text-foreground mb-4">
                      Shipping Method
                    </h2>

                    {/* Free shipping banner */}
                    {freeShippingThreshold && !hasFreeShipping && shippingMethod === "DELIVERY" && (
                      <div className="bg-success/10 border border-success/30 rounded-lg p-3 mb-4">
                        <p className="text-sm text-success">
                          <Truck className="w-4 h-4 inline-block mr-1.5" />
                          Add ${((freeShippingThreshold - subtotal) / 100).toFixed(2)} more for free standard shipping!
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Delivery Option */}
                      <label
                        className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                          shippingMethod === "DELIVERY"
                            ? "border-primary bg-primary/5"
                            : "border-input hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="shippingMethod"
                          value="DELIVERY"
                          checked={shippingMethod === "DELIVERY"}
                          onChange={() => setShippingMethod("DELIVERY")}
                          className="w-4 h-4 text-primary"
                        />
                        <Truck className="w-6 h-6 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium text-foreground">Ship to Address</p>
                          <p className="text-sm text-muted-foreground">
                            {shippingOptions
                              ? `${shippingOptions.zoneName} shipping zone`
                              : "Enter your state for rates"}
                          </p>
                        </div>
                      </label>

                      {/* Shipping Speed Options (shown when DELIVERY is selected) */}
                      {shippingMethod === "DELIVERY" && shippingOptions && (
                        <div className="ml-8 space-y-2 border-l-2 border-primary/30 pl-4">
                          {/* Standard Shipping */}
                          <label
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              shippingSpeed === "standard"
                                ? "border-primary bg-primary/5"
                                : "border-input hover:border-primary/50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="shippingSpeed"
                              value="standard"
                              checked={shippingSpeed === "standard"}
                              onChange={() => setShippingSpeed("standard")}
                              className="w-4 h-4 text-primary"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-foreground text-sm">Standard Shipping</p>
                              <p className="text-xs text-muted-foreground">
                                {shippingOptions.standard.days}
                              </p>
                            </div>
                            <span className={`font-semibold ${hasFreeShipping ? "text-success" : "text-foreground"}`}>
                              {hasFreeShipping ? "Free" : `$${(shippingOptions.standard.rate / 100).toFixed(2)}`}
                            </span>
                          </label>

                          {/* Express Shipping */}
                          <label
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              shippingSpeed === "express"
                                ? "border-primary bg-primary/5"
                                : "border-input hover:border-primary/50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="shippingSpeed"
                              value="express"
                              checked={shippingSpeed === "express"}
                              onChange={() => setShippingSpeed("express")}
                              className="w-4 h-4 text-primary"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-foreground text-sm">Express Shipping</p>
                              <p className="text-xs text-muted-foreground">
                                {shippingOptions.express.days}
                              </p>
                            </div>
                            <span className="font-semibold text-foreground">
                              ${(shippingOptions.express.rate / 100).toFixed(2)}
                            </span>
                          </label>
                        </div>
                      )}

                      {/* Prompt to enter state if shipping selected but no state */}
                      {shippingMethod === "DELIVERY" && !shippingOptions && shippingStateCode.length !== 2 && (
                        <div className="ml-8 p-3 bg-muted/50 rounded-lg border border-input">
                          <p className="text-sm text-muted-foreground">
                            Enter your state below to see shipping rates for your location.
                          </p>
                        </div>
                      )}

                      {/* Pickup Option */}
                      <label
                        className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                          shippingMethod === "PICKUP"
                            ? "border-primary bg-primary/5"
                            : "border-input hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="shippingMethod"
                          value="PICKUP"
                          checked={shippingMethod === "PICKUP"}
                          onChange={() => setShippingMethod("PICKUP")}
                          className="w-4 h-4 text-primary"
                        />
                        <Store className="w-6 h-6 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium text-foreground">Local Pickup</p>
                          <p className="text-sm text-muted-foreground">
                            Pick up from vendor location
                          </p>
                        </div>
                        <span className="font-semibold text-success">Free</span>
                      </label>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  {shippingMethod === "DELIVERY" && (
                    <div className="bg-card rounded-xl shadow-md p-6 mb-6">
                      <h2 className="text-xl font-semibold text-foreground mb-4">
                        Shipping Address
                      </h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Street Address <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="text"
                            value={address1}
                            onChange={(e) => setAddress1(e.target.value)}
                            className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="123 Main Street"
                            required={shippingMethod === "DELIVERY"}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Apt, Suite, etc. (optional)
                          </label>
                          <input
                            type="text"
                            value={address2}
                            onChange={(e) => setAddress2(e.target.value)}
                            className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Apartment 4B"
                          />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-foreground mb-1">
                              City <span className="text-destructive">*</span>
                            </label>
                            <input
                              type="text"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Chicago"
                              required={shippingMethod === "DELIVERY"}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              State <span className="text-destructive">*</span>
                            </label>
                            <input
                              type="text"
                              value={state}
                              onChange={(e) => setState(e.target.value)}
                              className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="IL"
                              required={shippingMethod === "DELIVERY"}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              ZIP Code <span className="text-destructive">*</span>
                            </label>
                            <input
                              type="text"
                              value={zipCode}
                              onChange={(e) => setZipCode(e.target.value)}
                              className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="60601"
                              required={shippingMethod === "DELIVERY"}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Country
                          </label>
                          <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            <option value="United States">United States</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pickup Location */}
                  {shippingMethod === "PICKUP" && (
                    <div className="bg-card rounded-xl shadow-md p-6 mb-6">
                      <h2 className="text-xl font-semibold text-foreground mb-4">
                        Pickup Information
                      </h2>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                        <p className="text-sm text-foreground">
                          After placing your order, the vendor will contact you with pickup location details and available times.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Preferred Pickup Location (optional)
                        </label>
                        <textarea
                          value={pickupLocation}
                          onChange={(e) => setPickupLocation(e.target.value)}
                          className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Any preferred location or notes for the vendor..."
                          rows={3}
                        />
                      </div>
                    </div>
                  )}

                  {/* Cart Validation Errors */}
                  {validationErrors.length > 0 && (
                    <div className="bg-destructive/10 dark:bg-destructive/15 border border-destructive/30 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-destructive mb-2">
                            Some items in your cart have issues:
                          </p>
                          <ul className="text-sm text-destructive space-y-1 list-disc list-inside">
                            {validationErrors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="bg-destructive/10 dark:bg-destructive/15 border border-destructive/30 text-destructive px-4 py-3 rounded-lg mb-6">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Error</p>
                          <p className="text-sm mt-1">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Continue to Payment Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || validationErrors.length > 0}
                    className="w-full py-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Continue to Payment
                      </>
                    )}
                  </button>
                </form>
              ) : (
                // Payment Step
                <div className="bg-card rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Complete your purchase securely. We accept credit cards and Cash App Pay.
                  </p>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg mb-6">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Payment Failed</p>
                          <p className="text-sm mt-1">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {clientSecret && (
                    <Elements
                      stripe={stripePromise}
                      options={{
                        clientSecret,
                        appearance,
                      }}
                    >
                      <PaymentForm
                        clientSecret={clientSecret}
                        total={total}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                        isProcessing={isProcessing}
                        setIsProcessing={setIsProcessing}
                      />
                    </Elements>
                  )}

                  {/* Back to Info Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setStep("info");
                      setError("");
                    }}
                    disabled={isProcessing}
                    className="w-full mt-4 py-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    ← Back to shipping info
                  </button>
                </div>
              )}
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl shadow-md p-6 sticky top-4">
                <h2 className="text-xl font-bold text-foreground mb-4">Order Summary</h2>

                {/* Multi-vendor notice */}
                {getVendorCount() > 1 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                    <p className="text-sm text-foreground">
                      <Building2 className="w-4 h-4 inline-block mr-1.5 text-primary" />
                      Your order includes items from <strong>{getVendorCount()} vendors</strong>
                    </p>
                  </div>
                )}

                {/* Cart Items Grouped by Vendor */}
                <div className="space-y-4 mb-4 max-h-80 overflow-y-auto">
                  {getItemsByVendor().map((vendorGroup) => (
                    <div key={vendorGroup.vendorId} className="space-y-3">
                      {/* Vendor Header */}
                      {getVendorCount() > 1 && (
                        <div className="flex items-center gap-2 py-1.5 px-2 bg-muted/50 rounded-lg -mx-1">
                          <Store className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">{vendorGroup.vendorName}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {vendorGroup.itemCount} item{vendorGroup.itemCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {/* Vendor Items */}
                      {vendorGroup.items.map((item, index) => (
                        <div
                          key={`${item.productId}-${item.variantId || "default"}-${index}`}
                          className="flex gap-3 pb-3 border-b border-border last:border-0"
                        >
                          {item.productImage ? (
                            <div className="relative w-14 h-14 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                              <Image
                                src={item.productImage}
                                alt={item.productName}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground text-sm line-clamp-2">
                              {item.productName}
                            </h3>
                            {item.variantName && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.variantName}
                              </p>
                            )}
                            {item.variationAttributes && Object.keys(item.variationAttributes).length > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {Object.entries(item.variationAttributes)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(", ")}
                              </p>
                            )}
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-muted-foreground">
                                Qty: {item.quantity}
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                ${((item.productPrice * item.quantity) / 100).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Vendor Subtotal (only show if multiple vendors) */}
                      {getVendorCount() > 1 && (
                        <div className="flex justify-between text-sm pt-1 pb-2">
                          <span className="text-muted-foreground">Vendor subtotal</span>
                          <span className="font-medium text-foreground">${(vendorGroup.subtotal / 100).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Order Totals */}
                <div className="space-y-2 pt-4 border-t border-border">
                  <div className="flex justify-between text-muted-foreground text-sm">
                    <span>Subtotal</span>
                    <span>${(subtotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-sm">
                    <div>
                      <span>Shipping</span>
                      {shippingMethod === "DELIVERY" && shippingOptions && (
                        <span className="text-xs block text-muted-foreground/70">
                          {shippingSpeed === "express" ? "Express" : "Standard"} • {shippingDays}
                        </span>
                      )}
                    </div>
                    <span className="text-right">
                      {shippingMethod === "PICKUP" ? (
                        <span className="text-success">Free</span>
                      ) : hasFreeShipping && shippingSpeed === "standard" ? (
                        <span className="text-success">Free</span>
                      ) : (
                        `$${(estimatedShipping / 100).toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-sm">
                    <span>
                      Tax {taxRate > 0 ? `(${taxRatePercent}%)` : ""}
                      {shippingMethod === "DELIVERY" && state.trim().length !== 2 && (
                        <span className="text-xs text-muted-foreground/70 ml-1">(enter state)</span>
                      )}
                    </span>
                    <span>${(tax / 100).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between text-lg font-bold text-foreground">
                    <span>Total</span>
                    <span className="text-primary">
                      ${(total / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-4 text-center">
                  By placing your order, you agree to our Terms of Service
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
      <PublicFooter />
    </>
  );
}
