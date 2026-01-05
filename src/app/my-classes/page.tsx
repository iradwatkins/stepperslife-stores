"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  Calendar,
  Ticket,
  MapPin,
  QrCode,
  Share2,
  Clock,
  CheckCircle,
  Maximize2,
  GraduationCap,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useState, useEffect } from "react";
import { formatEventLocation } from "@/lib/location-format";
import { toast } from "sonner";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

// Type for the ticket data
type TicketData = {
  _id: Id<"tickets">;
  ticketCode: string | undefined;
  status: "CANCELLED" | "PENDING" | "VALID" | "SCANNED" | "REFUNDED" | "PENDING_ACTIVATION" | undefined;
  scannedAt: number | undefined;
  createdAt: number;
  eventId?: Id<"events">;
  attendeeEmail?: string;
  attendeeName?: string;
  event: {
    _id: Id<"events">;
    name: string;
    startDate: number | undefined;
    endDate: number | undefined;
    location?: string | {
      venueName?: string;
      address?: string;
      zipCode?: string;
      city: string;
      state: string;
      country: string;
    };
    imageUrl: string | undefined;
    eventType: string | undefined;
    organizerId?: Id<"users">;
  } | null;
  tier: {
    name: string;
    price: number;
  } | null;
  order: {
    _id: Id<"orders">;
    totalCents: number;
    paidAt: number | undefined;
  } | null;
  seat: {
    sectionName: string;
    rowLabel: string;
    seatNumber: number;
  } | null;
};

