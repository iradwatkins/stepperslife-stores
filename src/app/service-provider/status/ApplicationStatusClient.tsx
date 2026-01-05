"use client";

import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  LogIn,
  ArrowRight,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  Award,
  Calendar,
  FileText,
  ExternalLink,
} from "lucide-react";

// Status configuration
const STATUS_CONFIG = {
  PENDING: {
    icon: Clock,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    border: "border-yellow-200 dark:border-yellow-800",
    label: "Pending Review",
    description: "Your application is being reviewed by our team. We'll notify you once a decision is made.",
  },
  APPROVED: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
    border: "border-green-200 dark:border-green-800",
    label: "Approved",
    description: "Congratulations! Your application has been approved. You can now manage your listing from your dashboard.",
  },
  REJECTED: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    border: "border-red-200 dark:border-red-800",
    label: "Not Approved",
    description: "Unfortunately, your application was not approved at this time.",
  },
  SUSPENDED: {
    icon: AlertCircle,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    border: "border-orange-200 dark:border-orange-800",
    label: "Suspended",
    description: "Your listing has been temporarily suspended. Please contact support for more information.",
  },
};

export default function ApplicationStatusClient() {
  const { user, isLoading: authLoading } = useAuth();
  const provider = useQuery(api.services.getMyProvider);
  const isLoading = authLoading || provider === undefined;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
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
                Please sign in to check your application status.
              </p>
              <Link
                href={`/login?redirect=${encodeURIComponent("/service-provider/status")}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Sign In to Continue
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  // No application found
  if (!provider) {
    return (
      <>
        <PublicHeader />
        <main className="min-h-screen bg-background py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                No Application Found
              </h1>
              <p className="text-muted-foreground mb-8">
                You haven&apos;t submitted a service provider application yet.
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
        <PublicFooter />
      </>
    );
  }

  // Get status config
  const status = provider.status as keyof typeof STATUS_CONFIG;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-background py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            {/* Status Banner */}
            <div className={`rounded-xl border ${statusConfig.border} ${statusConfig.bg} p-6 mb-8`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusConfig.bg}`}>
                  <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-foreground mb-1">
                    Application Status: {statusConfig.label}
                  </h1>
                  <p className="text-muted-foreground">
                    {statusConfig.description}
                  </p>

                  {/* Action buttons based on status */}
                  {status === "APPROVED" && (
                    <div className="mt-4 flex gap-3">
                      <Link
                        href="/service-provider/dashboard"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                      >
                        Go to Dashboard
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/services/provider/${provider.slug}`}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                      >
                        View Public Listing
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  )}

                  {status === "REJECTED" && (
                    <div className="mt-4">
                      <Link
                        href="/service-provider/apply"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                      >
                        Submit New Application
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Application Details */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                  Application Details
                </h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Business Info */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Business Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">{provider.name}</p>
                        {provider.businessName && (
                          <p className="text-sm text-muted-foreground">{provider.businessName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Award className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-foreground capitalize">{provider.category}</p>
                        <p className="text-sm text-muted-foreground">Service Category</p>
                      </div>
                    </div>
                    {provider.description && (
                      <div className="pl-8">
                        <p className="text-sm text-muted-foreground">{provider.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <p className="text-foreground">{provider.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <p className="text-foreground">{provider.phone}</p>
                    </div>
                    {provider.website && (
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-muted-foreground" />
                        <a
                          href={provider.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {provider.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Location
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      <p className="text-foreground">
                        {provider.city}, {provider.state}
                        {provider.zipCode && ` ${provider.zipCode}`}
                      </p>
                    </div>
                    {provider.serviceArea && provider.serviceArea.length > 0 && (
                      <div className="pl-8">
                        <p className="text-sm text-muted-foreground mb-1">Also serving:</p>
                        <div className="flex flex-wrap gap-2">
                          {provider.serviceArea.map((area: string) => (
                            <span
                              key={area}
                              className="px-2 py-1 bg-muted rounded-full text-xs text-muted-foreground"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Experience */}
                {(provider.yearsInBusiness || provider.isLicensed) && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Experience & Credentials
                    </h3>
                    <div className="space-y-3">
                      {provider.yearsInBusiness !== undefined && (
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-muted-foreground" />
                          <p className="text-foreground">
                            {provider.yearsInBusiness === 0
                              ? "Less than 1 year in business"
                              : provider.yearsInBusiness === 1
                              ? "1-2 years in business"
                              : provider.yearsInBusiness <= 5
                              ? "3-5 years in business"
                              : provider.yearsInBusiness <= 10
                              ? "6-10 years in business"
                              : "10+ years in business"}
                          </p>
                        </div>
                      )}
                      {provider.isLicensed && (
                        <div className="flex items-center gap-3">
                          <Award className="w-5 h-5 text-muted-foreground" />
                          <p className="text-foreground">
                            Licensed/Certified Professional
                            {provider.licenseNumber && (
                              <span className="text-muted-foreground"> - {provider.licenseNumber}</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tier Info */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Listing Tier
                  </h3>
                  <div className="flex items-center gap-3">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        provider.tier === "PREMIUM"
                          ? "bg-primary/10 text-primary"
                          : provider.tier === "VERIFIED"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {provider.tier || "BASIC"}
                    </div>
                    <Link
                      href="/services/pricing"
                      className="text-sm text-primary hover:underline"
                    >
                      Learn about tier benefits
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                Have questions about your application?{" "}
                <Link href="/contact" className="text-primary hover:underline">
                  Contact support
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
