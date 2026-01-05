"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2, ArrowRight, Ticket, ShoppingBag, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [orderType, setOrderType] = useState<"ticket" | "product" | "unknown">("unknown");

  // PayPal returns token and PayerID in query params
  const token = searchParams.get("token");
  const payerId = searchParams.get("PayerID");
  const orderId = searchParams.get("orderId");

  useEffect(() => {
    // Give time for the capture to complete on the backend
    const timer = setTimeout(() => {
      setIsProcessing(false);
    }, 2000);

    // Try to determine order type from URL or localStorage
    const storedOrderType = localStorage.getItem("checkoutOrderType");
    if (storedOrderType === "ticket" || storedOrderType === "product") {
      setOrderType(storedOrderType);
      localStorage.removeItem("checkoutOrderType");
    }

    return () => clearTimeout(timer);
  }, []);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <h2 className="text-xl font-semibold">Processing your payment...</h2>
              <p className="text-muted-foreground text-center">
                Please wait while we confirm your order.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for your purchase. Your order has been confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {token && (
            <div className="text-sm text-muted-foreground text-center">
              <p>Transaction ID: {token}</p>
            </div>
          )}

          <div className="space-y-2">
            {orderType === "ticket" ? (
              <Button asChild className="w-full" size="lg">
                <Link href="/user/my-tickets">
                  <Ticket className="mr-2 h-4 w-4" />
                  View My Tickets
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : orderType === "product" ? (
              <Button asChild className="w-full" size="lg">
                <Link href="/marketplace/orders">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  View My Orders
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild className="w-full" size="lg">
                  <Link href="/user/my-tickets">
                    <Ticket className="mr-2 h-4 w-4" />
                    View My Tickets
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full" size="lg">
                  <Link href="/marketplace/orders">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    View Marketplace Orders
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}

            <Button asChild variant="ghost" className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Return to Home
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-4">
            A confirmation email has been sent to your email address.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
