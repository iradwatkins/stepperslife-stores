"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { ServicesSubNav } from "@/components/layout/ServicesSubNav";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProviderHero } from "@/components/services/ProviderHero";
import { ProviderContact } from "@/components/services/ProviderContact";
import { ReviewSection } from "@/components/services/ReviewSection";
import Link from "next/link";
import {
  Loader2,
  ArrowLeft,
  AlertCircle,
  Clock,
  Award,
  Calendar,
  Star,
} from "lucide-react";

interface ProviderDetailClientProps {
  slug: string;
}

export default function ProviderDetailClient({ slug }: ProviderDetailClientProps) {
  const provider = useQuery(api.services.getProviderBySlug, { slug });
  const isLoading = provider === undefined;

  // Loading state
  if (isLoading) {
    return (
      <>
        <PublicHeader />
        <ServicesSubNav />
        <main className="min-h-screen bg-background">
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  // Not found
  if (!provider) {
    return (
      <>
        <PublicHeader />
        <ServicesSubNav />
        <main className="min-h-screen bg-background py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Provider Not Found
              </h1>
              <p className="text-muted-foreground mb-8">
                The service provider you&apos;re looking for doesn&apos;t exist or may have been removed.
              </p>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Services
              </Link>
            </div>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <PublicHeader />
      <ServicesSubNav />

      {/* Breadcrumbs */}
      <div className="container mx-auto px-4 pt-4">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Services", href: "/services" },
            { label: provider.businessName || provider.name },
          ]}
        />
      </div>

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <ProviderHero
          providerId={provider._id}
          name={provider.name}
          businessName={provider.businessName}
          category={provider.category}
          city={provider.city}
          state={provider.state}
          tier={provider.tier || "BASIC"}
          averageRating={provider.averageRating}
          totalReviews={provider.totalReviews}
          yearsInBusiness={provider.yearsInBusiness}
          isLicensed={provider.isLicensed}
          logoUrl={provider.logoUrl}
          coverImageUrl={provider.coverImageUrl}
        />

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              {provider.description && (
                <section className="bg-card rounded-xl border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    About
                  </h2>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {provider.description}
                  </p>
                </section>
              )}

              {/* Experience & Credentials */}
              {(provider.yearsInBusiness || provider.isLicensed) && (
                <section className="bg-card rounded-xl border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    Experience & Credentials
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {provider.yearsInBusiness !== undefined && (
                      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                        <Calendar className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">
                            {provider.yearsInBusiness === 0
                              ? "< 1 Year"
                              : `${provider.yearsInBusiness}+ Years`}
                          </p>
                          <p className="text-sm text-muted-foreground">In Business</p>
                        </div>
                      </div>
                    )}
                    {provider.isLicensed && (
                      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                        <Award className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">Licensed</p>
                          <p className="text-sm text-muted-foreground">
                            {provider.licenseNumber || "Verified Professional"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Reviews Section */}
              <section className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-6">
                  Reviews
                </h2>
                <ReviewSection
                  providerId={provider._id}
                  providerName={provider.businessName || provider.name}
                />
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Card */}
              <ProviderContact
                phone={provider.phone}
                email={provider.email}
                website={provider.website}
                city={provider.city}
                state={provider.state}
                zipCode={provider.zipCode}
                serviceArea={provider.serviceArea}
              />

              {/* CTA Card */}
              <div className="bg-primary/5 rounded-xl border border-primary/20 p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  Ready to get in touch?
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Contact {provider.businessName || provider.name} directly using the information above.
                </p>
                <a
                  href={`tel:${provider.phone.replace(/[^\d+]/g, "")}`}
                  className="block w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium text-center hover:bg-primary/90 transition-colors"
                >
                  Call Now
                </a>
              </div>

              {/* Back Link */}
              <Link
                href="/services"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to all services
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
