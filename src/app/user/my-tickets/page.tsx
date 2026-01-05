"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ticket as TicketIcon, Calendar, MapPin, QrCode, Download, Share2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface TicketData {
  id: string;
  eventName: string;
  eventDate: number;
  location: string | {
    venueName?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  ticketNumber: string;
  status: string;
}

export default function MyTicketsPage() {
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  // Mock ticket data - will be replaced with actual Convex query
  const tickets: TicketData[] = [];

  const upcomingTickets = tickets.filter((ticket) =>
    ticket.eventDate > Date.now()
  );
  const pastTickets = tickets.filter((ticket) =>
    ticket.eventDate <= Date.now()
  );

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
        <h1 className="text-3xl font-bold tracking-tight">My Tickets</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your event tickets
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <TicketIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tickets.length}</div>
            <p className="text-xs text-muted-foreground">All time purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTickets.length}</div>
            <p className="text-xs text-muted-foreground">Events to attend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pastTickets.length}</div>
            <p className="text-xs text-muted-foreground">Previously attended</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links to Submenu */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/user/my-tickets/upcoming">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Upcoming Events</CardTitle>
                    <CardDescription className="mt-1">
                      {upcomingTickets.length} tickets
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/user/my-tickets/past">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Past Events</CardTitle>
                    <CardDescription className="mt-1">
                      {pastTickets.length} tickets
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/user/my-tickets/history">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TicketIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Ticket History</CardTitle>
                    <CardDescription className="mt-1">
                      View all transactions
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {/* Recent Tickets */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Recent Tickets</h2>
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <TicketIcon className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No tickets yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Start by browsing events and purchasing tickets
              </p>
              <Button asChild>
                <Link href="/user/browse-events">Browse Events</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tickets.slice(0, 5).map((ticket) => (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* QR Code Placeholder */}
                    <div className="flex-shrink-0 w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                      <QrCode className="h-12 w-12 text-muted-foreground" />
                    </div>

                    {/* Ticket Details */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-semibold">{ticket.eventName}</h3>
                          <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {formatDate(ticket.eventDate)} at {formatTime(ticket.eventDate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>
                                {typeof ticket.location === 'string'
                                  ? ticket.location
                                  : ticket.location && [ticket.location.venueName, ticket.location.city, ticket.location.state].filter(Boolean).join(', ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <TicketIcon className="h-4 w-4" />
                              <span>Ticket #{ticket.ticketNumber}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            ticket.status === "active"
                              ? "bg-success/20 text-success"
                              : "bg-muted text-foreground"
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <Button size="sm">
                          <QrCode className="h-4 w-4 mr-2" />
                          View QR Code
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button size="sm" variant="outline">
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
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
