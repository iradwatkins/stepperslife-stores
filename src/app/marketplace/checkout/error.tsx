"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, ArrowLeft, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function MarketplaceCheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console and potentially to error tracking service
    console.error("[Marketplace Checkout Error]", error);
  }, [error]);

  // Determine if this is a payment-related error
  const isPaymentError = error.message?.toLowerCase().includes("payment") ||
    error.message?.toLowerCase().includes("stripe") ||
    error.message?.toLowerCase().includes("paypal");

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          {isPaymentError ? "Payment Error" : "Checkout Error"}
        </h2>

        <p className="text-muted-foreground mb-6">
          {isPaymentError
            ? "There was a problem processing your payment. Your card has not been charged."
            : "Something went wrong during checkout. Please try again."}
        </p>

        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-left">
            <p className="text-xs font-mono text-destructive break-words">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-destructive mt-1">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </Button>

          <Link href="/marketplace" className="block">
            <Button variant="outline" className="w-full flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Marketplace
            </Button>
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            If this problem persists, please{" "}
            <Link href="/help" className="text-primary hover:underline">
              contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
