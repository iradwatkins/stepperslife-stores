"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import {
  Calendar,
  Ticket,
  MapPin,
  Download,
  QrCode,
  Share2,
  Send,
  X,
  Armchair,
  Edit,
  Trash2,
  Package,
  PackageOpen,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Maximize2,
  Clock,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useState, useEffect } from "react";
import { formatEventLocation } from "@/lib/location-format";
import { toast } from "sonner";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { TodayTicketPrompt } from "@/components/tickets/TodayTicketPrompt";
import { useTodayTickets } from "@/hooks/useTodayTickets";

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
  bundleId?: string;
  bundleName?: string;
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
          Show this QR code to the staff at the door
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Tap anywhere to close
        </p>
      </div>
    </div>
  );
}

export default function MyTicketsPage() {
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

  // Modal states
  const [transferModalTicket, setTransferModalTicket] = useState<TicketData | null>(null);
  const [transferEmail, setTransferEmail] = useState("");
  const [transferName, setTransferName] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [editModalTicket, setEditModalTicket] = useState<TicketData | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [bundleName, setBundleName] = useState("");
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [deleteConfirmTicket, setDeleteConfirmTicket] = useState<TicketData | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Mutations
  const initiateTransfer = useMutation(api.transfers.mutations.initiateTransfer);
  const updateTicket = useMutation(api.tickets.mutations.updateTicket);
  const deleteTicket = useMutation(api.tickets.mutations.deleteTicket);
  const bundleTickets = useMutation(api.tickets.mutations.bundleTickets);
  const unbundleTickets = useMutation(api.tickets.mutations.unbundleTickets);

  // Check authentication
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        setIsAuthenticated(res.ok);
        if (res.ok) setShouldFetch(true);
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  // Cast tickets
  const ticketsData = tickets as unknown as TicketData[] | undefined;

  // Get tickets for today's events (for the quick access prompt)
  const todayTickets = useTodayTickets(ticketsData);

  // Group tickets by event
  const groupedTickets = ticketsData?.reduce(
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

  // Filter upcoming (exclude cancelled/refunded)
  const upcomingEvents = groupedTickets
    ? Object.values(groupedTickets)
        .filter((group) => group.event.startDate && group.event.startDate >= now)
        .map((group) => ({
          ...group,
          tickets: group.tickets.filter(
            (t) => t.status !== "CANCELLED" && t.status !== "REFUNDED"
          ),
        }))
        .filter((group) => group.tickets.length > 0)
    : [];

  // Filter past (exclude cancelled/refunded)
  const pastEvents = groupedTickets
    ? Object.values(groupedTickets)
        .filter((group) => !group.event.startDate || group.event.startDate < now)
        .map((group) => ({
          ...group,
          tickets: group.tickets.filter(
            (t) => t.status !== "CANCELLED" && t.status !== "REFUNDED"
          ),
        }))
        .filter((group) => group.tickets.length > 0)
    : [];

  // Archived tickets
  const archivedTickets = ticketsData?.filter(
    (t) => t.status === "CANCELLED" || t.status === "REFUNDED"
  ) || [];

  // Handlers
  const handleShareTicket = (ticketCode: string, eventName: string) => {
    if (navigator.share) {
      navigator.share({ title: `Ticket for ${eventName}`, text: `My ticket code: ${ticketCode}` });
    } else {
      navigator.clipboard.writeText(ticketCode);
      toast.success("Ticket code copied!");
    }
  };

  const handleTransferTicket = (ticket: TicketData) => {
    setTransferModalTicket(ticket);
    setTransferEmail("");
    setTransferName("");
  };

  const handleSubmitTransfer = async () => {
    if (!transferModalTicket || !transferEmail || !transferName) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsTransferring(true);
    try {
      await initiateTransfer({
        ticketId: transferModalTicket._id,
        toEmail: transferEmail,
        toName: transferName,
      });
      toast.success(`Transfer initiated! Email sent to ${transferEmail}`);
      setTransferModalTicket(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to transfer");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleEditTicket = (ticket: TicketData) => {
    setEditModalTicket(ticket);
    setEditName(ticket.attendeeName || "");
    setEditEmail(ticket.attendeeEmail || "");
  };

  const handleSubmitEdit = async () => {
    if (!editModalTicket) return;
    try {
      await updateTicket({
        ticketId: editModalTicket._id,
        attendeeName: editName,
        attendeeEmail: editEmail,
      });
      toast.success("Ticket updated!");
      setEditModalTicket(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const handleDeleteTicket = (ticket: TicketData) => {
    setDeleteConfirmTicket(ticket);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmTicket) return;
    try {
      await deleteTicket({ ticketId: deleteConfirmTicket._id });
      toast.success("Ticket cancelled");
      setDeleteConfirmTicket(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel");
    }
  };

  const handleToggleTicketSelection = (ticketId: string) => {
    setSelectedTickets((prev) =>
      prev.includes(ticketId) ? prev.filter((id) => id !== ticketId) : [...prev, ticketId]
    );
  };

  const handleCreateBundle = async () => {
    if (!bundleName.trim()) {
      toast.error("Please enter a bundle name");
      return;
    }
    if (selectedTickets.length < 2) {
      toast.error("Select at least 2 tickets");
      return;
    }
    try {
      await bundleTickets({
        ticketIds: selectedTickets as Id<"tickets">[],
        bundleName: bundleName.trim(),
      });
      toast.success(`Bundle "${bundleName}" created!`);
      setSelectedTickets([]);
      setBundleName("");
      setShowBundleModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create bundle");
    }
  };

  const handleUnbundle = async (ticketIds: string[]) => {
    try {
      await unbundleTickets({ ticketIds: ticketIds as Id<"tickets">[] });
      toast.success("Tickets unbundled!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unbundle");
    }
  };

  const isTicketEditable = (ticket: TicketData) => {
    if (ticket.status === "SCANNED" || ticket.status === "CANCELLED") return false;
    if (ticket.event?.startDate && Date.now() >= ticket.event.startDate) return false;
    return true;
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
          <div className="text-center">
            <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Please sign in</h2>
            <p className="text-muted-foreground mb-4">Sign in to view your tickets</p>
            <Link href="/login" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90">
              Sign In
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (tickets && tickets.length === 0) {
    return (
      <>
        <PublicHeader showCreateButton={false} />
        <div className="min-h-screen bg-muted flex items-center justify-center p-4">
          <div className="text-center">
            <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No tickets yet</h2>
            <p className="text-muted-foreground mb-4">Your tickets will appear here</p>
            <Link href="/" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90">
              Browse Events
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Group bundled tickets
  const bundledTickets: Record<string, TicketData[]> = {};
  ticketsData?.forEach((ticket) => {
    if (ticket.bundleId) {
      if (!bundledTickets[ticket.bundleId]) bundledTickets[ticket.bundleId] = [];
      bundledTickets[ticket.bundleId].push(ticket);
    }
  });

  return (
    <>
      <PublicHeader showCreateButton={false} />
      <div className="min-h-screen bg-muted">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">My Tickets</h1>
              <p className="text-sm text-muted-foreground">Tap ticket to show QR code</p>
            </div>
            {selectedTickets.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBundleModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg"
                >
                  <Package className="w-4 h-4" />
                  Bundle ({selectedTickets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTickets([])}
                  className="px-3 py-1.5 border text-sm rounded-lg"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Upcoming Events
              </h2>

              <div className="space-y-6">
                {upcomingEvents.map(({ event, tickets: eventTickets }) => (
                  <div key={event._id} className="bg-card rounded-2xl shadow-lg overflow-hidden border">
                    {/* Event Header */}
                    <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5">
                      {event.imageUrl && (
                        <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <h3 className="font-bold text-lg">{event.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-white/80 mt-1">
                          {event.startDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {format(new Date(event.startDate), "EEE, MMM d 'at' h:mm a")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tickets - Card Style */}
                    <div className="p-4 space-y-4">
                      {eventTickets.map((ticket) => {
                        const editable = isTicketEditable(ticket);
                        const isValid = ticket.status === "VALID";

                        return (
                          <div
                            key={ticket._id}
                            className={`rounded-xl overflow-hidden transition-all ${
                              selectedTickets.includes(ticket._id)
                                ? "ring-2 ring-primary"
                                : isValid
                                  ? "border-2 border-success/50"
                                  : "border border-border"
                            }`}
                          >
                            {/* VALID TICKET - Show prominent QR */}
                            {isValid && ticket.ticketCode ? (
                              <div
                                className="bg-white cursor-pointer hover:bg-card transition-colors"
                                onClick={() => setFullscreenTicket({ ticket, event })}
                              >
                                {/* Top: Status Banner */}
                                <div className="bg-success text-white px-4 py-2 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-semibold">Ready to Scan</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-sm bg-white/20 px-2 py-0.5 rounded">
                                    <Maximize2 className="w-4 h-4" />
                                    <span>Tap for fullscreen</span>
                                  </div>
                                </div>

                                {/* Middle: QR Code - BIG and Centered */}
                                <div className="flex flex-col items-center py-6 px-4">
                                  <div className="bg-white p-3 rounded-xl shadow-md border">
                                    <QRCodeSVG
                                      value={ticket.ticketCode}
                                      size={200}
                                      level="M"
                                      marginSize={2}
                                    />
                                  </div>
                                  <p className="mt-3 font-mono text-sm font-bold tracking-widest text-foreground">
                                    {ticket.ticketCode}
                                  </p>
                                </div>

                                {/* Bottom: Ticket Info */}
                                <div className="bg-card px-4 py-3 border-t">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold text-foreground">
                                        {ticket.attendeeName || "Guest"}
                                      </p>
                                      <p className="text-sm text-muted-foreground">{ticket.tier?.name || "General Admission"}</p>
                                    </div>
                                    {ticket.seat && (
                                      <div className="text-right text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                          <Armchair className="w-4 h-4" />
                                          <span>{ticket.seat.sectionName}</span>
                                        </div>
                                        <span>Row {ticket.seat.rowLabel}, Seat {ticket.seat.seatNumber}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Actions Bar - Stop propagation to not open fullscreen */}
                                <div
                                  className="px-4 py-2 bg-muted flex items-center justify-between border-t"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleShareTicket(ticket.ticketCode || "", event.name)}
                                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg"
                                    >
                                      <Share2 className="w-4 h-4" />
                                      Share
                                    </button>
                                  </div>
                                  {editable && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleEditTicket(ticket)}
                                        className="p-2 text-muted-foreground hover:bg-muted rounded-lg"
                                        title="Edit"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleTransferTicket(ticket)}
                                        className="p-2 text-muted-foreground hover:bg-muted rounded-lg"
                                        title="Transfer"
                                      >
                                        <Send className="w-4 h-4" />
                                      </button>
                                      <label className="flex items-center gap-1 p-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={selectedTickets.includes(ticket._id)}
                                          onChange={() => handleToggleTicketSelection(ticket._id)}
                                          className="rounded"
                                        />
                                      </label>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* NON-VALID TICKETS (Pending, Pending Activation, etc.) */
                              <div className="bg-white p-4">
                                {/* Status Banner */}
                                <div className={`rounded-lg p-3 mb-3 flex items-center gap-3 ${
                                  ticket.status === "PENDING"
                                    ? "bg-warning/10 text-warning"
                                    : ticket.status === "PENDING_ACTIVATION"
                                      ? "bg-primary/10 text-primary"
                                      : "bg-muted text-muted-foreground"
                                }`}>
                                  <AlertCircle className="w-8 h-8" />
                                  <div>
                                    {ticket.status === "PENDING" && (
                                      <>
                                        <p className="font-semibold">Payment Pending</p>
                                        <p className="text-sm">Complete payment to get your QR code</p>
                                      </>
                                    )}
                                    {ticket.status === "PENDING_ACTIVATION" && (
                                      <>
                                        <p className="font-semibold">Activation Required</p>
                                        <p className="text-sm">Enter your activation code to unlock</p>
                                      </>
                                    )}
                                    {ticket.status === "SCANNED" && (
                                      <>
                                        <p className="font-semibold">Already Used</p>
                                        <p className="text-sm">This ticket was scanned at {ticket.scannedAt ? format(ticket.scannedAt, "h:mm a") : "the event"}</p>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Ticket Info */}
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold">{ticket.attendeeName || "Guest"}</p>
                                    <p className="text-sm text-muted-foreground">{ticket.tier?.name}</p>
                                  </div>

                                  {ticket.status === "PENDING_ACTIVATION" && (
                                    <Link
                                      href="/activate"
                                      className="px-4 py-2 bg-primary/50 text-white rounded-lg font-medium hover:bg-primary"
                                    >
                                      Activate Now
                                    </Link>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Bundle info */}
                      {Object.entries(bundledTickets).map(([bundleId, bundleTickets]) => {
                        const bundleInThisEvent = bundleTickets.filter((t) => t.eventId === event._id);
                        if (bundleInThisEvent.length === 0) return null;

                        return (
                          <div key={bundleId} className="p-3 bg-primary/5 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">{bundleInThisEvent[0].bundleName}</span>
                              <span className="text-xs text-muted-foreground">({bundleInThisEvent.length} tickets)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUnbundle(bundleInThisEvent.map((t) => t._id))}
                              className="text-sm text-primary hover:underline"
                            >
                              <PackageOpen className="w-4 h-4 inline mr-1" />
                              Unbundle
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Past Events</h2>
              <div className="space-y-4">
                {pastEvents.map(({ event, tickets: eventTickets }) => (
                  <div key={event._id} className="bg-card/50 rounded-xl p-4 border opacity-70">
                    <h3 className="font-semibold mb-2">{event.name}</h3>
                    {event.startDate && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {format(new Date(event.startDate), "PPP")}
                      </p>
                    )}
                    <div className="space-y-2">
                      {eventTickets.map((ticket) => (
                        <div key={ticket._id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <span className="text-sm">{ticket.attendeeName}</span>
                          {ticket.status === "SCANNED" ? (
                            <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" /> Attended
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unused</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Archived */}
          {archivedTickets.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                {showArchived ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showArchived ? "Hide" : "Show"} {archivedTickets.length} cancelled/refunded
              </button>

              <AnimatePresence>
                {showArchived && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-2"
                  >
                    {archivedTickets.map((ticket) => (
                      <div key={ticket._id} className="p-3 bg-muted/30 rounded-lg opacity-50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{ticket.attendeeName}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            ticket.status === "CANCELLED" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{ticket.event?.name}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Today's Ticket Quick Access Prompt */}
        <TodayTicketPrompt
          tickets={todayTickets}
          onShowTicket={(ticket) => {
            if (ticket.event) {
              setFullscreenTicket({ ticket, event: ticket.event });
            }
          }}
        />

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

        {/* Transfer Modal */}
        {transferModalTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Transfer Ticket</h3>
                <button type="button" onClick={() => setTransferModalTicket(null)} className="p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Recipient's Name</label>
                  <input
                    type="text"
                    value={transferName}
                    onChange={(e) => setTransferName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Recipient's Email</label>
                  <input
                    type="email"
                    value={transferEmail}
                    onChange={(e) => setTransferEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Enter email"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSubmitTransfer}
                    disabled={isTransferring}
                    className="flex-1 bg-primary text-white py-2 rounded-lg disabled:opacity-50"
                  >
                    {isTransferring ? "Transferring..." : "Transfer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferModalTicket(null)}
                    className="flex-1 border py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Edit Modal */}
        {editModalTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Edit Ticket</h3>
                <button type="button" onClick={() => setEditModalTicket(null)} className="p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Attendee Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Attendee Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSubmitEdit}
                    className="flex-1 bg-primary text-white py-2 rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditModalTicket(null)}
                    className="flex-1 border py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Bundle Modal */}
        {showBundleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Create Bundle</h3>
                <button type="button" onClick={() => setShowBundleModal(false)} className="p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Bundle Name</label>
                  <input
                    type="text"
                    value={bundleName}
                    onChange={(e) => setBundleName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Family Pack"
                  />
                </div>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {selectedTickets.length} ticket{selectedTickets.length !== 1 ? "s" : ""} selected
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCreateBundle}
                    className="flex-1 bg-primary text-white py-2 rounded-lg"
                  >
                    Create Bundle
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBundleModal(false)}
                    className="flex-1 border py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4 text-destructive">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-xl font-bold">Cancel Ticket</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Are you sure you want to cancel this ticket? This cannot be undone.
              </p>
              <div className="bg-muted p-3 rounded-lg mb-6">
                <p className="font-medium">{deleteConfirmTicket.attendeeName}</p>
                <p className="text-sm text-muted-foreground">{deleteConfirmTicket.attendeeEmail}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 bg-destructive text-white py-2 rounded-lg"
                >
                  Yes, Cancel Ticket
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTicket(null)}
                  className="flex-1 border py-2 rounded-lg"
                >
                  Keep Ticket
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
      <PublicFooter />
    </>
  );
}
