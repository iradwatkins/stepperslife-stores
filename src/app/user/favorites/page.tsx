"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Calendar, MapPin, Clock, Award, Users, DollarSign, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Id } from "@/../convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";

export default function FavoritesPage() {
  const { user, isLoading: authLoading } = useAuth();

  // Query favorites
  const favorites = useQuery(api.favoriteEvents.getMyFavorites);

  // Remove mutation
  const removeFavorite = useMutation(api.favoriteEvents.remove);

  const handleRemove = async (eventId: Id<"events">) => {
    try {
      await removeFavorite({ eventId });
      toast.success("Removed from favorites");
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Failed to remove. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Helper to format price display
  const formatPrice = (cents: number | null | undefined): string => {
    if (cents === null || cents === undefined) return "";
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(0)}`;
  };

  // Filter to show only classes
  const savedClasses = favorites?.filter(
    (fav) => fav.event?.eventType === "CLASS"
  ) || [];

  // Filter to show only events
  const savedEvents = favorites?.filter(
    (fav) => fav.event?.eventType !== "CLASS"
  ) || [];

  // Loading state
  if (favorites === undefined || authLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user && !authLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Saved Classes & Events</h1>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              Please sign in to view your saved classes and events
            </p>
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isEmpty = favorites.length === 0;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Saved Classes & Events</h1>
        <p className="text-muted-foreground mt-2">
          {favorites.length} {favorites.length === 1 ? "item" : "items"} saved for later
        </p>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <Card>
          <CardContent className="text-center py-12">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-2">No favorites yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Browse classes and events and tap the heart to save them here
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild>
                <Link href="/classes">Browse Classes</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/events">Browse Events</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Classes Section */}
      {savedClasses.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Saved Classes ({savedClasses.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savedClasses.map((fav) => {
              const event = fav.event!;
              return (
                <Card key={fav._id} className="group overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {event.imageUrl ? (
                      <Image
                        src={event.imageUrl}
                        alt={event.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-white opacity-50" />
                      </div>
                    )}

                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemove(event._id);
                      }}
                      className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow hover:bg-white transition-colors"
                      aria-label="Remove from favorites"
                    >
                      <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    </button>

                    {/* Level Badge */}
                    {event.classLevel && (
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 text-xs font-semibold bg-slate-800 text-white rounded-full flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {event.classLevel}
                        </span>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-3">
                    {/* Title */}
                    <h3 className="font-semibold text-lg line-clamp-2 hover:text-primary transition-colors">
                      <Link href={`/classes/${event._id}`}>{event.name}</Link>
                    </h3>

                    {/* Category & Instructor */}
                    <div className="flex flex-wrap gap-2">
                      {event.categories?.[0] && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-accent text-primary rounded-full">
                          {event.categories[0]}
                        </span>
                      )}
                      {event.organizerName && (
                        <span className="text-sm text-muted-foreground">
                          by {event.organizerName}
                        </span>
                      )}
                    </div>

                    {/* Date & Time */}
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {event.eventDateLiteral && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{event.eventDateLiteral}</span>
                        </div>
                      )}
                      {event.eventTimeLiteral && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{event.eventTimeLiteral}</span>
                        </div>
                      )}
                      {event.location && typeof event.location === "object" && event.location.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location.city}, {event.location.state}</span>
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <Button asChild className="w-full mt-2">
                      <Link href={`/classes/${event._id}`}>View Class</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Saved Events Section */}
      {savedEvents.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Saved Events ({savedEvents.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savedEvents.map((fav) => {
              const event = fav.event!;
              return (
                <Card key={fav._id} className="group overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {event.imageUrl ? (
                      <Image
                        src={event.imageUrl}
                        alt={event.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                        <Calendar className="w-12 h-12 text-white opacity-50" />
                      </div>
                    )}

                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemove(event._id);
                      }}
                      className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow hover:bg-white transition-colors"
                      aria-label="Remove from favorites"
                    >
                      <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    </button>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    {/* Title */}
                    <h3 className="font-semibold text-lg line-clamp-2 hover:text-primary transition-colors">
                      <Link href={`/events/${event._id}`}>{event.name}</Link>
                    </h3>

                    {/* Date & Location */}
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {event.startDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(event.startDate)}</span>
                        </div>
                      )}
                      {event.location && typeof event.location === "object" && event.location.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location.city}, {event.location.state}</span>
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <Button asChild className="w-full mt-2">
                      <Link href={`/events/${event._id}`}>View Event</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
