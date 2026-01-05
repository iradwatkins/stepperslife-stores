"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, CreditCard, Check, Loader2, Smartphone } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Package {
  credits: number;
  price: number;
  popular?: boolean;
}

const PACKAGES: Package[] = [
  { credits: 500, price: 150 },
  { credits: 1000, price: 300, popular: true },
  { credits: 2500, price: 750 },
];

interface PurchaseCreditsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Inner component that uses Stripe hooks (must be inside Elements provider)
function CreditPurchaseForm({
  selectedPackage,
  userId,
  onSuccess,
  onClose,
}: {
  selectedPackage: Package;
  userId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Payment validation failed");
        setIsProcessing(false);
        return;
      }

      // Confirm the payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/organizer/credits?purchase=success`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "Payment failed");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Payment succeeded
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Payment Element - supports Card + Cash App Pay */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Payment Details</h3>
        </div>
        <div className="border border rounded-lg p-4">
          <PaymentElement
            options={{
              layout: "tabs",
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Smartphone className="w-3 h-3" />
          Cash App Pay available for US customers
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Total */}
      <div className="bg-card rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground">Credits:</span>
          <span className="font-semibold">{selectedPackage.credits} tickets</span>
        </div>
        <div className="flex items-center justify-between text-lg font-bold">
          <span>Total:</span>
          <span className="text-primary">${selectedPackage.price}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="px-6 py-2 text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isProcessing || !stripe || !elements}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>Purchase ${selectedPackage.price}</>
          )}
        </button>
      </div>
    </form>
  );
}

export function PurchaseCreditsModal({ onClose, onSuccess }: PurchaseCreditsModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<Package>(PACKAGES[1]); // Default to popular
  const [userId, setUserId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user ID
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user && data.user._id) {
          setUserId(data.user._id);
        } else {
          setError("Please log in to purchase credits");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch user:", err);
        setError("Failed to load user information");
      });
  }, []);

  // Create payment intent when user and package are selected
  useEffect(() => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    fetch("/api/stripe/create-platform-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: selectedPackage.price * 100, // Convert to cents
        productType: "CREDITS",
        userId,
        ticketQuantity: selectedPackage.credits,
        pricePerTicket: 30, // $0.30 = 30 cents
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError(data.error || "Failed to initialize payment");
        }
      })
      .catch((err) => {
        console.error("Failed to create payment intent:", err);
        setError("Failed to initialize payment. Please try again.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userId, selectedPackage]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-lg shadow-xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Purchase More Credits</h2>
          <p className="text-muted-foreground">Choose the package that fits your needs</p>
        </div>

        {/* Package Selection */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {PACKAGES.map((pkg) => (
            <button
              type="button"
              key={pkg.credits}
              onClick={() => setSelectedPackage(pkg)}
              className={`border-2 rounded-lg p-6 hover:shadow-lg transition-all text-center relative ${
                selectedPackage.credits === pkg.credits
                  ? "border-primary bg-accent"
                  : "border hover:border-primary"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                  POPULAR
                </div>
              )}
              <p className="text-3xl font-bold text-foreground mb-2">{pkg.credits}</p>
              <p className="text-sm text-muted-foreground mb-3">tickets</p>
              <p className="text-2xl font-bold text-primary mb-2">${pkg.price}</p>
              <p className="text-xs text-muted-foreground">$0.30 per ticket</p>
              {selectedPackage.credits === pkg.credits && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading payment form...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm mb-6">
            {error}
            <button
              type="button"
              onClick={onClose}
              className="block w-full mt-4 px-6 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Payment Form */}
        {!isLoading && !error && clientSecret && userId && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#0066cc",
                },
              },
            }}
          >
            <CreditPurchaseForm
              selectedPackage={selectedPackage}
              userId={userId}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          </Elements>
        )}
      </motion.div>
    </div>
  );
}
