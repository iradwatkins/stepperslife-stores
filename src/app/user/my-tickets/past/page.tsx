"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ticket, Calendar, MapPin, CheckCircle, Download, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function PastTicketsPage() {
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - will be replaced with actual Convex query
  const tickets: any[] = [];

  const filteredTickets = tickets.filter((ticket: any) =>
    ticket.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
          <span>Past Events</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Past Events</h1>
        <p className="text-muted-foreground mt-2">
          Events you've attended
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search past events..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">
              {searchTerm ? "No events found" : "No past events"}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchTerm
                ? "Try adjusting your search"
                : "Your attended events will appear here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket: any) => (
            <Card key={ticket.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Date Badge */}
                  <div className="flex-shrink-0 w-16 h-16 bg-muted rounded-lg flex flex-col items-center justify-center">
                    <div className="text-xl font-bold">
                      {new Date(ticket.eventDate).getDate()}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase">
                      {new Date(ticket.eventDate).toLocaleString("en-US", {
                        month: "short",
                      })}
                    </div>
                  </div>

                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {ticket.eventName}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(ticket.eventDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">
                              {typeof ticket.location === 'string'
                                ? ticket.location
                                : ticket.location && [ticket.location.venueName, ticket.location.city, ticket.location.state].filter(Boolean).join(', ')}
                            </span>
                          </div>
                          {ticket.scanned && (
                            <div className="flex items-center gap-1 text-success">
                              <CheckCircle className="h-3 w-3" />
                              <span>Attended</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Receipt
                        </Button>
                      </div>
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
