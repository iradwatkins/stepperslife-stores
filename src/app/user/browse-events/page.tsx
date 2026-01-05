"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Calendar, MapPin, Heart, ShoppingCart, Filter } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function BrowseEventsPage() {
  const events = useQuery(api.events.queries.getClaimableEvents) || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime] = useState(() => Date.now());

  // Filter events based on search
  const filteredEvents = events.filter((event: Doc<"events">) => {
    const locationString = typeof event.location === "string"
      ? event.location
      : event.location?.city || "";
    return (
      event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      locationString.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Categorize events
  const upcomingEvents = filteredEvents.filter(
    (event: Doc<"events">) => event.startDate && event.startDate > currentTime
  );
  const featuredEvents = upcomingEvents.slice(0, 3);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Browse Events</h1>
        <p className="text-muted-foreground mt-2">
          Discover exciting events and purchase tickets
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events by name or location..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Featured Events */}
      {featuredEvents.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Featured Events</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredEvents.map((event: Doc<"events">) => (
              <Card key={event._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-1">{event.name}</CardTitle>
                      <CardDescription className="mt-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {event.startDate && formatDate(event.startDate)}
                      </CardDescription>
                    </div>
                    <Button size="icon" variant="ghost">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      <span className="line-clamp-1">
                        {typeof event.location === "string"
                          ? event.location
                          : event.location?.city || "Location TBA"}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-lg text-primary">
                        ${event.price ? (event.price / 100).toFixed(2) : "Free"}
                      </span>
                      {event.price && <span className="text-muted-foreground"> per ticket</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button asChild className="flex-1">
                        <Link href={`/events/${event._id}`}>View Details</Link>
                      </Button>
                      <Button size="icon" variant="outline">
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Events */}
      <div>
        <h2 className="text-2xl font-bold mb-4">
          All Events ({filteredEvents.length})
        </h2>
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No events found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your search criteria
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredEvents.map((event: Doc<"events">) => (
              <Card key={event._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Event Date Badge */}
                    <div className="flex-shrink-0 w-20 h-20 bg-primary/10 rounded-lg flex flex-col items-center justify-center">
                      {event.startDate && (
                        <>
                          <div className="text-2xl font-bold">
                            {new Date(event.startDate).getDate()}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase">
                            {new Date(event.startDate).toLocaleString("en-US", {
                              month: "short",
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Event Details */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-semibold">{event.name}</h3>
                          <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {event.startDate && (
                                <span>
                                  {formatDate(event.startDate)} at {formatTime(event.startDate)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>
                                {typeof event.location === "string"
                                  ? event.location
                                  : event.location?.city || "Location TBA"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            ${event.price ? (event.price / 100).toFixed(2) : "Free"}
                          </div>
                          {event.price && <div className="text-xs text-muted-foreground">per ticket</div>}
                        </div>
                      </div>

                      {/* Event Description */}
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <Button asChild>
                          <Link href={`/events/${event._id}`}>View Details</Link>
                        </Button>
                        <Button variant="outline">
                          <Heart className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button variant="outline">
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
