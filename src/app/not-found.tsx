import Link from "next/link";
import { Home, Calendar, ShoppingBag, Search } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function NotFound() {
  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          {/* 404 Graphic */}
          <div className="mb-8">
            <div className="text-9xl font-bold text-primary/20 select-none">404</div>
            <div className="relative -mt-16">
              <div className="w-24 h-24 mx-auto bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
                <Search className="w-12 h-12 text-primary" />
              </div>
            </div>
          </div>

          {/* Message */}
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Page Not Found
          </h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved,
            deleted, or never existed in the first place.
          </p>

          {/* Primary Action */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors mb-8"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>

          {/* Quick Links */}
          <div className="border-t border-border pt-8">
            <p className="text-sm text-muted-foreground mb-4">
              Or try one of these popular pages:
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                Marketplace
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Events
              </Link>
              <Link
                href="/help"
                className="inline-flex items-center gap-2 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                <Search className="w-4 h-4" />
                Help Center
              </Link>
            </div>
          </div>

          {/* Support Link */}
          <p className="text-sm text-muted-foreground mt-8">
            Need help? <Link href="/contact" className="text-primary hover:underline">Contact Support</Link>
          </p>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
