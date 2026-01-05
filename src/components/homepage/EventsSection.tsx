import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { Calendar, MapPin, Ticket, ArrowRight } from 'lucide-react'

interface Event {
  id: string
  title: string
  slug: string
  description: string | null
  startDate: Date
  location: string | null | {
    venueName?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  imageUrl: string | null
  eventType: string
  ticketTypes: Array<{
    id: string
    name: string
    price: number
    quantity: number
    sold: number
  }>
  organizer: {
    name: string | null
  }
}

interface EventsSectionProps {
  events: Event[]
}

export function EventsSection({ events }: EventsSectionProps) {
  if (events.length === 0) {
    return null
  }

  const displayEvents = events.slice(0, 6)

  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Upcoming Events
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              Discover amazing events happening in your community
            </p>
          </div>
          <Link
            href="/events"
            className="hidden items-center gap-2 text-sm font-medium text-primary hover:underline sm:flex"
          >
            View all events
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Events Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayEvents.map((event) => {
            const availableTickets = event.ticketTypes.reduce(
              (sum, tt) => sum + (tt.quantity - tt.sold),
              0
            )

            const minPrice =
              event.ticketTypes.length > 0
                ? Math.min(...event.ticketTypes.map((tt) => Number(tt.price)))
                : 0

            return (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg"
              >
                {/* Event Image */}
                {event.imageUrl ? (
                  <div className="aspect-video w-full overflow-hidden bg-muted relative">
                    <Image
                      src={event.imageUrl}
                      alt={event.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-gradient-to-br from-primary/20 to-primary/5" />
                )}

                {/* Event Details */}
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-2 group-hover:text-primary">
                    {event.title}
                  </h3>

                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {format(new Date(event.startDate), 'PPP')}
                      </span>
                    </div>

                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="line-clamp-1">
                          {typeof event.location === 'string'
                            ? event.location
                            : [event.location.venueName, event.location.city, event.location.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 flex-shrink-0" />
                      {event.eventType === 'FREE_EVENT' || minPrice === 0 ? (
                        <span>Free</span>
                      ) : (
                        <span>From ${(minPrice / 100).toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  {event.eventType === 'TICKETED_EVENT' && (
                    <div className="mt-3 text-sm">
                      {availableTickets > 0 ? (
                        <span className="text-success">
                          {availableTickets} tickets available
                        </span>
                      ) : (
                        <span className="text-destructive">Sold Out</span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        {/* Mobile View All Link */}
        <div className="mt-8 flex justify-center sm:hidden">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            View all events
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
