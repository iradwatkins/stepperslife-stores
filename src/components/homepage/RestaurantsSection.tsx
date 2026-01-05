import { UtensilsCrossed } from 'lucide-react'

export function RestaurantsSection() {
  return (
    <section className="bg-muted/50 py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <UtensilsCrossed className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Restaurants Coming Soon
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Discover amazing local restaurants and food vendors in your area.
            We're cooking up something special for you!
          </p>
          <div className="mt-8">
            <button
              type="button" className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Get Early Access
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
