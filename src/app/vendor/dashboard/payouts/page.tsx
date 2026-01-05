"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import {
  Banknote,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Building2,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

type PayoutStatus = "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | "FAILED";

const STATUS_CONFIG: Record<PayoutStatus, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: "Pending Review", color: "bg-warning/20 text-warning-foreground dark:bg-warning/20 dark:text-warning", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-info/20 text-foreground dark:bg-primary/20 dark:text-primary", icon: CheckCircle },
  PROCESSING: { label: "Processing", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300", icon: Loader2 },
  COMPLETED: { label: "Completed", color: "bg-success/20 text-success dark:bg-success/20 dark:text-success", icon: CheckCircle },
  FAILED: { label: "Failed", color: "bg-destructive/20 text-destructive dark:bg-destructive/20 dark:text-destructive", icon: XCircle },
};

const PAYOUT_METHODS = [
  { id: "bank_transfer", name: "Bank Transfer", icon: Building2, description: "Direct deposit to your bank account" },
  { id: "paypal", name: "PayPal", icon: CreditCard, description: "Transfer to your PayPal account" },
  { id: "check", name: "Check", icon: Banknote, description: "Physical check mailed to your address" },
];

export default function VendorPayoutsPage() {
  const { user } = useAuth();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("bank_transfer");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get vendor
  const vendor = useQuery(
    api.vendors.getByOwner,
    user?._id ? { ownerId: user._id as Id<"users"> } : "skip"
  );

  // Get payouts
  const payouts = useQuery(
    api.vendorPayouts.getByVendor,
    vendor?._id ? { vendorId: vendor._id } : "skip"
  );

  // Get earnings summary for available balance
  const earningsSummary = useQuery(
    api.vendorEarnings.getSummary,
    vendor?._id ? { vendorId: vendor._id } : "skip"
  );

  const requestPayout = useMutation(api.vendorPayouts.request);

  const availableBalance = earningsSummary?.availableBalance || 0;
  const minimumPayout = 2500; // $25.00 in cents
  const canRequestPayout = availableBalance >= minimumPayout;

  // Check if there's already a pending payout
  const hasPendingPayout = payouts?.some(
    (p) => p.status === "PENDING" || p.status === "APPROVED" || p.status === "PROCESSING"
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handleRequestPayout = async () => {
    if (!vendor?._id || !canRequestPayout || hasPendingPayout) return;

    setIsSubmitting(true);
    try {
      await requestPayout({
        vendorId: vendor._id,
        payoutMethod: selectedMethod,
      });
      toast.success("Payout request submitted successfully!");
      setShowRequestModal(false);
    } catch (error) {
      console.error("Payout request error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to request payout";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate stats
  const stats = {
    totalRequested: payouts?.length || 0,
    totalPaid: payouts
      ?.filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.totalAmount, 0) || 0,
    pendingAmount: payouts
      ?.filter((p) => p.status === "PENDING" || p.status === "APPROVED" || p.status === "PROCESSING")
      .reduce((sum, p) => sum + p.totalAmount, 0) || 0,
  };

  if (!vendor) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payouts</h1>
          <p className="text-muted-foreground">Request and track your payouts</p>
        </div>
        <button
          type="button"
          onClick={() => setShowRequestModal(true)}
          disabled={!canRequestPayout || hasPendingPayout}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Request Payout
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-success/20 dark:bg-success/20 rounded-lg flex items-center justify-center">
              <Banknote className="w-6 h-6 text-success" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(availableBalance)}</p>
          <p className="text-sm text-muted-foreground">Available Balance</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-warning/20 dark:bg-warning/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(stats.pendingAmount)}</p>
          <p className="text-sm text-muted-foreground">Pending Payouts</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(stats.totalPaid)}</p>
          <p className="text-sm text-muted-foreground">Total Paid Out</p>
        </div>
      </div>

      {/* Alerts */}
      {!canRequestPayout && (
        <div className="bg-warning/10 dark:bg-warning/15 border border-warning/30 dark:border-warning/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-warning-foreground dark:text-warning">
                Minimum payout not reached
              </p>
              <p className="text-sm text-warning dark:text-warning">
                You need at least {formatCurrency(minimumPayout)} available to request a payout.
                You currently have {formatCurrency(availableBalance)} available.
              </p>
            </div>
          </div>
        </div>
      )}

      {hasPendingPayout && (
        <div className="bg-info/10 dark:bg-primary/20 border border-info/30 dark:border-primary/40 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground dark:text-primary">
                Payout in progress
              </p>
              <p className="text-sm text-info dark:text-primary">
                You already have a pending payout request. Please wait for it to complete before
                requesting another.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payout History */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-foreground">Payout History</h2>
        </div>

        {payouts === undefined ? (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : payouts && payouts.length > 0 ? (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border">
              {payouts.map((payout) => {
                const statusConfig = STATUS_CONFIG[payout.status as PayoutStatus];
                const StatusIcon = statusConfig.icon;
                const method = PAYOUT_METHODS.find((m) => m.id === payout.payoutMethod);

                return (
                  <div key={payout._id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground">{payout.payoutNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(payout.createdAt)}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{method?.name || payout.payoutMethod}</span>
                      <span className="font-bold text-foreground">{formatCurrency(payout.totalAmount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Payout #</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Method</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => {
                    const statusConfig = STATUS_CONFIG[payout.status as PayoutStatus];
                    const StatusIcon = statusConfig.icon;
                    const method = PAYOUT_METHODS.find((m) => m.id === payout.payoutMethod);

                    return (
                      <tr key={payout._id} className="border-b border-border last:border-0">
                        <td className="p-4 text-sm text-foreground">{formatDate(payout.createdAt)}</td>
                        <td className="p-4 text-sm font-medium text-foreground">
                          {payout.payoutNumber}
                        </td>
                        <td className="p-4 text-sm text-foreground">{method?.name || payout.payoutMethod}</td>
                        <td className="p-4 text-sm font-bold text-foreground">
                          {formatCurrency(payout.totalAmount)}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Banknote className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No payouts yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Once you have {formatCurrency(minimumPayout)} or more available, you can request a
              payout.
            </p>
          </div>
        )}
      </div>

      {/* Request Payout Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl border border-border p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-foreground mb-2">Request Payout</h3>
            <p className="text-muted-foreground mb-6">
              Request a payout of {formatCurrency(availableBalance)} to your preferred payment
              method.
            </p>

            {/* Payout Method Selection */}
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Payout Method
              </label>
              {PAYOUT_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <label
                    key={method.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedMethod === method.id
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20"
                        : "border-border hover:border-sky-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payoutMethod"
                      value={method.id}
                      checked={selectedMethod === method.id}
                      onChange={() => setSelectedMethod(method.id)}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedMethod === method.id
                          ? "bg-sky-100 dark:bg-sky-900/50"
                          : "bg-muted"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          selectedMethod === method.id ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{method.name}</p>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-foreground">{formatCurrency(availableBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processing Time</span>
                <span className="text-foreground">3-5 business days</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestPayout}
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Request"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
