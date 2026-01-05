"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CheckCircle2, XCircle, AlertCircle, Ticket, ArrowRight, Clock } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function TransferAcceptancePage() {
  const params = useParams();
  const router = useRouter();
  const transferToken = params.transferToken as string;

  const transfer = useQuery(api.transfers.queries.getTransferByToken, { transferToken });
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const acceptTransfer = useMutation(api.transfers.mutations.acceptTransfer);

  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptanceResult, setAcceptanceResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleAcceptTransfer = async () => {
    if (!currentUser) {
      toast.error("Please sign in to accept this transfer");
      return;
    }

    setIsAccepting(true);
    try {
      await acceptTransfer({ transferToken });
      setAcceptanceResult({
        success: true,
        message: "Ticket transferred successfully! You can now view it in your tickets.",
      });

      // Redirect to my tickets after 3 seconds
      setTimeout(() => {
        router.push("/my-tickets");
      }, 3000);
    } catch (error: any) {
      setAcceptanceResult({
        success: false,
        message: error.message || "Failed to accept transfer",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  if (transfer === undefined || currentUser === undefined) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Transfer Not Found</h1>
          <p className="text-muted-foreground mb-6">This transfer link is invalid or has expired.</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = Date.now() > transfer.expiresAt;
  const canAccept = transfer.status === "PENDING" && !isExpired;

  // Success screen after accepting
  if (acceptanceResult?.success) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-10 h-10 text-success" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Transfer Complete!</h2>
          <p className="text-muted-foreground mb-6">{acceptanceResult.message}</p>
          <Link
            href="/my-tickets"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            View My Tickets
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    );
  }

  // Error screen
  if (acceptanceResult && !acceptanceResult.success) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Transfer Failed</h1>
          <p className="text-muted-foreground mb-6">{acceptanceResult.message}</p>
          <button
            onClick={() => setAcceptanceResult(null)}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Ticket className="w-8 h-8" />
                <h1 className="text-2xl font-bold">Ticket Transfer</h1>
              </div>
              <p className="text-white/80">{transfer.fromName} wants to transfer a ticket to you</p>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Status Alerts */}
              {transfer.status !== "PENDING" && (
                <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                    <div>
                      <p className="font-semibold text-warning">
                        Transfer {transfer.status.toLowerCase()}
                      </p>
                      <p className="text-sm text-warning mt-1">
                        This transfer has already been {transfer.status.toLowerCase()}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isExpired && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-semibold text-destructive">Transfer Expired</p>
                      <p className="text-sm text-destructive mt-1">
                        This transfer expired on{" "}
                        {format(transfer.expiresAt, "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Details */}
              <div className="mb-6">
                <h3 className="font-semibold text-foreground mb-3">Event Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Event</p>
                    <p className="font-medium text-foreground">{transfer.event?.name}</p>
                  </div>
                  {transfer.event?.startDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Date & Time</p>
                      <p className="font-medium text-foreground">
                        {format(transfer.event.startDate, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  )}
                  {transfer.event?.location && typeof transfer.event.location === "object" && (
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium text-foreground">
                        {transfer.event.location.venueName &&
                          `${transfer.event.location.venueName}, `}
                        {transfer.event.location.city}, {transfer.event.location.state}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Details */}
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-foreground mb-3">Ticket Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ticket Code</span>
                    <span className="font-mono font-semibold text-foreground">
                      {transfer.ticket?.ticketCode}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">From</span>
                    <span className="font-medium text-foreground">{transfer.fromName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">To</span>
                    <span className="font-medium text-foreground">{transfer.toName}</span>
                  </div>
                </div>
              </div>

              {/* Expiry Info */}
              {canAccept && (
                <div className="mb-6 p-4 bg-accent border border-border rounded-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">Transfer expires in</p>
                      <p className="text-sm text-primary mt-1">
                        {format(transfer.expiresAt, "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {!currentUser ? (
                <div className="text-center p-6 bg-muted rounded-lg">
                  <p className="text-muted-foreground mb-4">Please sign in to accept this transfer</p>
                  <Link
                    href={`/sign-in?redirect=/transfer/${transferToken}`}
                    className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    Sign In
                  </Link>
                </div>
              ) : canAccept ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleAcceptTransfer}
                    disabled={isAccepting}
                    className="flex-1 px-6 py-3 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-medium disabled:bg-muted disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAccepting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Accept Transfer
                      </>
                    )}
                  </button>
                  <Link
                    href="/"
                    className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
                  >
                    Cancel
                  </Link>
                </div>
              ) : (
                <div className="text-center">
                  <Link
                    href="/"
                    className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    Browse Events
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
