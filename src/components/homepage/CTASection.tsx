import Link from 'next/link'
import { Calendar, Store } from 'lucide-react'

export function CTASection() {
  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Organizer CTA */}
          <div className="rounded-lg border bg-gradient-to-br from-primary/10 to-primary/5 p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Become an Organizer</h3>
            </div>

            <p className="mt-4 text-muted-foreground">
              Create and manage events, sell tickets, and grow your audience.
              Join hundreds of organizers building thriving communities.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/organizer/onboarding"
                className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Start Organizing
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center justify-center rounded-md border px-6 text-sm font-medium hover:bg-accent"
              >
                View Pricing
              </Link>
            </div>
          </div>

          {/* Vendor CTA */}
          <div className="rounded-lg border bg-gradient-to-br from-success/10 to-success/5 p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/20">
                <Store className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-2xl font-bold">Open Your Store</h3>
            </div>

            <p className="mt-4 text-muted-foreground">
              Reach local customers, manage inventory, and grow your business.
              Join our marketplace and start selling today.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/vendor/onboarding"
                className="inline-flex h-12 items-center justify-center rounded-md bg-success px-6 text-sm font-medium text-white hover:bg-success/90"
              >
                Start Selling
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center justify-center rounded-md border px-6 text-sm font-medium hover:bg-accent"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
