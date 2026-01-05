"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Banknote,
  ArrowRight,
  Filter,
} from "lucide-react";

type EarningStatus = "PENDING" | "AVAILABLE" | "PROCESSING" | "PAID" | "REFUNDED";

const STATUS_CONFIG: Record<EarningStatus, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-warning/20 text-warning-foreground dark:bg-warning/20 dark:text-warning" },
  AVAILABLE: { label: "Available", color: "bg-success/20 text-success dark:bg-success/20 dark:text-success" },
  PROCESSING: { label: "Processing", color: "bg-info/20 text-foreground dark:bg-primary/20 dark:text-primary" },
  PAID: { label: "Paid", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300" },
  REFUNDED: { label: "Refunded", color: "bg-destructive/20 text-destructive dark:bg-destructive/20 dark:text-destructive" },
};

export default function VendorEarningsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<EarningStatus | "">("");

  // Get vendor
  const vendor = useQuery(
    api.vendors.getByOwner,
    user?._id ? { ownerId: user._id as Id<"users"> } : "skip"
  );

  // Get earnings
  const earnings = useQuery(
    api.vendorEarnings.getByVendor,
    vendor?._id
      ? {
          vendorId: vendor._id,
          status: statusFilter || undefined,
        }
      : "skip"
  );

  // Get earnings summary
  const summary = useQuery(
    api.vendorEarnings.getSummary,
    vendor?._id ? { vendorId: vendor._id } : "skip"
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Earnings</h1>
        <p className="text-muted-foreground">Track your sales earnings and commission</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-success/20 dark:bg-success/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {formatCurrency(summary?.totalEarnings || 0)}
          </p>
          <p className="text-sm text-muted-foreground">Total Earnings</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
              <Banknote className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {formatCurrency(summary?.availableBalance || 0)}
          </p>
          <p className="text-sm text-muted-foreground">Available for Payout</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-warning/20 dark:bg-warning/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {formatCurrency(summary?.pendingEarnings || 0)}
          </p>
          <p className="text-sm text-muted-foreground">Pending Clearance</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-info/20 dark:bg-primary/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {formatCurrency(summary?.paidEarnings || 0)}
          </p>
          <p className="text-sm text-muted-foreground">Total Paid Out</p>
        </div>
      </div>

      {/* Request Payout CTA */}
      {(summary?.availableBalance || 0) >= 2500 && (
        <div className="bg-gradient-to-r from-primary to-primary/90 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-white">
              <h3 className="text-lg font-bold mb-1">Ready for Payout</h3>
              <p className="text-sky-100">
                You have {formatCurrency(summary?.availableBalance || 0)} available for withdrawal
              </p>
            </div>
            <Link
              href="/vendor/dashboard/payouts"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-lg font-bold hover:bg-sky-50 transition-colors"
            >
              Request Payout
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      )}

      {/* Commission Info */}
      <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sky-900 dark:text-sky-100 mb-1">
              How Earnings Work
            </h3>
            <p className="text-sm text-sky-800 dark:text-sky-200">
              You earn <strong>85%</strong> of each sale (SteppersLife takes a 15% commission).
              Earnings become available for payout after orders are completed.
              Minimum payout is <strong>$25.00</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EarningStatus | "")}
            className="px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="AVAILABLE">Available</option>
            <option value="PROCESSING">Processing</option>
            <option value="PAID">Paid</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
      </div>

      {/* Earnings List */}
      {earnings === undefined ? (
        <div className="bg-card rounded-xl border border-border p-8 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : earnings && earnings.length > 0 ? (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border">
            {earnings.map((earning) => {
              const statusConfig = STATUS_CONFIG[earning.status as EarningStatus];
              return (
                <div key={earning._id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground">{earning.orderNumber || "-"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(earning.createdAt)}</p>
                    </div>
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Sale Amount</p>
                      <p className="font-medium">{formatCurrency(earning.grossAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Commission</p>
                      <p className="text-muted-foreground">-{formatCurrency(earning.commissionAmount)} ({earning.commissionRate}%)</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Your Earnings</span>
                      <span className="font-bold text-success">{formatCurrency(earning.netAmount)}</span>
                    </div>
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
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Order</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Sale Amount</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Commission</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Your Earnings</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((earning) => {
                  const statusConfig = STATUS_CONFIG[earning.status as EarningStatus];
                  return (
                    <tr key={earning._id} className="border-b border-border last:border-0">
                      <td className="p-4 text-sm text-foreground">
                        {formatDate(earning.createdAt)}
                      </td>
                      <td className="p-4 text-sm text-foreground font-medium">
                        {earning.orderNumber || "-"}
                      </td>
                      <td className="p-4 text-sm text-foreground">
                        {formatCurrency(earning.grossAmount)}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        -{formatCurrency(earning.commissionAmount)} ({earning.commissionRate}%)
                      </td>
                      <td className="p-4 text-sm font-bold text-success">
                        {formatCurrency(earning.netAmount)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">No earnings yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            When customers purchase your products, your earnings will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
