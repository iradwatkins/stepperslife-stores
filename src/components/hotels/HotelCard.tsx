"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Id } from "@/convex/_generated/dataModel";
import {
  Hotel,
  MapPin,
  Star,
  Users,
  Wifi,
  Car,
  Coffee,
  Waves,
  Dumbbell,
  Utensils,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
// RoomTypeSelector no longer used - booking happens on /events/[eventId]/hotels page

interface RoomType {
  id: string;
  name: string;
  pricePerNightCents: number;
  quantity: number;
  sold: number;
  maxGuests: number;
  description?: string;
}

interface HotelPackage {
  _id: Id<"hotelPackages">;
  hotelName: string;
  address: string;
  city: string;
  state: string;
  description?: string;
  amenities?: string[];
  starRating?: number;
  images?: string[];
  roomTypes: RoomType[];
  checkInDate: number;
  checkOutDate: number;
  specialInstructions?: string;
}

const AMENITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  parking: Car,
  breakfast: Coffee,
  pool: Waves,
  gym: Dumbbell,
  restaurant: Utensils,
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: "WiFi",
  parking: "Parking",
  breakfast: "Breakfast",
  pool: "Pool",
  gym: "Gym",
  restaurant: "Restaurant",
};

interface HotelCardProps {
  hotel: HotelPackage;
  eventId: Id<"events">;
  index: number;
}

export default function HotelCard({ hotel, eventId, index }: HotelCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate starting price
  const startingPrice = Math.min(
    ...hotel.roomTypes.map((rt) => rt.pricePerNightCents)
  );

  // Check if any rooms available
  const hasAvailability = hotel.roomTypes.some(
    (rt) => rt.quantity - rt.sold > 0
  );

  // Calculate nights for display
  const nights = Math.ceil(
    (hotel.checkOutDate - hotel.checkInDate) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-card"
      >
        {/* Hotel Image */}
        {hotel.images && hotel.images.length > 0 ? (
          <div className="relative w-full h-40 bg-muted">
            <Image
              src={hotel.images[0]}
              alt={hotel.hotelName}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
            {!hasAvailability && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="px-3 py-1 bg-destructive text-white rounded-full text-xs font-medium">
                  Sold Out
                </span>
              </div>
            )}
            {/* Price Badge */}
            <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm px-3 py-1 rounded-lg">
              <p className="text-xs text-muted-foreground">From</p>
              <p className="font-bold text-primary">${(startingPrice / 100).toFixed(0)}<span className="text-xs font-normal">/night</span></p>
            </div>
          </div>
        ) : (
          <div className="w-full h-32 bg-muted flex items-center justify-center">
            <Hotel className="w-10 h-10 text-muted-foreground/50" />
          </div>
        )}

        {/* Main Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-foreground">{hotel.hotelName}</h4>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {hotel.city}, {hotel.state}
              </p>
              {hotel.starRating && (
                <div className="flex items-center gap-0.5 mt-1">
                  {Array.from({ length: hotel.starRating }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-3 h-3 fill-warning text-warning"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Amenities */}
          {hotel.amenities && hotel.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {hotel.amenities.slice(0, 4).map((amenityId) => {
                const Icon = AMENITY_ICONS[amenityId] || Hotel;
                const label = AMENITY_LABELS[amenityId] || amenityId;
                return (
                  <span
                    key={amenityId}
                    className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs text-muted-foreground"
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </span>
                );
              })}
              {hotel.amenities.length > 4 && (
                <span className="px-2 py-1 text-xs text-muted-foreground">
                  +{hotel.amenities.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(hotel.checkInDate), "MMM d")} -{" "}
              {format(new Date(hotel.checkOutDate), "MMM d, yyyy")}
            </span>
            <span className="text-xs">({nights} night{nights > 1 ? "s" : ""})</span>
          </div>

          {/* Expand/Collapse Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide Rooms
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                View {hotel.roomTypes.length} Room Type
                {hotel.roomTypes.length > 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>

        {/* Expanded Room Types */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-border overflow-hidden"
            >
              <div className="p-4 bg-muted/30 space-y-3">
                {hotel.roomTypes.map((rt) => {
                  const available = rt.quantity - rt.sold;
                  const isSoldOut = available <= 0;

                  return (
                    <div
                      key={rt.id}
                      className={`border rounded-lg p-3 bg-card ${
                        isSoldOut ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-foreground">{rt.name}</p>
                          {rt.description && (
                            <p className="text-sm text-muted-foreground">
                              {rt.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Users className="w-3 h-3" />
                            Up to {rt.maxGuests} guest{rt.maxGuests > 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            ${(rt.pricePerNightCents / 100).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">/night</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p
                          className={`text-sm ${
                            isSoldOut ? "text-destructive" : "text-success"
                          }`}
                        >
                          {isSoldOut
                            ? "Sold Out"
                            : `${available} room${available > 1 ? "s" : ""} left`}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Book Now Button */}
                <button
                  type="button"
                  onClick={() => router.push(`/events/${eventId}/hotels`)}
                  disabled={!hasAvailability}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    hasAvailability
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {hasAvailability ? "Book Now" : "No Rooms Available"}
                </button>

                {hotel.specialInstructions && (
                  <p className="text-xs text-muted-foreground italic">
                    Note: {hotel.specialInstructions}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </>
  );
}
