"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Tag, ChevronLeft, ChevronRight, CalendarDays, Hotel } from "lucide-react";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface Event {
  _id: string;
  name: string;
  description: string;
  eventType: string;
  eventDateLiteral: string;
  eventTimeLiteral?: string;
  location: {
    venueName?: string;
    city: string;
    state: string;
  };
  categories?: string[];
  imageUrl?: string;
  isFeatured?: boolean;
  hasHotels?: boolean;
  hotelCount?: number;
}

interface EventsGridProps {
  events: Event[];
}

export function EventsGrid({ events }: EventsGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [isPaused, setIsPaused] = useState(false);

  // Manual scroll functions
  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === "left" ? -350 : 350;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  // Empty state - no events available
  if (events.length === 0) {
    return (
      <section ref={sectionRef} className="bg-muted/30 py-16 overflow-hidden">
        <div className="container px-4 mx-auto">
          <motion.div
            className="text-center py-12 bg-card rounded-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <CalendarDays className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            </motion.div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Upcoming Events</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              No events are currently scheduled. Check back soon for upcoming steppin&apos; events in your area.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <CalendarDays className="w-5 h-5" />
                Browse Events
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const headerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" as const },
    },
  };

  return (
    <section ref={sectionRef} className="bg-muted/30 py-16 overflow-hidden">
      <div className="container px-4 mx-auto">
        <motion.div
          className="mb-10 flex flex-wrap items-start justify-between gap-4"
          variants={headerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <div className="flex-1 min-w-[250px]">
            <motion.h2
              className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground"
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
              transition={{ duration: 0.6 }}
            >
              Upcoming Events
            </motion.h2>
            <motion.p
              className="mt-2 text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Don&apos;t miss out on the hottest steppin events
            </motion.p>
          </div>
          <motion.div
            className="flex items-center gap-3 flex-shrink-0"
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="hidden sm:flex items-center gap-2">
              <motion.button
                type="button"
                onClick={() => scroll("left")}
                className="p-2 rounded-full bg-card shadow-md hover:bg-background transition-colors"
                aria-label="Scroll left"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              <motion.button
                type="button"
                onClick={() => scroll("right")}
                className="p-2 rounded-full bg-card shadow-md hover:bg-background transition-colors"
                aria-label="Scroll right"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button asChild variant="outline">
                <Link href="/events">View All Events</Link>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-muted-foreground scrollbar-track-muted"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{ scrollbarWidth: "thin" }}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {events.slice(0, 12).map((event, index) => {
            if (!event || !event.location) {
              return null;
            }

            const locationDisplay = event.location.venueName
              || `${event.location.city}, ${event.location.state}`;

            const eventTypeBadge = event.eventType === "FREE_EVENT"
              ? "Free"
              : event.eventType === "TICKETED_EVENT"
              ? "Tickets Available"
              : "Save the Date";

            const description = event.description && event.description.length > 120
              ? event.description.substring(0, 120) + "..."
              : event.description || "";

            const imageUrl = event.imageUrl || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80";

            return (
              <motion.div
                key={event._id}
                initial={{ opacity: 0, x: 50 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link
                  href={`/events/${event._id}`}
                  className="group flex-none w-[300px] md:w-[350px] snap-start block"
                >
                  <motion.article
                    className="overflow-hidden rounded-lg border bg-card h-full flex flex-col"
                    whileHover={{
                      y: -8,
                      boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)",
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                      <Image
                        src={imageUrl}
                        alt={event.name}
                        fill
                        sizes="(max-width: 768px) 300px, 350px"
                        className="object-contain transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                        unoptimized={true}
                      />
                      {/* Top Right Badges */}
                      <div className="absolute right-3 top-3 flex flex-col gap-2">
                        {event.isFeatured && (
                          <motion.span
                            className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.3 }}
                          >
                            Featured
                          </motion.span>
                        )}
                        {event.hasHotels && (
                          <motion.span
                            className="flex items-center gap-1 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.4 }}
                          >
                            <Hotel className="w-3 h-3" />
                            Hotels
                          </motion.span>
                        )}
                      </div>
                      <div className="absolute left-3 top-3">
                        <motion.span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            event.eventType === "FREE_EVENT"
                              ? "bg-success text-white"
                              : "bg-primary text-white"
                          }`}
                          whileHover={{ scale: 1.05 }}
                        >
                          {eventTypeBadge}
                        </motion.span>
                      </div>
                      {/* Gradient Overlay on Hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="mb-2 text-xl font-bold text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {event.name}
                      </h3>
                      <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                        {description}
                      </p>

                      <div className="space-y-2 text-sm mt-auto">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>{event.eventDateLiteral}</span>
                        </div>
                        {event.eventTimeLiteral && (
                          <div className="flex items-center gap-2 text-muted-foreground text-xs pl-6">
                            <span>{event.eventTimeLiteral}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="line-clamp-1">{locationDisplay}</span>
                        </div>
                        {event.categories && event.categories.length > 0 && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Tag className="h-4 w-4 flex-shrink-0" />
                            <span className="line-clamp-1">{event.categories[0]}</span>
                          </div>
                        )}
                      </div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button className="mt-4 w-full" size="sm">
                          View Details
                        </Button>
                      </motion.div>
                    </div>
                  </motion.article>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
