"use client";

import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { ProviderDashboardNav } from "@/components/services/ProviderDashboardNav";
import Link from "next/link";
import {
  Loader2,
  LogIn,
  ArrowRight,
  AlertCircle,
  Clock,
} from "lucide-react";

export default function ProviderDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const provider = useQuery(api.services.getMyProvider);
  const isLoading = authLoading || provider === undefined;

  // Loading state
  if (isLoading) {
    return (
      <>
        <PublicHeader />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <>
        <PublicHeader />
        <main className="min-h-screen bg-background py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <LogIn className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Sign In Required
              </h1>
              <p className="text-muted-foreground mb-8">
                Please sign in to access your provider dashboard.
              </p>
              <Link
                href={`/login?redirect=${encodeURIComponent("/service-provider/dashboard")}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Sign In to Continue
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  // No provider record
  if (!provider) {
    return (
      <>
        <PublicHeader />
        <main className="min-h-screen bg-background py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                No Provider Account
              </h1>
              <p className="text-muted-foreground mb-8">
                You need to apply as a service provider first.
              </p>
              <Link
                href="/service-provider/apply"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Apply Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Pending approval
  if (provider.status === "PENDING") {
    return (
      <>
        <PublicHeader />
        <main className="min-h-screen bg-background py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Application Under Review
              </h1>
              <p className="text-muted-foreground mb-8">
                Your application is being reviewed. You&apos;ll have access to the dashboard once approved.
              </p>
              <Link
                href="/service-provider/status"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Check Status
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Rejected or suspended
  if (provider.status === "REJECTED" || provider.status === "SUSPENDED") {
    return (
      <>
        <PublicHeader />
        <main className="min-h-screen bg-background py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                {provider.status === "REJECTED" ? "Application Not Approved" : "Account Suspended"}
              </h1>
              <p className="text-muted-foreground mb-8">
                {provider.status === "REJECTED"
                  ? "Unfortunately, your application was not approved."
                  : "Your account has been suspended. Please contact support."}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Contact Support
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Approved - show dashboard
  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-background">
        <ProviderDashboardNav
          providerName={provider.businessName || provider.name}
          providerStatus={provider.status}
        />

        {/* Main content area */}
        <main className="md:ml-64 pt-16 md:pt-0">
          {/* Mobile spacing for nav */}
          <div className="md:hidden h-16" />

          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
