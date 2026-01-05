"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ticket, Calendar, MapPin, QrCode, Download, Share2, Clock } from "lucide-react";
import Link from "next/link";

export default function UpcomingTicketsPage() {
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  // Mock data - will be replaced with actual Convex query
  const tickets: any[] = [];

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
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

  const getDaysUntil = (timestamp: number) => {
    const days = Math.ceil((timestamp - Date.now()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `In ${days} days`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/user/my-tickets" className="hover:text-foreground">
            My Tickets
          </Link>
          <span>/</span>
          <span>Upcoming Events</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Upcoming Events</h1>
        <p className="text-muted-foreground mt-2">
          {tickets.length} {tickets.length === 1 ? "event" : "events"} you're attending
        </p>
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No upcoming events</p>
            <p className="text-sm text-muted-foreground mb-4">
              Browse events and purchase tickets to see them here
            </p>
            <Button asChild>
              <Link href="/user/browse-events">Browse Events</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket: any) => (
            <Card key={ticket.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* QR Code */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                      <QrCode className="h-16 w-16 text-muted-foreground" />
                    </div>
                    <Button className="w-full mt-2" size="sm">
                      <QrCode className="h-4 w-4 mr-2" />
                      Show QR
                    </Button>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-success/20 text-success text-xs font-medium rounded">
                            {getDaysUntil(ticket.eventDate)}
                          </span>
                        </div>
                        <h3 className="text-2xl font-bold">{ticket.eventName}</h3>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-success/20 text-success">
                        Active
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 mb-4">
                      <div className="flex items-start gap-2 text-sm">
                        <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{formatDate(ticket.eventDate)}</div>
                          <div className="text-muted-foreground">{formatTime(ticket.eventDate)}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {typeof ticket.location === 'string'
                              ? ticket.location
                              : ticket.location && [ticket.location.venueName, ticket.location.city, ticket.location.state].filter(Boolean).join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Ticket className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Ticket #{ticket.ticketNumber}</div>
                          <div className="text-muted-foreground">{ticket.ticketType}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Gates open: {ticket.gatesOpen || "TBA"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                      <Button variant="outline" size="sm">
                        Add to Calendar
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/events/${ticket.eventId}`}>View Event</Link>
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
  );
}
