"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ticket, Check, AlertCircle, Loader2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

export default function ActivatePage() {
  const [activationCode, setActivationCode] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activated, setActivated] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);

  const activateTicket = useMutation(api.tickets.mutations.activateTicket);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate input
      if (!activationCode || activationCode.length !== 4) {
        throw new Error("Please enter a valid 4-digit activation code");
      }

      if (!email) {
        throw new Error("Please enter your email address");
      }

      // Activate the ticket
      const result = await activateTicket({
        activationCode,
        customerEmail: email,
        customerName: name || undefined,
      });

      setTicketData(result);
      setActivated(true);
    } catch (err: any) {
      setError(err.message || "Failed to activate ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (activated && ticketData) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
          {/* Success Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full mb-4">
              <Check className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Ticket Activated!</h1>
            <p className="text-muted-foreground">Your ticket has been successfully activated</p>
          </div>

          {/* QR Code */}
          <div className="bg-muted rounded-xl p-6 mb-6 text-center">
            <QRCodeCanvas
              value={`https://events.stepperslife.com/ticket/${ticketData.ticketCode}`}
              size={200}
              className="mx-auto mb-4"
            />
            <p className="text-sm text-muted-foreground mb-1">Ticket Code:</p>
            <p className="text-xs font-mono bg-white px-3 py-2 rounded border border-border inline-block">
              {ticketData.ticketCode}
            </p>
          </div>

          {/* Event Details */}
          <div className="space-y-3 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Event</p>
              <p className="font-semibold text-foreground">{ticketData.eventName}</p>
            </div>
            {ticketData.eventDate && (
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium text-foreground">{formatDate(ticketData.eventDate)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Ticket Type</p>
              <p className="font-medium text-foreground">{ticketData.tierName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Attendee</p>
              <p className="font-medium text-foreground">{ticketData.attendeeName}</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-accent border border-border rounded-lg p-4 mb-6">
            <p className="text-sm text-foreground">
              <strong>Important:</strong> Save this QR code! You'll need it to enter the event. A
              confirmation email has been sent to <strong>{ticketData.attendeeEmail}</strong>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => window.print()}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Print Ticket
            </button>
            <a
              href={`/ticket/${ticketData.ticketCode}`}
              className="block w-full bg-muted text-foreground py-3 px-4 rounded-lg font-medium hover:bg-muted/80 transition-colors text-center"
            >
              View Full Ticket
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-full mb-4">
            <Ticket className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Activate Your Ticket</h1>
          <p className="text-muted-foreground">Enter the 4-digit code provided by your ticket seller</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Activation Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Activation Code Input */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-foreground mb-2">
              Activation Code <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              id="code"
              value={activationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                setActivationCode(value);
              }}
              placeholder="0000"
              maxLength={4}
              className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border-2 border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
              required
              autoFocus
            />
            <p className="mt-1 text-xs text-muted-foreground">Enter the 4-digit code from your receipt</p>
          </div>

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Email Address <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border-2 border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">Your ticket will be sent to this email</p>
          </div>

          {/* Name Input (Optional) */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
              Full Name <span className="text-muted-foreground">(Optional)</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-3 border-2 border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || activationCode.length !== 4 || !email}
            className="w-full bg-primary text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-muted-foreground disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <Ticket className="w-5 h-5" />
                Activate Ticket
              </>
            )}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Lost your activation code?{" "}
            <a href="/help" className="text-primary hover:text-primary font-medium">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
