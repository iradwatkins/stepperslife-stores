"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Ticket,
  Clock,
  Armchair,
} from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";

export default function TicketValidationPage() {
  const params = useParams();
  const ticketCode = params.ticketCode as string;

  const ticketData = useQuery(api.tickets.queries.getTicketByCode, {
    ticketCode: ticketCode,
  });

  if (ticketData === undefined) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Validating ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div className="min-h-screen bg-muted">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Ticket Not Found</h1>
              <p className="text-muted-foreground mb-6">
                The ticket code <span className="font-mono font-semibold">{ticketCode}</span> could
                not be found.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Events
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { ticket, event, tier, order, attendee, seat } = ticketData;
  const isValid = ticket.status === "VALID";
  const isUpcoming = event.startDate && event.startDate >= Date.now();

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Events</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Ticket Status Banner */}
          <div
            className={`rounded-lg p-6 mb-6 ${
              isValid ? "bg-primary text-white" : "bg-primary text-white"
            }`}
          >
            <div className="flex items-center gap-4">
              {isValid ? (
                <CheckCircle className="w-12 h-12 flex-shrink-0" />
              ) : (
                <XCircle className="w-12 h-12 flex-shrink-0" />
              )}
              <div>
                <h1 className="text-2xl font-bold mb-1">
                  {isValid ? "Valid Ticket" : "Invalid Ticket"}
                </h1>
                <p className="text-white/90">
                  {isValid
                    ? "This ticket is valid and ready for use"
                    : "This ticket has been used or is no longer valid"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column - Event Details */}
            <div className="space-y-6">
              {/* Event Card */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {event.imageUrl && (
                  <div className="h-48 bg-muted">
                    <img
                      src={event.imageUrl}
                      alt={event.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-foreground mb-4">{event.name}</h2>

                  {event.description && <p className="text-muted-foreground mb-6">{event.description}</p>}

                  <div className="space-y-3">
                    {event.startDate && (
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-foreground">
                            {format(event.startDate, "EEEE, MMMM d, yyyy")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(event.startDate, "h:mm a")}
                            {event.endDate && ` - ${format(event.endDate, "h:mm a")}`}
                          </p>
                        </div>
                      </div>
                    )}

                    {event.location && typeof event.location === "object" && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          {event.location.venueName && (
                            <p className="font-semibold text-foreground">
                              {event.location.venueName}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {event.location.address && `${event.location.address}, `}
                            {event.location.city}, {event.location.state} {event.location.zipCode}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendee Info */}
              {attendee && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">Attendee Information</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-semibold text-foreground">
                        {attendee.name || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-semibold text-foreground">{attendee.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Ticket Details */}
            <div className="space-y-6">
              {/* QR Code */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 text-center">Ticket QR Code</h3>
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white border-4 border-border rounded-lg">
                    <QRCodeSVG
                      value={ticket.ticketCode || ticketCode}
                      size={200}
                      level="M"
                      marginSize={2}
                    />
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground">Scan at event entrance</p>
              </div>

              {/* Ticket Details */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Ticket Details</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-muted-foreground">Ticket Code</dt>
                    <dd className="font-mono text-lg font-bold text-foreground">
                      {ticket.ticketCode}
                    </dd>
                  </div>

                  {tier && (
                    <>
                      <div>
                        <dt className="text-sm text-muted-foreground">Ticket Type</dt>
                        <dd className="font-semibold text-foreground">{tier.name}</dd>
                      </div>
                      {tier.price && (
                        <div>
                          <dt className="text-sm text-muted-foreground">Price</dt>
                          <dd className="font-semibold text-foreground">
                            ${(tier.price / 100).toFixed(2)}
                          </dd>
                        </div>
                      )}
                    </>
                  )}

                  {seat && (
                    <div className="bg-accent border-2 border-border rounded-lg p-4 -mx-2">
                      <dt className="text-primary font-semibold flex items-center gap-2 mb-2">
                        <Armchair className="w-5 h-5" />
                        Assigned Seat
                      </dt>
                      <dd className="text-foreground font-bold text-xl">
                        {seat.sectionName} • Row {seat.rowLabel} • Seat {seat.seatNumber}
                      </dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-sm text-muted-foreground">Status</dt>
                    <dd className={`font-semibold ${isValid ? "text-success" : "text-destructive"}`}>
                      {ticket.status}
                    </dd>
                  </div>

                  {order?.paidAt && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Purchased</dt>
                      <dd className="text-foreground">
                        {format(order.paidAt, "MMM d, yyyy 'at' h:mm a")}
                      </dd>
                    </div>
                  )}

                  {ticket.scannedAt && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Scanned</dt>
                      <dd className="text-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {format(ticket.scannedAt, "MMM d, yyyy 'at' h:mm a")}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Action Button */}
              {isUpcoming && isValid && (
                <Link
                  href="/my-tickets"
                  className="block w-full text-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                >
                  View All My Tickets
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
