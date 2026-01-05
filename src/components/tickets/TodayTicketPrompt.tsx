"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, X, ChevronRight, Ticket } from "lucide-react";
import { format } from "date-fns";
import { TicketData, getEventTimeMessage } from "@/hooks/useTodayTickets";

interface TodayTicketPromptProps {
  tickets: TicketData[];
  onShowTicket: (ticket: TicketData) => void;
}

/**
 * TodayTicketPrompt
 *
 * A floating prompt that appears when the user has tickets for events
 * happening today or within the next 24 hours. One tap shows the QR code.
 */
export function TodayTicketPrompt({ tickets, onShowTicket }: TodayTicketPromptProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Don't show if no tickets or dismissed
  if (tickets.length === 0 || isDismissed) {
    return null;
  }

  const firstTicket = tickets[0];
  const eventName = firstTicket.event?.name || "Your Event";
  const timeMessage = firstTicket.event?.startDate
    ? getEventTimeMessage(firstTicket.event.startDate)
    : "Your event is coming up!";

  const handleClick = () => {
    if (tickets.length === 1) {
      onShowTicket(firstTicket);
    } else {
      setShowPicker(true);
    }
  };

  const handleSelectTicket = (ticket: TicketData) => {
    setShowPicker(false);
    onShowTicket(ticket);
  };

  return (
    <>
      {/* Floating Prompt */}
      <AnimatePresence>
        {!showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40"
          >
            <div
              onClick={handleClick}
              className="bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/30 p-4 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
                  <QrCode className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{timeMessage}</p>
                  <p className="text-sm opacity-90 truncate">{eventName}</p>
                  {tickets.length > 1 && (
                    <p className="text-xs opacity-75 mt-1">
                      {tickets.length} tickets ready
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-sm font-medium">
                    <span>Tap to show {tickets.length > 1 ? "tickets" : "QR code"}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Dismiss button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDismissed(true);
                  }}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticket Picker Modal (for multiple tickets) */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => setShowPicker(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-background w-full max-w-lg rounded-t-3xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Select a Ticket</h2>
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="p-2 hover:bg-muted rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => handleSelectTicket(ticket)}
                    className="flex items-center gap-4 p-4 bg-muted rounded-xl cursor-pointer hover:bg-muted/80 active:scale-[0.98] transition-all"
                  >
                    <div className="bg-primary/10 rounded-full p-3">
                      <Ticket className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{ticket.attendeeName || "Guest"}</p>
                      <p className="text-sm text-muted-foreground">{ticket.tier?.name || "General Admission"}</p>
                      {ticket.seat && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {ticket.seat.sectionName} - Row {ticket.seat.rowLabel}, Seat {ticket.seat.seatNumber}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                ))}
              </div>

              {/* Cancel button */}
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="w-full mt-4 py-3 text-center text-muted-foreground font-medium"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
