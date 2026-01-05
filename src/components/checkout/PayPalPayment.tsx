"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    paypal?: any;
  }
}

interface PayPalPaymentProps {
  amount: number; // Total amount in cents
  platformFee?: number; // Platform fee in cents (for split payments)
  orderId?: string; // SteppersLife order ID
  description?: string;
  organizerPaypalEmail?: string; // Organizer's PayPal email (for split payments)
  organizerPaypalMerchantId?: string; // Organizer's PayPal Merchant ID
  onSuccess: (paypalOrderId: string) => void;
  onError: (error: string) => void;
}

export function PayPalPayment({
  amount,
  platformFee = 0,
  orderId,
  description,
  organizerPaypalEmail,
  organizerPaypalMerchantId,
  onSuccess,
  onError,
}: PayPalPaymentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Load PayPal SDK
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

    if (!clientId) {
      console.error("[PayPal] Client ID not configured");
      onError("PayPal is not configured");
      return;
    }

    // Check if PayPal SDK is already loaded
    if (window.paypal) {
      renderPayPalButtons();
      return;
    }

    // Load PayPal SDK script
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.async = true;
    script.onload = () => {
      renderPayPalButtons();
    };
    script.onerror = () => {
      setIsLoading(false);
      onError("Failed to load PayPal SDK");
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts before loading
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [amount, orderId]);

  const renderPayPalButtons = () => {
    if (!window.paypal) {
      setIsLoading(false);
      return;
    }

    // Clear existing buttons
    const container = document.getElementById("paypal-button-container");
    if (container) {
      container.innerHTML = "";
    }

    window.paypal
      .Buttons({
        style: {
          layout: "vertical",
          color: "gold",
          shape: "rect",
          label: "paypal",
        },
        createOrder: async () => {
          setIsProcessing(true);
          try {
            const response = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount,
                platformFee,
                orderId,
                description,
                organizerPaypalEmail,
                organizerPaypalMerchantId,
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || "Failed to create PayPal order");
            }

            return data.orderId;
          } catch (error: any) {
            setIsProcessing(false);
            onError(error.message || "Failed to create PayPal order");
            throw error;
          }
        },
        onApprove: async (data: { orderID: string }) => {
          try {
            const response = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paypalOrderId: data.orderID,
                steppersLifeOrderId: orderId,
              }),
            });

            const captureData = await response.json();

            if (!response.ok) {
              throw new Error(captureData.error || "Failed to capture payment");
            }

            if (captureData.status === "COMPLETED") {
              onSuccess(data.orderID);
            } else {
              onError("Payment was not completed");
            }
          } catch (error: any) {
            onError(error.message || "Failed to capture payment");
          } finally {
            setIsProcessing(false);
          }
        },
        onCancel: () => {
          setIsProcessing(false);
          console.log("[PayPal] Payment cancelled by user");
        },
        onError: (err: any) => {
          setIsProcessing(false);
          console.error("[PayPal] Button error:", err);
          onError("PayPal encountered an error");
        },
      })
      .render("#paypal-button-container")
      .then(() => {
        setIsLoading(false);
      })
      .catch((err: any) => {
        console.error("[PayPal] Failed to render buttons:", err);
        setIsLoading(false);
        onError("Failed to load PayPal buttons");
      });
  };

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading PayPal...</span>
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 bg-card/80 flex items-center justify-center z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Processing payment...</span>
        </div>
      )}

      <div
        id="paypal-button-container"
        className={isLoading ? "hidden" : ""}
      ></div>

      <p className="text-xs text-muted-foreground text-center">
        Secure payment powered by PayPal
      </p>
    </div>
  );
}
