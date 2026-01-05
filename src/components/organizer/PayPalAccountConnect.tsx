"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Loader2, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

interface PayPalAccountConnectProps {
  onConnected?: () => void;
  showDisconnect?: boolean;
}

export function PayPalAccountConnect({
  onConnected,
  showDisconnect = true,
}: PayPalAccountConnectProps) {
  const [paypalEmail, setPaypalEmail] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = useQuery(api.users.queries.getCurrentUser);

  const isConnected = !!currentUser?.paypalMerchantId;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!paypalEmail) {
      setError("Please enter your PayPal email");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(paypalEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!currentUser?._id) {
      setError("Please log in to connect your PayPal account");
      return;
    }

    setIsConnecting(true);

    try {
      const response = await fetch("/api/paypal/connect-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser._id,
          paypalEmail: paypalEmail,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to connect PayPal account");
      }

      toast.success("PayPal account connected successfully!");
      setPaypalEmail("");
      onConnected?.();
    } catch (err: any) {
      console.error("PayPal connect error:", err);
      setError(err.message || "Failed to connect PayPal account");
      toast.error(err.message || "Failed to connect PayPal account");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!currentUser?._id) return;

    setIsDisconnecting(true);

    try {
      const response = await fetch("/api/paypal/connect-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser._id,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to disconnect PayPal account");
      }

      toast.success("PayPal account disconnected");
    } catch (err: any) {
      console.error("PayPal disconnect error:", err);
      toast.error(err.message || "Failed to disconnect PayPal account");
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isConnected) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#003087">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.771.771 0 0 1 .76-.654h6.536c2.96 0 4.95 1.585 4.95 4.202 0 3.538-3.196 5.707-6.545 5.707H8.188a.641.641 0 0 0-.633.543l-.479 3.59-.436 2.974a.39.39 0 0 1-.385.329h-.68a.39.39 0 0 1-.385-.329l-.114-.745zm6.17-14.404c0 1.614-1.312 2.925-2.93 2.925H7.972l.706-5.274h2.344c1.214 0 2.224.99 2.224 2.349z"/>
            </svg>
            PayPal Connected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/20 rounded-lg mb-4">
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Account connected</p>
              <p className="text-sm text-muted-foreground">
                {currentUser?.paypalMerchantId}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Customers can pay with PayPal and funds will be sent to this account.
          </p>

          {showDisconnect && (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="w-full"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Disconnect PayPal
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#003087">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.771.771 0 0 1 .76-.654h6.536c2.96 0 4.95 1.585 4.95 4.202 0 3.538-3.196 5.707-6.545 5.707H8.188a.641.641 0 0 0-.633.543l-.479 3.59-.436 2.974a.39.39 0 0 1-.385.329h-.68a.39.39 0 0 1-.385-.329l-.114-.745zm6.17-14.404c0 1.614-1.312 2.925-2.93 2.925H7.972l.706-5.274h2.344c1.214 0 2.224.99 2.224 2.349z"/>
          </svg>
          Connect PayPal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleConnect}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="paypal-email">PayPal Email</Label>
              <Input
                id="paypal-email"
                type="email"
                placeholder="your@email.com"
                value={paypalEmail}
                onChange={(e) => {
                  setPaypalEmail(e.target.value);
                  setError(null);
                }}
                disabled={isConnecting}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the email associated with your PayPal account
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="bg-accent border border-border rounded-lg p-3">
              <p className="text-sm text-foreground mb-2">
                <strong>Works with any PayPal account:</strong>
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-success" />
                  Personal PayPal accounts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-success" />
                  Business PayPal accounts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-success" />
                  Receive payments directly to your account
                </li>
              </ul>
            </div>

            <Button
              type="submit"
              disabled={isConnecting || !currentUser}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                "Connect PayPal Account"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By connecting, you agree to receive payments via PayPal.{" "}
              <a
                href="https://www.paypal.com/us/webapps/mpp/merchant-fees"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                PayPal fees apply
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
