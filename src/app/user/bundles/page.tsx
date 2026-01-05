"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { format } from "date-fns";
import {
  Package,
  Calendar,
  MapPin,
  Ticket,
  DollarSign,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
  REFUNDED: { label: "Refunded", color: "bg-gray-100 text-gray-700", icon: XCircle },
};

export default function UserBundlesPage() {
  const purchases = useQuery(api.bundles.queries.getUserBundlePurchases, {});

  if (purchases === undefined) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/user/dashboard"
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Bundles</h1>
            <p className="text-sm text-gray-600">
              Your purchased ticket bundles and passes
            </p>
          </div>
        </div>
      </div>

      {/* Purchases List */}
      {purchases.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900">No bundles yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                When you purchase ticket bundles, they&apos;ll appear here.
              </p>
              <Link href="/events">
                <Button className="mt-4">Browse Events</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => {
            const status = statusConfig[purchase.status] || statusConfig.COMPLETED;
            const StatusIcon = status.icon;

            return (
              <Card key={purchase._id} className="overflow-hidden">
                <CardHeader className="border-b bg-gray-50 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-lg">
                        {purchase.bundle?.name || "Bundle"}
                      </CardTitle>
                    </div>
                    <Badge className={cn("gap-1", status.color)}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="py-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Purchase Details */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Purchased{" "}
                          {purchase.purchaseDate
                            ? format(purchase.purchaseDate, "MMM d, yyyy 'at' h:mm a")
                            : "Unknown date"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Ticket className="h-4 w-4" />
                        <span>
                          {purchase.ticketIds.length} ticket
                          {purchase.ticketIds.length !== 1 ? "s" : ""} ×{" "}
                          {purchase.quantity} bundle
                          {purchase.quantity !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          Total: ${(purchase.totalPaidCents / 100).toFixed(2)}
                        </span>
                        {purchase.bundle?.savings && purchase.bundle.savings > 0 && (
                          <Badge variant="secondary" className="text-green-600">
                            Saved ${(purchase.bundle.savings / 100).toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Events */}
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-700">
                        Included Events:
                      </p>
                      <div className="space-y-2">
                        {purchase.events.map((event, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-sm text-gray-600"
                          >
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                              <p className="font-medium">{event?.name}</p>
                              {event?.startDate && (
                                <p className="text-xs text-gray-500">
                                  {format(event.startDate, "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <div className="mt-4 flex justify-end border-t pt-4">
                    <Link href={`/user/bundles/${purchase._id}`}>
                      <Button variant="outline" size="sm">
                        View Tickets
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
