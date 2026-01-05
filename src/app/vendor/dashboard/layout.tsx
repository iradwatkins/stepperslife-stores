"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { VendorSidebar } from "@/components/layout/VendorSidebar";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Id } from "@/convex/_generated/dataModel";
import { AlertCircle, Clock, Store } from "lucide-react";
import Link from "next/link";

export default function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Get vendor for current user
  const vendor = useQuery(
    api.vendors.getByOwner,
    user?._id ? { ownerId: user._id as Id<"users"> } : "skip"
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent("/vendor/dashboard")}`);
    }
  }, [authLoading, isAuthenticated, router]);

  // Loading state
  if (authLoading || vendor === undefined) {
    return (
      <>
        <PublicHeader />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </>
    );
  }

  // No vendor found - show apply prompt
  if (!vendor) {
    return (
      <>
        <PublicHeader />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto bg-card rounded-2xl shadow-lg p-8 text-center border border-border">
              <div className="w-16 h-16 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Store className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Become a Vendor
              </h1>
              <p className="text-muted-foreground mb-8">
                You don't have a vendor account yet. Apply to become a vendor and start
                selling your products on SteppersLife.
              </p>
              <Link
                href="/vendor/apply"
                className="block w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Apply to Sell
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Vendor pending approval
  if (vendor.status === "PENDING") {
    return (
      <>
        <PublicHeader />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto bg-card rounded-2xl shadow-lg p-8 text-center border border-border">
              <div className="w-16 h-16 bg-warning/20 dark:bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-warning" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Application Under Review
              </h1>
              <p className="text-muted-foreground mb-6">
                Your vendor application for <strong>{vendor.name}</strong> is currently
                being reviewed. We'll notify you by email once it's been approved.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 text-left text-sm">
                <p className="font-medium text-foreground mb-2">Application Details:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>Store Name: {vendor.name}</li>
                  <li>Submitted: {new Date(vendor.createdAt).toLocaleDateString()}</li>
                  <li>Status: Pending Review</li>
                </ul>
              </div>
              <Link
                href="/marketplace"
                className="block w-full mt-6 px-6 py-3 border border-border rounded-lg font-semibold hover:bg-muted transition-colors"
              >
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Vendor rejected
  if (vendor.status === "REJECTED") {
    return (
      <>
        <PublicHeader />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto bg-card rounded-2xl shadow-lg p-8 text-center border border-border">
              <div className="w-16 h-16 bg-destructive/20 dark:bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Application Not Approved
              </h1>
              <p className="text-muted-foreground mb-6">
                Unfortunately, your vendor application for <strong>{vendor.name}</strong>{" "}
                was not approved.
              </p>
              {vendor.rejectionReason && (
                <div className="bg-destructive/10 dark:bg-destructive/15 rounded-lg p-4 text-left text-sm mb-6">
                  <p className="font-medium text-destructive dark:text-destructive mb-1">
                    Reason:
                  </p>
                  <p className="text-destructive dark:text-destructive">
                    {vendor.rejectionReason}
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                If you believe this was an error, please contact our support team.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Vendor suspended
  if (vendor.status === "SUSPENDED") {
    return (
      <>
        <PublicHeader />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto bg-card rounded-2xl shadow-lg p-8 text-center border border-border">
              <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Account Suspended
              </h1>
              <p className="text-muted-foreground mb-6">
                Your vendor account for <strong>{vendor.name}</strong> has been suspended.
              </p>
              {vendor.rejectionReason && (
                <div className="bg-primary/5 dark:bg-primary/20 rounded-lg p-4 text-left text-sm mb-6">
                  <p className="font-medium text-foreground dark:text-primary-foreground mb-1">
                    Reason:
                  </p>
                  <p className="text-primary dark:text-primary">
                    {vendor.rejectionReason}
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Please contact our support team to resolve this issue.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Approved vendor - show dashboard
  return (
    <>
      <PublicHeader />
      <div className="flex min-h-screen bg-background">
        <VendorSidebar vendorName={vendor.name} vendorSlug={vendor.slug} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </>
  );
}
