import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import {
  Store,
  DollarSign,
  BarChart3,
  Shield,
  Package,
  Users,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

const BENEFITS = [
  {
    icon: Store,
    title: "Your Own Storefront",
    description:
      "Create your custom branded store page with logo, banner, and product catalog.",
  },
  {
    icon: Package,
    title: "Easy Product Management",
    description:
      "Add, edit, and manage your products with our intuitive dashboard.",
  },
  {
    icon: Users,
    title: "Reach New Customers",
    description:
      "Access our community of steppers and dancers looking for unique products.",
  },
  {
    icon: DollarSign,
    title: "Competitive Commission",
    description:
      "Keep 85% of every sale. We only take 15% to cover platform costs.",
  },
  {
    icon: BarChart3,
    title: "Sales Analytics",
    description:
      "Track your sales, earnings, and performance with detailed analytics.",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    description:
      "We handle payment processing so you get paid reliably.",
  },
];

const STEPS = [
  {
    number: "1",
    title: "Apply to Sell",
    description: "Fill out our simple vendor application with your store details.",
  },
  {
    number: "2",
    title: "Get Approved",
    description: "Our team reviews applications within 48 hours.",
  },
  {
    number: "3",
    title: "Add Products",
    description: "Upload your products with photos, descriptions, and pricing.",
  },
  {
    number: "4",
    title: "Start Selling",
    description: "Your products go live and customers can start buying!",
  },
];

export default function VendorLandingPage() {
  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary to-sky-700 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-6">
                <Store className="h-4 w-4" />
                Vendor Marketplace
              </span>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Sell Your Products on SteppersLife
              </h1>
              <p className="text-xl text-white/90 mb-8">
                Join our marketplace and reach thousands of customers in the stepping community.
                Easy setup, competitive rates, and powerful tools to grow your business.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/vendor/apply"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary rounded-lg font-semibold text-lg hover:bg-muted transition-colors"
                >
                  Apply to Sell
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg font-semibold text-lg hover:bg-white/10 transition-colors"
                >
                  Browse Marketplace
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Sell on SteppersLife?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to run a successful online store, without the hassle.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {BENEFITS.map((benefit) => (
                <div
                  key={benefit.title}
                  className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center mb-4">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Get started in four simple steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {STEPS.map((step, index) => (
                <div key={step.title} className="relative">
                  <div className="bg-card rounded-2xl p-6 border border-border text-center">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                      {step.number}
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Commission Section */}
        <div className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-primary to-sky-700 rounded-3xl p-8 md:p-12 text-white">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                      Simple, Fair Pricing
                    </h2>
                    <p className="text-white/90 mb-6">
                      We believe in transparency. Our commission structure is straightforward -
                      you keep 85% of every sale, we take 15% to maintain the platform.
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-success" />
                        <span>No monthly fees</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-success" />
                        <span>No setup costs</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-success" />
                        <span>Pay only when you sell</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                    <div className="text-6xl font-bold mb-2">85%</div>
                    <p className="text-white/90 mb-4">You Keep</p>
                    <div className="border-t border-white/20 pt-4 mt-4">
                      <div className="text-2xl font-bold">15%</div>
                      <p className="text-white/70 text-sm">Platform Commission</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Start Selling?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Apply now and join hundreds of vendors selling to our community.
              It only takes a few minutes to get started.
            </p>
            <Link
              href="/vendor/apply"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors"
            >
              Apply to Become a Vendor
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
