"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Hotel } from "lucide-react";
import { motion } from "framer-motion";
import HotelCard from "./HotelCard";

interface HotelSectionProps {
  eventId: Id<"events">;
}

export default function HotelSection({ eventId }: HotelSectionProps) {
  const hotelPackages = useQuery(api.hotels.queries.getHotelPackagesForEvent, { eventId });

  // Don't render if no hotels or still loading
  if (hotelPackages === undefined) {
    return null; // Still loading
  }

  if (hotelPackages.length === 0) {
    return null; // No hotels to display
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.8 }}
      className="mb-6"
    >
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Hotel className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Partner Hotels</h3>
          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
            Book & Save
          </span>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Reserve your accommodation through our partner hotels and enjoy special event rates.
        </p>

        <div className="space-y-4">
          {hotelPackages.map((hotel, index) => (
            <HotelCard
              key={hotel._id}
              hotel={hotel}
              eventId={eventId}
              index={index}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
