"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { MarketplaceSubNav } from "@/components/layout/MarketplaceSubNav";
import { CheckCircle, Package, Truck, Store, Mail, Phone, MapPin, Loader2, ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function OrderConfirmationPage() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");

  const order = useQuery(
    api.productOrders.queries.getOrderByNumber,
    orderNumber ? { orderNumber } : "skip"
  );

  if (!orderNumber) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              No Order Found
            </h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find your order. Please check your email for confirmation.
            </p>
            <Link
              href="/marketplace"
              className="block w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  if (order === undefined) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your order...</p>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  if (order === null) {
    return (
      <>
        <PublicHeader />
        <MarketplaceSubNav />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Order Not Found
            </h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find an order with number {orderNumber}.
            </p>
            <Link
              href="/marketplace"
              className="block w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <PublicHeader />
      <MarketplaceSubNav />
      <div className="min-h-screen bg-background">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-success/20 dark:bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-success" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Order Placed Successfully!
            </h1>
            <p className="text-muted-foreground">
              Thank you for your order. We've received your request.
            </p>
          </div>

          {/* Order Number Card */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-8 text-center">
            <p className="text-sm text-muted-foreground mb-1">Order Number</p>
            <p className="text-2xl font-bold text-primary">{order.orderNumber}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Save this number for your records
            </p>
          </div>

          {/* Order Details */}
          <div className="bg-card rounded-xl shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Order Details</h2>
            </div>

            {/* Items */}
            <div className="p-6 border-b border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Items Ordered</h3>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-4">
                    {/* Product Image */}
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                      {item.productImage ? (
                        <Image
                          src={item.productImage}
                          alt={item.productName}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className="text-sm text-muted-foreground">{item.variantName}</p>
                      )}
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    {/* Price */}
                    <p className="font-medium text-foreground">
                      ${((item.price * item.quantity) / 100).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="p-6 border-b border-border bg-muted/30">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">${(order.subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-foreground">
                    {order.shippingCost === 0 ? (
                      <span className="text-success">Free</span>
                    ) : (
                      `$${(order.shippingCost / 100).toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-foreground">${(order.taxAmount / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">${(order.totalAmount / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Shipping/Pickup Info */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3 mb-4">
                {order.shippingCost === 0 ? (
                  <>
                    <Store className="w-5 h-5 text-primary" />
                    <h3 className="font-medium text-foreground">Pickup Order</h3>
                  </>
                ) : (
                  <>
                    <Truck className="w-5 h-5 text-primary" />
                    <h3 className="font-medium text-foreground">Delivery Order</h3>
                  </>
                )}
              </div>

              {order.shippingAddress && order.shippingCost > 0 && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>{order.shippingAddress.name}</p>
                    <p>{order.shippingAddress.address1}</p>
                    {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                    </p>
                  </div>
                </div>
              )}

              {order.shippingCost === 0 && (
                <p className="text-sm text-muted-foreground">
                  The vendor will contact you with pickup location and time details.
                </p>
              )}
            </div>

            {/* Contact Info */}
            <div className="p-6">
              <h3 className="font-medium text-foreground mb-4">Contact Information</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{order.customerEmail}</span>
                </div>
                {order.customerPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{order.customerPhone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-warning/10 dark:bg-warning/20 border border-warning/30 dark:border-warning/40 rounded-xl p-6 mb-8">
            <h3 className="font-semibold text-foreground dark:text-warning mb-3">
              What's Next?
            </h3>
            <ul className="space-y-2 text-sm text-warning dark:text-warning">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>The vendor will receive your order and begin processing it.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>You'll be contacted via email or phone with delivery/pickup details.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>Payment will be collected upon delivery or pickup.</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={`/marketplace/orders?email=${encodeURIComponent(order.customerEmail)}`}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold text-center hover:bg-primary/90 transition-colors"
            >
              View My Orders
            </Link>
            <Link
              href="/marketplace"
              className="flex-1 px-6 py-3 border border-input rounded-lg font-semibold text-center text-foreground hover:bg-accent transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </main>
      </div>
      <PublicFooter />
    </>
  );
}
