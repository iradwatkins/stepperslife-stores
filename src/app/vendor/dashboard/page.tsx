"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Plus,
  ArrowRight,
} from "lucide-react";

export default function VendorDashboardPage() {
  const { user } = useAuth();

  // Get vendor
  const vendor = useQuery(
    api.vendors.getByOwner,
    user?._id ? { ownerId: user._id as Id<"users"> } : "skip"
  );

  // Get earnings summary
  const earningsSummary = useQuery(
    api.vendorEarnings.getSummary,
    vendor?._id ? { vendorId: vendor._id } : "skip"
  );

  // Get recent earnings
  const recentEarnings = useQuery(
    api.vendorEarnings.getRecent,
    vendor?._id ? { vendorId: vendor._id, limit: 5 } : "skip"
  );

  if (!vendor) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const stats = [
    {
      name: "Products",
      value: vendor.totalProducts || 0,
      icon: Package,
      href: "/vendor/dashboard/products",
      color: "bg-info/20 dark:bg-primary/20 text-primary",
    },
    {
      name: "Total Sales",
      value: `$${((vendor.totalSales || 0) / 100).toFixed(2)}`,
      icon: ShoppingCart,
      href: "/vendor/dashboard/orders",
      color: "bg-success/20 dark:bg-success/20 text-success",
    },
    {
      name: "Available Balance",
      value: `$${((earningsSummary?.availableBalance || 0) / 100).toFixed(2)}`,
      icon: DollarSign,
      href: "/vendor/dashboard/earnings",
      color: "bg-sky-100 dark:bg-sky-900/30 text-primary",
    },
    {
      name: "Total Earnings",
      value: `$${((vendor.totalEarnings || 0) / 100).toFixed(2)}`,
      icon: TrendingUp,
      href: "/vendor/dashboard/earnings",
      color: "bg-primary/10 dark:bg-primary/20 text-primary",
    },
  ];

  return (
    <div className="p-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Welcome back, {vendor.contactName}!
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your store today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.name}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Add Product Card */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/vendor/dashboard/products/create"
              className="flex items-center justify-between p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Add New Product</p>
                  <p className="text-sm text-muted-foreground">List a new item for sale</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </Link>

            <Link
              href="/vendor/dashboard/payouts"
              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Request Payout</p>
                  <p className="text-sm text-muted-foreground">
                    ${((earningsSummary?.availableBalance || 0) / 100).toFixed(2)} available
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          </div>
        </div>

        {/* Recent Earnings */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Recent Earnings</h2>
            <Link
              href="/vendor/dashboard/earnings"
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          </div>

          {recentEarnings && recentEarnings.length > 0 ? (
            <div className="space-y-3">
              {recentEarnings.map((earning) => (
                <div
                  key={earning._id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {earning.orderNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(earning.orderDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-success">
                      +${(earning.netAmount / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">{earning.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No earnings yet</p>
              <p className="text-sm">Add products to start selling!</p>
            </div>
          )}
        </div>
      </div>

      {/* Earnings Summary */}
      {earningsSummary && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Earnings Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-warning/10 dark:bg-warning/15 rounded-lg">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-warning">
                ${(earningsSummary.pendingEarnings / 100).toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-success/10 dark:bg-success/15 rounded-lg">
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-xl font-bold text-success">
                ${(earningsSummary.availableBalance / 100).toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-info/10 dark:bg-primary/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Processing</p>
              <p className="text-xl font-bold text-primary">
                ${(earningsSummary.processingEarnings / 100).toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Paid Out</p>
              <p className="text-xl font-bold text-primary">
                ${(earningsSummary.paidEarnings / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