// Fullscreen QR Modal Component
function FullscreenQRModal({
  ticket,
  event,
  onClose,
}: {
  ticket: TicketData;
  event: NonNullable<TicketData["event"]>;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-white flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex-1">
          <h2 className="font-bold text-lg truncate">{event.name}</h2>
          <p className="text-sm text-muted-foreground">{ticket.attendeeName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-full"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* QR Code - Takes up most of the screen */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-success">
          <QRCodeSVG
            value={ticket.ticketCode || ""}
            size={280}
            level="M"
            marginSize={2}
          />
        </div>
        <p className="mt-4 font-mono text-lg font-bold tracking-wider">
          {ticket.ticketCode}
        </p>
        <div className="mt-4 flex items-center gap-2 text-success">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold">Ready to Scan</span>
        </div>
      </div>

      {/* Footer info */}
      <div className="p-4 bg-muted/50 text-center">
        <p className="text-sm text-muted-foreground">
          Show this QR code to the instructor at check-in
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Tap anywhere to close
        </p>
      </div>
    </div>
  );
}

export default function MyClassesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [shouldFetch, setShouldFetch] = useState(false);
  const tickets = useQuery(
    api.tickets.queries.getMyTickets,
    shouldFetch ? {} : "skip"
  );

  // Fullscreen QR state
  const [fullscreenTicket, setFullscreenTicket] = useState<{
    ticket: TicketData;
    event: NonNullable<TicketData["event"]>;
  } | null>(null);

  const [showPast, setShowPast] = useState(false);

  // Check authentication
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        setIsAuthenticated(res.ok);
        if (res.ok) setShouldFetch(true);
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  // Cast tickets and filter to only CLASS type events
  const ticketsData = tickets as unknown as TicketData[] | undefined;
  const classTickets = ticketsData?.filter(
    (t) => t.event?.eventType === "CLASS"
  );

  // Group tickets by event
  const groupedTickets = classTickets?.reduce(
    (acc, ticket) => {
      if (!ticket.event) return acc;
      const eventId = ticket.event._id;
      if (!acc[eventId]) {
        acc[eventId] = { event: ticket.event, tickets: [] };
      }
      acc[eventId].tickets.push(ticket);
      return acc;
    },
    {} as Record<string, { event: NonNullable<TicketData["event"]>; tickets: TicketData[] }>
  );

  const now = Date.now();

  // Filter upcoming classes (exclude cancelled/refunded)
  const upcomingClasses = groupedTickets
    ? Object.values(groupedTickets)
        .filter((group) => group.event.startDate && group.event.startDate >= now)
        .map((group) => ({
          ...group,
          tickets: group.tickets.filter(
            (t) => t.status !== "CANCELLED" && t.status !== "REFUNDED"
          ),
        }))
        .filter((group) => group.tickets.length > 0)
        .sort((a, b) => (a.event.startDate || 0) - (b.event.startDate || 0))
    : [];

  // Filter past classes (exclude cancelled/refunded)
  const pastClasses = groupedTickets
    ? Object.values(groupedTickets)
        .filter((group) => !group.event.startDate || group.event.startDate < now)
        .map((group) => ({
          ...group,
          tickets: group.tickets.filter(
            (t) => t.status !== "CANCELLED" && t.status !== "REFUNDED"
          ),
        }))
        .filter((group) => group.tickets.length > 0)
        .sort((a, b) => (b.event.startDate || 0) - (a.event.startDate || 0))
    : [];

  // Handlers
  const handleShareTicket = (ticketCode: string, eventName: string) => {
    if (navigator.share) {
      navigator.share({ title: `Class enrollment for ${eventName}`, text: `My enrollment code: ${ticketCode}` });
    } else {
      navigator.clipboard.writeText(ticketCode);
      toast.success("Enrollment code copied!");
    }
  };

  // Loading states
  if (isAuthenticated === null || (isAuthenticated && !tickets)) {
    return (
      <>
        <PublicHeader showCreateButton={false} />
        <div className="min-h-screen bg-muted flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <PublicHeader showCreateButton={false} />
        <div className="min-h-screen bg-muted flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Please sign in</h2>
            <p className="text-muted-foreground mb-6">Sign in to view your class enrollments</p>
            <Link href="/login" className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 inline-block">
              Sign In
            </Link>
            <p className="mt-6 text-sm text-muted-foreground">
              Looking for events instead? <Link href="/my-tickets" className="text-primary hover:underline">View My Tickets</Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!classTickets || classTickets.length === 0) {
    return (
      <>
        <PublicHeader showCreateButton={false} />
        <div className="min-h-screen bg-muted flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No class enrollments yet</h2>
            <p className="text-muted-foreground mb-6">Your class enrollments will appear here after you sign up for a class.</p>
            <Link href="/classes" className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 inline-block">
              Browse Classes
            </Link>
            <p className="mt-6 text-sm text-muted-foreground">
              Looking for event tickets? <Link href="/my-tickets" className="text-primary hover:underline">View My Tickets</Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PublicHeader showCreateButton={false} />
      <div className="min-h-screen bg-muted">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Role Indicator Banner */}
          <div className="bg-info/10 border border-info/30 rounded-lg p-3 mb-4 flex items-center gap-3">
            <div className="bg-info/20 p-2 rounded-full">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Student View</p>
              <p className="text-xs text-info">Classes you've enrolled in as a student</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <GraduationCap className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold">My Enrolled Classes</h1>
            </div>
            <p className="text-sm text-muted-foreground">Tap your enrollment to show QR code for check-in</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-card rounded-xl p-4 border">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-medium">Upcoming</span>
              </div>
              <p className="text-2xl font-bold">{upcomingClasses.length}</p>
              <p className="text-xs text-muted-foreground">classes scheduled</p>
            </div>
            <div className="bg-card rounded-xl p-4 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">Completed</span>
              </div>
              <p className="text-2xl font-bold">{pastClasses.length}</p>
              <p className="text-xs text-muted-foreground">classes attended</p>
            </div>
          </div>

          {/* Upcoming Classes */}
          {upcomingClasses.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Upcoming Classes
              </h2>

              <div className="space-y-4">
                {upcomingClasses.map(({ event, tickets: classEnrollments }) => (
                  <div key={event._id} className="bg-card rounded-2xl shadow-lg overflow-hidden border">
                    {/* Class Header */}
                    <div className="relative h-28 bg-gradient-to-br from-primary/20 to-primary/5">
                      {event.imageUrl && (
                        <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <h3 className="font-bold text-lg">{event.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-white/80 mt-1">
                          {event.startDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {format(new Date(event.startDate), "EEE, MMM d 'at' h:mm a")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Enrollments */}
                    <div className="p-4 space-y-3">
                      {classEnrollments.map((ticket) => {
                        const isValid = ticket.status === "VALID";

                        return (
                          <div
                            key={ticket._id}
                            className={`rounded-xl overflow-hidden ${
                              isValid ? "border-2 border-success/50" : "border border-border"
                            }`}
                          >
                            {isValid && ticket.ticketCode ? (
                              <div
                                className="bg-white cursor-pointer hover:bg-card transition-colors"
                                onClick={() => setFullscreenTicket({ ticket, event })}
                              >
                                {/* Status Banner */}
                                <div className="bg-success text-white px-4 py-2 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-semibold">Enrolled</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-sm bg-white/20 px-2 py-0.5 rounded">
                                    <Maximize2 className="w-4 h-4" />
                                    <span>Tap for QR</span>
                                  </div>
                                </div>

                                {/* QR Code */}
                                <div className="flex flex-col items-center py-4 px-4">
                                  <div className="bg-white p-2 rounded-xl shadow-md border">
                                    <QRCodeSVG
                                      value={ticket.ticketCode}
                                      size={160}
                                      level="M"
                                      marginSize={2}
                                    />
                                  </div>
                                  <p className="mt-2 font-mono text-sm font-bold tracking-widest text-foreground">
                                    {ticket.ticketCode}
                                  </p>
                                </div>

                                {/* Enrollment Info */}
                                <div className="bg-card px-4 py-3 border-t flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-semibold text-foreground">
                                        {ticket.attendeeName || "Guest"}
                                      </p>
                                      <p className="text-sm text-muted-foreground">{ticket.tier?.name || "General"}</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShareTicket(ticket.ticketCode || "", event.name);
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg"
                                  >
                                    <Share2 className="w-4 h-4" />
                                    Share
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Pending enrollment */
                              <div className="bg-white p-4">
                                <div className="rounded-lg p-3 mb-3 flex items-center gap-3 bg-warning/10 text-warning">
                                  <AlertCircle className="w-8 h-8" />
                                  <div>
                                    <p className="font-semibold">Enrollment Pending</p>
                                    <p className="text-sm">Complete payment to confirm your spot</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-semibold">{ticket.attendeeName || "Guest"}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Classes */}
          {pastClasses.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowPast(!showPast)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
              >
                {showPast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span className="font-medium">{showPast ? "Hide" : "Show"} Past Classes ({pastClasses.length})</span>
              </button>

              <AnimatePresence>
                {showPast && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4"
                  >
                    {pastClasses.map(({ event, tickets: classEnrollments }) => (
                      <div key={event._id} className="bg-card/50 rounded-xl p-4 border opacity-70">
                        <h3 className="font-semibold mb-2">{event.name}</h3>
                        {event.startDate && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {format(new Date(event.startDate), "PPP")}
                          </p>
                        )}
                        <div className="space-y-2">
                          {classEnrollments.map((ticket) => (
                            <div key={ticket._id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                              <span className="text-sm">{ticket.attendeeName}</span>
                              {ticket.status === "SCANNED" ? (
                                <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Attended
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Completed</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Quick Links */}
          <div className="mt-8 pt-6 border-t">
            <p className="text-sm text-muted-foreground mb-4">Looking for something else?</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/my-tickets" className="px-4 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80">
                <Ticket className="w-4 h-4 inline mr-2" />
                Event Tickets
              </Link>
              <Link href="/classes" className="px-4 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80">
                <GraduationCap className="w-4 h-4 inline mr-2" />
                Browse Classes
              </Link>
            </div>
          </div>
        </div>

        {/* Fullscreen QR Modal */}
        <AnimatePresence>
          {fullscreenTicket && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <FullscreenQRModal
                ticket={fullscreenTicket.ticket}
                event={fullscreenTicket.event}
                onClose={() => setFullscreenTicket(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <PublicFooter />
    </>
  );
}
