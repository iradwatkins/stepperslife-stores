"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams } from "next/navigation";
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
  QrCode,
  Copy,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
  REFUNDED: { label: "Refunded", color: "bg-gray-100 text-gray-700", icon: XCircle },
};

const ticketStatusConfig: Record<string, { label: string; color: string }> = {
  VALID: { label: "Valid", color: "bg-green-100 text-green-700" },
  USED: { label: "Used", color: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700" },
  TRANSFERRED: { label: "Transferred", color: "bg-blue-100 text-blue-700" },
};

export default function BundlePurchaseDetailPage() {
  const params = useParams();
  const purchaseId = params.purchaseId as string;
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const purchase = useQuery(api.bundles.queries.getBundlePurchaseById, {
    purchaseId: purchaseId as Id<"bundlePurchases">,
  });

  const copyTicketCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Ticket code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (purchase === undefined) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (purchase === null) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900">
                Purchase not found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                This bundle purchase doesn&apos;t exist or you don&apos;t have access to it.
              </p>
              <Link href="/user/bundles">
                <Button className="mt-4" variant="outline">
                  Back to My Bundles
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[purchase.status] || statusConfig.COMPLETED;
  const StatusIcon = status.icon;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/user/bundles"
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to My Bundles
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {purchase.bundle?.name || "Bundle Purchase"}
              </h1>
              <p className="text-sm text-gray-600">
                {purchase.bundle?.description}
              </p>
            </div>
          </div>
          <Badge className={cn("gap-1", status.color)}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
      </div>

      {/* Purchase Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Purchase Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Purchase Date:</span>
                <span className="font-medium">
                  {purchase.purchaseDate
                    ? format(purchase.purchaseDate, "MMM d, yyyy 'at' h:mm a")
                    : "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Ticket className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Tickets:</span>
                <span className="font-medium">
                  {purchase.tickets.length} ticket
                  {purchase.tickets.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Total Paid:</span>
                <span className="font-medium">
                  ${(purchase.totalPaidCents / 100).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {purchase.bundle?.regularPrice && purchase.bundle?.savings && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Regular Price:</span>
                    <span className="text-gray-400 line-through">
                      ${(purchase.bundle.regularPrice / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <span>You Saved:</span>
                    <span className="font-medium">
                      ${(purchase.bundle.savings / 100).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Payment ID:</span>
                <span className="font-mono text-xs">{purchase.paymentId}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events */}
      {purchase.events.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Included Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {purchase.events.map((event, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />
                  <div>
                    <p className="font-medium">{event?.name}</p>
                    {event?.startDate && (
                      <p className="text-sm text-gray-600">
                        {format(event.startDate, "EEEE, MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                    {event?.location && (
                      <p className="text-sm text-gray-500">
                        {typeof event.location === "string"
                          ? event.location
                          : `${event.location.city}, ${event.location.state}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {purchase.tickets.map((ticket, idx) => {
              const ticketStatus =
                ticketStatusConfig[ticket?.status || "VALID"] ||
                ticketStatusConfig.VALID;

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                      <QrCode className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {ticket?.tierName || "Ticket"} #{idx + 1}
                      </p>
                      <p className="text-sm text-gray-600">
                        {ticket?.eventName}
                        {ticket?.eventDate && (
                          <span className="text-gray-400">
                            {" "}
                            • {format(ticket.eventDate, "MMM d")}
                          </span>
                        )}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">
                          {ticket?.ticketCode}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            ticket?.ticketCode && copyTicketCode(ticket.ticketCode)
                          }
                        >
                          {copiedCode === ticket?.ticketCode ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Badge className={ticketStatus.color}>{ticketStatus.label}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
