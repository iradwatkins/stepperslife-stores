"use client";

import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { MarketplaceSubNav } from "@/components/layout/MarketplaceSubNav";
import { Check, ShoppingBag, TrendingUp, Headphones, Zap, Star, Gift, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Generous startup pricing - low fees to attract vendors
const pricingTiers = [
  {
    name: "Starter",
    price: 0,
    period: "forever",
    description: "Perfect for new vendors testing the waters",
    transactionFee: "8%",
    features: [
      "Up to 10 product listings",
      "Basic storefront page",
      "Order notifications",
      "Standard support",
      "Mobile-optimized store",
      "Basic sales analytics",
    ],
    cta: "Start Selling Free",
  },
  {
    name: "Growth",
    price: 9.99,
    period: "month",
    description: "For vendors ready to grow their business",
    transactionFee: "5%",
    features: [
      "Up to 100 product listings",
      "Custom storefront branding",
      "Priority order notifications",
      "Product variants & options",
      "Discount codes",
      "Advanced analytics",
      "Priority support",
      "Featured in vendor directory",
    ],
    highlighted: true,
    cta: "Start 30-Day Free Trial",
  },
  {
    name: "Pro",
    price: 24.99,
    period: "month",
    description: "For established vendors with high volume",
    transactionFee: "3%",
    features: [
      "Unlimited product listings",
      "Premium storefront design",
      "Inventory management",
      "Bulk product upload",
      "Custom domain support",
      "API access",
      "Dedicated support",
      "Priority placement in search",
      "Early access to new features",
      "Multi-user access",
    ],
    cta: "Start 30-Day Free Trial",
  },
];

export default function MarketplacePricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const annualDiscount = 0.20; // 20% discount for annual

  const getPrice = (tier: typeof pricingTiers[0]) => {
    if (tier.price === 0) return 0;
    if (billingPeriod === "annual") {
      return (tier.price * (1 - annualDiscount)).toFixed(2);
    }
    return tier.price.toFixed(2);
  };

  return (
    <>
      <PublicHeader />
      <MarketplaceSubNav />
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-background dark:from-sky-950/20 dark:to-background">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 dark:bg-sky-900/30 rounded-full text-primary/90 dark:text-sky-300 text-sm font-medium mb-6">
            <ShoppingBag className="w-4 h-4" />
            Vendor Pricing
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Sell More, Keep More
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            The most affordable marketplace fees in the stepping community.
            Start free, upgrade when you're ready.
          </p>

          {/* Startup Special Banner */}
          <div className="max-w-3xl mx-auto mb-8">
            <div className="bg-gradient-to-r from-sky-500 to-pink-500 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-6 h-6" />
                <span className="text-lg font-bold">LAUNCH SPECIAL</span>
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-2xl font-bold mb-2">First 100 Vendors Get 50% Off for 6 Months!</p>
              <p className="text-sky-100">Plus 0% transaction fees on your first $500 in sales</p>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-full mb-12">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                billingPeriod === "monthly"
                  ? "bg-white dark:bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                billingPeriod === "annual"
                  ? "bg-white dark:bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="text-xs bg-success/20 dark:bg-success/30 text-success dark:text-success px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="container mx-auto px-4 pb-16">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative bg-card rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                  tier.highlighted
                    ? "ring-2 ring-sky-500 dark:ring-sky-400"
                    : "border border-border"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-sky-500 to-pink-500 text-white text-center text-sm font-medium py-2">
                    Most Popular
                  </div>
                )}

                <div className={`p-8 ${tier.highlighted ? "pt-14" : ""}`}>
                  {/* Tier Name */}
                  <h3 className="text-2xl font-bold text-foreground mb-2">{tier.name}</h3>
                  <p className="text-muted-foreground text-sm mb-6">{tier.description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">
                        ${getPrice(tier)}
                      </span>
                      {tier.price > 0 && (
                        <span className="text-muted-foreground">
                          /{billingPeriod === "annual" ? "mo" : tier.period}
                        </span>
                      )}
                    </div>
                    {tier.price > 0 && billingPeriod === "annual" && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Billed annually (${(parseFloat(String(getPrice(tier))) * 12).toFixed(2)}/year)
                      </p>
                    )}
                    {tier.price === 0 && (
                      <p className="text-sm text-success dark:text-success mt-1">
                        Free forever
                      </p>
                    )}
                  </div>

                  {/* Transaction Fee Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-sky-50 dark:bg-sky-900/20 rounded-lg mb-6 w-full">
                    <TrendingUp className="w-4 h-4 text-primary dark:text-sky-400" />
                    <span className="text-sm font-medium text-primary/90 dark:text-sky-300">
                      Only {tier.transactionFee} per sale
                    </span>
                  </div>

                  {/* CTA Button */}
                  <Link
                    href="/vendor/apply"
                    className={`block w-full py-3 px-6 rounded-lg font-semibold text-center transition-colors mb-8 ${
                      tier.highlighted
                        ? "bg-gradient-to-r from-sky-500 to-pink-500 text-white hover:from-primary hover:to-pink-600"
                        : "bg-muted text-foreground hover:bg-muted/80"
                    }`}
                  >
                    {tier.cta}
                  </Link>

                  {/* Features */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">What's included:</p>
                    {tier.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why We're Different */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Why Our Fees Are So Low
            </h2>
            <p className="text-lg text-muted-foreground">
              We're a startup built by the stepping community, for the stepping community.
              We keep costs low so you can grow your business.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Community First</h3>
              <p className="text-muted-foreground text-sm">
                We're not here to take a big cut. We succeed when you succeed.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">No Hidden Fees</h3>
              <p className="text-muted-foreground text-sm">
                What you see is what you pay. No setup fees, no surprise charges.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Grow With Us</h3>
              <p className="text-muted-foreground text-sm">
                Start free, upgrade when your sales grow. No pressure, your pace.
              </p>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto bg-card rounded-2xl shadow-lg p-8 border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
              Compare the Fees
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              See how much you keep based on monthly sales
            </p>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {[
                { sales: "$500", starter: "$460", growth: "$465", pro: "$460" },
                { sales: "$1,000", starter: "$920", growth: "$940", pro: "$945" },
                { sales: "$2,500", starter: "$2,300", growth: "$2,365", pro: "$2,400" },
                { sales: "$5,000", starter: "$4,600", growth: "$4,740", pro: "$4,825" },
                { sales: "$10,000", starter: "$9,200", growth: "$9,490", pro: "$9,675" },
              ].map((row, idx) => (
                <div key={idx} className="border border-border rounded-lg p-4">
                  <p className="font-semibold text-foreground text-center mb-3">
                    Monthly Sales: {row.sales}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Starter (8%)</span>
                      <span className="text-sm text-foreground">Keep {row.starter}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50 bg-sky-50/50 dark:bg-sky-900/10 -mx-4 px-4">
                      <span className="text-sm font-medium text-primary">Growth (5%)</span>
                      <span className="text-sm font-medium text-primary">Keep {row.growth}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Pro (3%)</span>
                      <span className="text-sm text-foreground">Keep {row.pro}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Monthly Sales
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-foreground">
                      Starter (8%)
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-primary">
                      Growth (5% + $9.99)
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-foreground">
                      Pro (3% + $24.99)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { sales: "$500", starter: "$460", growth: "$465", pro: "$460" },
                    { sales: "$1,000", starter: "$920", growth: "$940", pro: "$945" },
                    { sales: "$2,500", starter: "$2,300", growth: "$2,365", pro: "$2,400" },
                    { sales: "$5,000", starter: "$4,600", growth: "$4,740", pro: "$4,825" },
                    { sales: "$10,000", starter: "$9,200", growth: "$9,490", pro: "$9,675" },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-4 px-4 font-medium text-foreground">{row.sales}</td>
                      <td className="py-4 px-4 text-center text-muted-foreground">
                        You keep {row.starter}
                      </td>
                      <td className="py-4 px-4 text-center text-primary font-medium bg-sky-50/50 dark:bg-sky-900/10">
                        You keep {row.growth}
                      </td>
                      <td className="py-4 px-4 text-center text-muted-foreground">
                        You keep {row.pro}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              * Calculations show approximate take-home after fees. Payment processing fees (2.9% + $0.30) apply to all plans.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                q: "When do I get paid?",
                a: "Payments are processed and available for payout within 2-3 business days after an order is marked complete. You can set up direct deposit to your bank account.",
              },
              {
                q: "Are there any hidden fees?",
                a: "No hidden fees! You only pay your plan's monthly fee (if applicable) plus the transaction percentage on each sale. Payment processing fees (2.9% + $0.30 per transaction) are standard and apply to all online sales.",
              },
              {
                q: "Can I upgrade or downgrade anytime?",
                a: "Yes! You can change your plan at any time. Upgrades take effect immediately, and downgrades apply at the end of your current billing period.",
              },
              {
                q: "What products can I sell?",
                a: "You can sell physical products related to the stepping community - apparel, accessories, custom items, and more. Digital products and services are coming soon!",
              },
              {
                q: "How does shipping work?",
                a: "You handle shipping directly to customers. You can offer local pickup (free) or set your own shipping rates. We provide order details so you know where to ship.",
              },
              {
                q: "What about the 30-day free trial?",
                a: "Growth and Pro plans include a 30-day free trial. You get full access to all features with no charge until day 31. Cancel anytime during the trial at no cost.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="bg-card rounded-xl p-6 border border-border"
              >
                <h3 className="text-lg font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-sky-500 to-pink-500 rounded-2xl p-8 md:p-12 text-center text-white">
            <Zap className="w-12 h-12 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to start selling?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Join the SteppersLife marketplace and reach customers across the stepping community.
              No upfront costs, start earning today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/vendor/apply"
                className="px-8 py-4 bg-white text-primary rounded-lg font-semibold hover:bg-sky-50 transition-colors"
              >
                Become a Vendor - Free
              </Link>
              <Link
                href="/marketplace"
                className="px-8 py-4 bg-primary text-white border-2 border-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Headphones className="w-5 h-5" />
            <span>Questions? Contact us at </span>
            <a
              href="mailto:vendors@stepperslife.com"
              className="text-primary hover:underline font-medium"
            >
              vendors@stepperslife.com
            </a>
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
