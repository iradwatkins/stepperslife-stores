"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, ShoppingBag, Search, CheckCircle, Clock, XCircle, Truck, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function MyOrdersPage() {
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Get product orders by user's email
  const productOrders = useQuery(
    api.productOrders.queries.getOrdersByEmail,
    currentUser?.email ? { email: currentUser.email } : "skip"
  );

  // Timeout fallback - after 10 seconds, show error state
  const isLoading = currentUser === undefined || (currentUser?.email && productOrders === undefined);

  useEffect(() => {
    if (!isLoading) {
      return;
    }
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Filter orders by search term
  const filteredOrders = productOrders?.filter((order) =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.items.some((item) =>
      item.productName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) ?? [];

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getFulfillmentStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return (
          <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-success/10 text-success">
            <CheckCircle className="h-3 w-3" />
            Delivered
          </span>
        );
      case "SHIPPED":
        return (
          <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-info/100/10 text-primary">
            <Truck className="h-3 w-3" />
            Shipped
          </span>
        );
      case "PROCESSING":
        return (
          <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-sky-500/10 text-primary">
            <Clock className="h-3 w-3" />
            Processing
          </span>
        );
      case "PENDING":
        return (
          <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-warning/10 text-warning">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case "CANCELLED":
        return (
          <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-destructive/10 text-destructive">
            <XCircle className="h-3 w-3" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-muted text-foreground">
            {status}
          </span>
        );
    }
  };

  // Calculate stats from orders
  const totalOrders = filteredOrders.length;
  const totalSpent = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalItems = filteredOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, item) => s + item.quantity, 0),
    0
  );

  // Show loading state
  if (isLoading) {
    if (loadingTimeout) {
      return (
        <div className="p-6 space-y-6">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Connection Issue
            </h3>
            <p className="text-muted-foreground mb-4">
              Unable to load your orders. Please check your connection and try again.
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  // User not logged in
  if (!currentUser) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">
              Please sign in to view your orders
            </p>
            <Button asChild className="mt-4">
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <p className="text-muted-foreground mt-2">
          Complete history of your marketplace purchases
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold mt-1">{totalOrders}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold mt-1">${(totalSpent / 100).toFixed(2)}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Items Ordered</p>
                <p className="text-2xl font-bold mt-1">{totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by order number or product name..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">
              {searchTerm ? "No orders found" : "No orders yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm
                ? "Try adjusting your search"
                : "Your order history will appear here after making purchases"}
            </p>
            {!searchTerm && (
              <Button asChild>
                <Link href="/marketplace">Browse Marketplace</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-4 border-b">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        Order #{order.orderNumber}
                      </h3>
                      {getFulfillmentStatusBadge(order.fulfillmentStatus)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">${(order.totalAmount / 100).toFixed(2)}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3 mb-4">
                  {order.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          {item.variantName && (
                            <p className="text-xs text-muted-foreground">{item.variantName}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} × ${(item.price / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <p className="font-medium">
                        ${((item.quantity * item.price) / 100).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Shipping Info */}
                {order.trackingNumber && (
                  <div className="bg-muted/50 rounded-lg p-3 mb-4">
                    <p className="text-sm">
                      <span className="font-medium">Tracking: </span>
                      {order.trackingUrl ? (
                        <a
                          href={order.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {order.trackingNumber}
                        </a>
                      ) : (
                        <span className="font-mono">{order.trackingNumber}</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/marketplace/order-confirmation?orderNumber=${order.orderNumber}`}>
                      View Details
                    </Link>
                  </Button>
                  {order.fulfillmentStatus === "DELIVERED" && (
                    <Button variant="outline" size="sm">
                      Request Support
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
