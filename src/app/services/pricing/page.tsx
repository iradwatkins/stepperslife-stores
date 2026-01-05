"use client";

import { PublicHeader } from "@/components/layout/PublicHeader";
import { ServicesSubNav } from "@/components/layout/ServicesSubNav";
import { PublicFooter } from "@/components/layout/PublicFooter";
import Link from "next/link";
import {
  Check,
  X,
  BadgeCheck,
  Crown,
  Briefcase,
  Search,
  Star,
  MessageSquare,
  Eye,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react";

const TIERS = [
  {
    id: "BASIC",
    name: "Basic",
    price: "Free",
    priceNote: "Forever free",
    description: "Perfect for getting started and building your presence.",
    icon: Briefcase,
    color: "bg-muted",
    iconColor: "text-muted-foreground",
    features: {
      listing: true,
      searchable: true,
      contactInfo: true,
      reviews: true,
      badge: false,
      prioritySearch: false,
      featuredSpot: false,
      analytics: false,
      support: "Community",
    },
    cta: "Get Started",
    ctaLink: "/service-provider/apply",
    popular: false,
  },
  {
    id: "VERIFIED",
    name: "Verified",
    price: "$9.99",
    priceNote: "per month",
    description: "Stand out with verification and priority placement.",
    icon: BadgeCheck,
    color: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    features: {
      listing: true,
      searchable: true,
      contactInfo: true,
      reviews: true,
      badge: true,
      prioritySearch: true,
      featuredSpot: false,
      analytics: true,
      support: "Email",
    },
    cta: "Upgrade to Verified",
    ctaLink: "/service-provider/apply",
    popular: true,
  },
  {
    id: "PREMIUM",
    name: "Premium",
    price: "$24.99",
    priceNote: "per month",
    description: "Maximum visibility with featured placement and premium support.",
    icon: Crown,
    color: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    features: {
      listing: true,
      searchable: true,
      contactInfo: true,
      reviews: true,
      badge: true,
      prioritySearch: true,
      featuredSpot: true,
      analytics: true,
      support: "Priority",
    },
    cta: "Go Premium",
    ctaLink: "/service-provider/apply",
    popular: false,
  },
];

const FEATURES = [
  { key: "listing", label: "Directory Listing", icon: Briefcase },
  { key: "searchable", label: "Searchable by Category & Location", icon: Search },
  { key: "contactInfo", label: "Display Contact Information", icon: MessageSquare },
  { key: "reviews", label: "Customer Reviews", icon: Star },
  { key: "badge", label: "Verified Badge", icon: BadgeCheck },
  { key: "prioritySearch", label: "Priority in Search Results", icon: Zap },
  { key: "featuredSpot", label: "Featured Section Placement", icon: Eye },
  { key: "analytics", label: "Profile Analytics", icon: Eye },
  { key: "support", label: "Support Level", icon: Shield },
];

export default function PricingPage() {
  return (
    <>
      <PublicHeader />
      <ServicesSubNav />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Provider Tiers</span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Choose Your Visibility Level
              </h1>
              <p className="text-lg text-muted-foreground">
                Start for free and upgrade anytime to reach more customers in your area.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 -mt-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {TIERS.map((tier) => {
                const Icon = tier.icon;
                return (
                  <div
                    key={tier.id}
                    className={`relative bg-card rounded-2xl border p-6 flex flex-col ${
                      tier.popular
                        ? "border-primary shadow-lg scale-[1.02]"
                        : "border-border"
                    }`}
                  >
                    {tier.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-4 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl ${tier.color} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${tier.iconColor}`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{tier.name}</h3>
                        <p className="text-sm text-muted-foreground">{tier.priceNote}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                    </div>

                    <p className="text-muted-foreground mb-6 flex-grow">
                      {tier.description}
                    </p>

                    <ul className="space-y-3 mb-8">
                      {Object.entries(tier.features).map(([key, value]) => {
                        if (key === "support") return null;
                        return (
                          <li key={key} className="flex items-center gap-2">
                            {value ? (
                              <Check className="w-5 h-5 text-success flex-shrink-0" />
                            ) : (
                              <X className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            )}
                            <span className={value ? "text-foreground" : "text-muted-foreground"}>
                              {FEATURES.find((f) => f.key === key)?.label}
                            </span>
                          </li>
                        );
                      })}
                      <li className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-foreground">{tier.features.support} Support</span>
                      </li>
                    </ul>

                    <Link
                      href={tier.ctaLink}
                      className={`w-full py-3 px-6 rounded-xl font-semibold text-center transition-colors ${
                        tier.popular
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-muted text-foreground hover:bg-muted/80"
                      }`}
                    >
                      {tier.cta}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
                Feature Comparison
              </h2>

              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 text-foreground font-semibold">Feature</th>
                        {TIERS.map((tier) => (
                          <th key={tier.id} className="text-center p-4 text-foreground font-semibold">
                            {tier.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {FEATURES.map((feature, idx) => (
                        <tr
                          key={feature.key}
                          className={idx < FEATURES.length - 1 ? "border-b border-border" : ""}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <feature.icon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-foreground">{feature.label}</span>
                            </div>
                          </td>
                          {TIERS.map((tier) => {
                            const value = tier.features[feature.key as keyof typeof tier.features];
                            return (
                              <td key={tier.id} className="text-center p-4">
                                {typeof value === "boolean" ? (
                                  value ? (
                                    <Check className="w-5 h-5 text-success mx-auto" />
                                  ) : (
                                    <X className="w-5 h-5 text-muted-foreground mx-auto" />
                                  )
                                ) : (
                                  <span className="text-muted-foreground">{value}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-semibold text-foreground mb-2">
                    How do I upgrade my tier?
                  </h3>
                  <p className="text-muted-foreground">
                    You can upgrade anytime from your provider dashboard. Simply go to Settings and select your desired tier. Changes take effect immediately.
                  </p>
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-semibold text-foreground mb-2">
                    Can I cancel my subscription?
                  </h3>
                  <p className="text-muted-foreground">
                    Yes, you can downgrade to Basic or cancel anytime. Your listing remains active, just without the premium features.
                  </p>
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-semibold text-foreground mb-2">
                    What does &quot;Priority in Search&quot; mean?
                  </h3>
                  <p className="text-muted-foreground">
                    Verified and Premium providers appear higher in search results when customers browse by category or location, giving you more visibility.
                  </p>
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-semibold text-foreground mb-2">
                    How do I get verified?
                  </h3>
                  <p className="text-muted-foreground">
                    Once you upgrade to Verified or Premium, our team reviews your business information to ensure authenticity. This usually takes 1-2 business days.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Ready to Grow Your Business?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join our community of trusted professionals and start connecting with customers in your neighborhood today.
              </p>
              <Link
                href="/service-provider/apply"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              >
                List Your Services
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
