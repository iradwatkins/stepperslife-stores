"use client";

import { useState, useEffect } from "react";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock, ArrowLeft, Loader2 } from "lucide-react";

// Load Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

interface StripeCheckoutProps {
  total: number; // in dollars
  connectedAccountId: string;
  platformFee: number; // in cents
  orderId?: string;
  orderNumber?: string;
  billingContact?: {
    givenName?: string;
    familyName?: string;
    email?: string;
  };
  onPaymentSuccess: (result: { paymentIntentId: string }) => void;
  onPaymentError: (error: string) => void;
  onBack: () => void;
}

function CheckoutForm({
  total,
  connectedAccountId,
  platformFee,
  orderId,
  orderNumber,
  billingContact,
  onPaymentSuccess,
  onPaymentError,
  onBack,
}: StripeCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/payment-success",
        },
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message || "Payment failed");
        onPaymentError(error.message || "Payment failed");
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onPaymentSuccess({ paymentIntentId: paymentIntent.id });
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred");
      onPaymentError(err.message || "An unexpected error occurred");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="bg-card rounded-lg border border p-4">
        <PaymentElement />
      </div>

      <div className="bg-accent border border-border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Secure Payment</p>
            <p className="text-xs text-primary mt-1">
              Your payment information is encrypted and secure. Powered by Stripe.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Pay ${total.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function StripeCheckout(props: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create payment intent
    const createPaymentIntent = async () => {
      try {
        const response = await fetch("/api/stripe/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Math.round(props.total * 100), // Convert to cents
            connectedAccountId: props.connectedAccountId,
            platformFee: props.platformFee,
            orderId: props.orderId,
            orderNumber: props.orderNumber,
            metadata: {
              customerName:
                `${props.billingContact?.givenName || ""} ${props.billingContact?.familyName || ""}`.trim(),
              customerEmail: props.billingContact?.email || "",
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create payment intent");
        }

        setClientSecret(data.clientSecret);
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || "Failed to initialize payment");
        setIsLoading(false);
        props.onPaymentError(err.message || "Failed to initialize payment");
      }
    };

    createPaymentIntent();
  }, [props.total, props.connectedAccountId, props.platformFee]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Initializing secure payment...</p>
        </div>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error || "Failed to initialize payment"}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={props.onBack} className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const elementsOptions: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#2563eb",
        colorBackground: "#ffffff",
        colorText: "#1f2937",
        colorDanger: "#dc2626",
        fontFamily: "system-ui, sans-serif",
        spacingUnit: "4px",
        borderRadius: "8px",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <CheckoutForm {...props} />
    </Elements>
  );
}
