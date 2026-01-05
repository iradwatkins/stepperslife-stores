"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Calendar, MapPin, QrCode, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function ScanEventSelectionPage() {
  const events = useQuery(api.scanning.queries.getMyScannableEvents);

  if (events === undefined) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center text-white">
          <div className="inline-block w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <QrCode className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Event Scanner</h1>
              <p className="text-white/80 text-sm">Select an event to scan tickets</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {events.length === 0 ? (
          <div className="bg-white rounded-lg shadow-xl p-12 text-center">
            <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No Events Available</h2>
            <p className="text-muted-foreground mb-6">
              You don't have permission to scan tickets for any events.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Back to Events
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <Link
                key={event._id}
                href={`/scan/${event._id}`}
                className="block bg-white rounded-lg shadow-lg hover:shadow-xl transition-all overflow-hidden group"
              >
                <div className="md:flex">
                  {/* Event Image */}
                  <div className="md:w-48 h-48 md:h-auto bg-primary flex-shrink-0 relative">
                    {event.imageUrl ? (
                      <img
                        src={event.imageUrl}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Calendar className="w-16 h-16 text-white opacity-50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                          {event.name}
                        </h3>

                        <div className="space-y-2 mb-4">
                          {event.startDate && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm">
                                {format(event.startDate, "EEEE, MMM d, yyyy 'at' h:mm a")}
                              </span>
                            </div>
                          )}

                          {event.location && typeof event.location === "object" && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm">
                                {event.location.venueName && `${event.location.venueName}, `}
                                {event.location.city}, {event.location.state}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg group-hover:bg-primary/90 transition-colors">
                          <QrCode className="w-5 h-5" />
                          <span className="font-semibold">Start Scanning</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
