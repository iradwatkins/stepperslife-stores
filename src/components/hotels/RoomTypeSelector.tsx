"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  X,
  Hotel,
  MapPin,
  Star,
  Users,
  Calendar,
  Minus,
  Plus,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

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
  roomTypes: RoomType[];
  checkInDate: number;
  checkOutDate: number;
  specialInstructions?: string;
}

interface RoomTypeSelectorProps {
  hotel: HotelPackage;
  eventId: Id<"events">;
  onClose: () => void;
}

export default function RoomTypeSelector({
  hotel,
  eventId,
  onClose,
}: RoomTypeSelectorProps) {
  const router = useRouter();

  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [numberOfRooms, setNumberOfRooms] = useState(1);
  const [numberOfGuests, setNumberOfGuests] = useState(2);
  const [checkInDate, setCheckInDate] = useState(
    format(new Date(hotel.checkInDate), "yyyy-MM-dd")
  );
  const [checkOutDate, setCheckOutDate] = useState(
    format(new Date(hotel.checkOutDate), "yyyy-MM-dd")
  );

  // Check availability for selected room
  const availability = useQuery(
    api.hotels.queries.checkAvailability,
    selectedRoom
      ? {
          packageId: hotel._id,
          roomTypeId: selectedRoom,
          checkInDate: new Date(checkInDate).getTime(),
          checkOutDate: new Date(checkOutDate).getTime(),
          numberOfRooms,
        }
      : "skip"
  );

  const selectedRoomType = hotel.roomTypes.find((rt) => rt.id === selectedRoom);
  const maxRoomsAvailable = selectedRoomType
    ? selectedRoomType.quantity - selectedRoomType.sold
    : 0;
  const maxGuests = selectedRoomType
    ? selectedRoomType.maxGuests * numberOfRooms
    : 0;

  const handleProceedToCheckout = () => {
    if (!selectedRoom || !availability?.available) return;

    // Store booking details in sessionStorage and navigate to checkout
    const bookingDetails = {
      packageId: hotel._id,
      eventId,
      roomTypeId: selectedRoom,
      roomTypeName: selectedRoomType?.name,
      hotelName: hotel.hotelName,
      checkInDate: new Date(checkInDate).getTime(),
      checkOutDate: new Date(checkOutDate).getTime(),
      numberOfRooms,
      numberOfGuests,
      pricePerNightCents: selectedRoomType?.pricePerNightCents,
      nights: availability.nights,
      subtotalCents: availability.subtotalCents,
      platformFeeCents: availability.platformFeeCents,
      totalCents: availability.totalCents,
    };

    sessionStorage.setItem("hotelBookingDetails", JSON.stringify(bookingDetails));
    router.push(`/events/${eventId}/hotels/checkout`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Hotel className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{hotel.hotelName}</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {hotel.city}, {hotel.state}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Date Selection */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Select Dates
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Check-in
                  </label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    min={format(new Date(hotel.checkInDate), "yyyy-MM-dd")}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Check-out
                  </label>
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    min={checkInDate}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Room Selection */}
            <div>
              <h3 className="font-medium mb-3">Select Room Type</h3>
              <div className="space-y-3">
                {hotel.roomTypes.map((rt) => {
                  const available = rt.quantity - rt.sold;
                  const isSoldOut = available <= 0;
                  const isSelected = selectedRoom === rt.id;

                  return (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => !isSoldOut && setSelectedRoom(rt.id)}
                      disabled={isSoldOut}
                      className={`w-full text-left border rounded-lg p-4 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : isSoldOut
                            ? "border-border bg-muted/50 opacity-60 cursor-not-allowed"
                            : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{rt.name}</p>
                          {rt.description && (
                            <p className="text-sm text-muted-foreground">
                              {rt.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Users className="w-3 h-3" />
                            Up to {rt.maxGuests} guests
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            ${(rt.pricePerNightCents / 100).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">/night</p>
                          <p
                            className={`text-xs mt-1 ${
                              isSoldOut ? "text-destructive" : "text-success"
                            }`}
                          >
                            {isSoldOut ? "Sold Out" : `${available} left`}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity Selection */}
            {selectedRoom && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Number of Rooms */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Number of Rooms
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setNumberOfRooms(Math.max(1, numberOfRooms - 1))}
                      disabled={numberOfRooms <= 1}
                      className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-medium">
                      {numberOfRooms}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setNumberOfRooms(Math.min(maxRoomsAvailable, numberOfRooms + 1))
                      }
                      disabled={numberOfRooms >= maxRoomsAvailable}
                      className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-muted-foreground">
                      ({maxRoomsAvailable} available)
                    </span>
                  </div>
                </div>

                {/* Number of Guests */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Number of Guests
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setNumberOfGuests(Math.max(1, numberOfGuests - 1))}
                      disabled={numberOfGuests <= 1}
                      className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-medium">
                      {numberOfGuests}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setNumberOfGuests(Math.min(maxGuests, numberOfGuests + 1))
                      }
                      disabled={numberOfGuests >= maxGuests}
                      className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-muted-foreground">
                      (max {maxGuests} for {numberOfRooms} room
                      {numberOfRooms > 1 ? "s" : ""})
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Price Summary */}
            {selectedRoom && availability && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-t border-border pt-4"
              >
                {availability.available ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        ${((selectedRoomType?.pricePerNightCents || 0) / 100).toFixed(2)}{" "}
                        x {availability.nights ?? 0} night{(availability.nights ?? 0) > 1 ? "s" : ""}{" "}
                        x {numberOfRooms} room{numberOfRooms > 1 ? "s" : ""}
                      </span>
                      <span>${((availability.subtotalCents ?? 0) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Platform fee (5%)</span>
                      <span>${((availability.platformFeeCents ?? 0) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                      <span>Total</span>
                      <span className="text-primary">
                        ${((availability.totalCents ?? 0) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{availability.reason}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Action Button */}
            <button
              type="button"
              onClick={handleProceedToCheckout}
              disabled={!selectedRoom || !availability?.available}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                selectedRoom && availability?.available
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {!selectedRoom
                ? "Select a Room Type"
                : !availability?.available
                  ? "Not Available"
                  : `Book Now - $${((availability.totalCents ?? 0) / 100).toFixed(2)}`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
