"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Trash2, Check } from "lucide-react";
import Link from "next/link";

export default function PaymentMethodsPage() {
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  // Mock data - will be replaced with actual Convex query
  const paymentMethods: any[] = [];

  const getCardIcon = (brand: string) => {
    // In production, would return actual card brand icons
    return <CreditCard className="h-6 w-6" />;
  };

  const formatCardNumber = (last4: string) => {
    return `•••• •••• •••• ${last4}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/user/profile" className="hover:text-foreground">
            Profile
          </Link>
          <span>/</span>
          <span>Payment Methods</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Methods</h1>
        <p className="text-muted-foreground mt-2">
          Manage your saved payment methods for faster checkout
        </p>
      </div>

      {/* Add Payment Method Button */}
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Add Payment Method
      </Button>

      {/* Payment Methods List */}
      {paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No saved payment methods</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add a payment method to make checkout faster and more convenient
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Payment Method
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paymentMethods.map((method: any) => (
            <Card key={method.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded">
                      {getCardIcon(method.brand)}
                    </div>
                    <div>
                      <CardTitle className="text-base capitalize">
                        {method.brand}
                      </CardTitle>
                      {method.isDefault && (
                        <div className="flex items-center gap-1 mt-1">
                          <Check className="h-3 w-3 text-success" />
                          <span className="text-xs text-success">Default</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="font-mono text-sm">
                    {formatCardNumber(method.last4)}
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Expires {method.expMonth}/{method.expYear}</span>
                  </div>
                  {!method.isDefault && (
                    <Button variant="outline" size="sm" className="w-full">
                      Set as Default
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Security Notice */}
      <Card className="border-primary bg-primary/10">
        <CardHeader>
          <CardTitle className="text-sm">Secure Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All payment information is encrypted and securely stored. We use Stripe for payment
            processing and never store your full card details on our servers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
