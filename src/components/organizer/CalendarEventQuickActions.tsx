"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Calendar,
  Edit,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  TicketCheck,
  Ticket,
  BarChart3,
  BookOpen,
  Link2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetBody,
} from "@/components/ui/bottom-sheet";
import { EditScopeDialog } from "./EditScopeDialog";

export interface QuickActionsEvent {
  id: string;
  title: string;
  start: Date;
  imageUrl?: string;
  status: string;
  type: "event" | "class";
  eventType?: string;
  danceStyle?: string;
  seriesId?: string;
}

interface CalendarEventQuickActionsProps {
  open: boolean;
  onClose: () => void;
  event: QuickActionsEvent | null;

  // Navigation actions
  onEdit: () => void;
  onEditSeries?: () => void;
  onTickets?: () => void;
  onPackages?: () => void;
  onViewPublic: () => void;
  onDashboard?: () => void;

  // Mutation actions
  onPublish: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDeleteSeries?: () => void;

  // Loading states
  isPublishing?: boolean;
  isDeletingSeries?: boolean;
}

export function CalendarEventQuickActions({
  open,
  onClose,
  event,
  onEdit,
  onEditSeries,
  onTickets,
  onPackages,
  onViewPublic,
  onDashboard,
  onPublish,
  onDuplicate,
  onDelete,
  onDeleteSeries,
  isPublishing,
  isDeletingSeries,
}: CalendarEventQuickActionsProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [showEditScopeDialog, setShowEditScopeDialog] = useState(false);

  // Fetch series info if this is a class (non-event) and modal is open
  const seriesInfo = useQuery(
    api.events.queries.getSeriesInfo,
    event && !event.type.includes("event") && open
      ? { eventId: event.id as Id<"events"> }
      : "skip"
  );

  // Detect mobile on client side
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!event) return null;

  const isPublished = event.status === "PUBLISHED";
  const isEvent = event.type === "event";
  const isUpcoming = event.start > new Date();

  // Shared content for both modal types
  const EventHeader = () => (
    <div className="flex items-start gap-4 mb-4">
      {/* Event Image or Icon */}
      <div className="w-16 h-16 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div className={`w-full h-full flex items-center justify-center bg-primary ${event.imageUrl ? "hidden" : ""}`}>
          {isEvent ? (
            <Calendar className="w-6 h-6 text-white opacity-70" />
          ) : (
            <BookOpen className="w-6 h-6 text-white opacity-70" />
          )}
        </div>
      </div>

      {/* Event Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-lg text-foreground truncate">{event.title}</h3>
        <p className="text-sm text-muted-foreground">
          {format(event.start, "EEEE, MMMM d, yyyy")}
        </p>
        <p className="text-sm text-muted-foreground">
          {format(event.start, "h:mm a")}
        </p>
        <div className="flex items-center gap-2 mt-2">
          {isPublished ? (
            <span className="px-2 py-0.5 text-xs font-semibold bg-success/10 text-success rounded-full flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Published
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs font-semibold bg-warning/10 text-warning rounded-full flex items-center gap-1">
              <EyeOff className="w-3 h-3" />
              Draft
            </span>
          )}
          {isUpcoming && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-info/20 text-info rounded-full">
              Upcoming
            </span>
          )}
          {event.eventType && isEvent && (
            <span className="px-2 py-0.5 text-xs font-medium bg-muted text-foreground rounded-full">
              {event.eventType.replace("_", " ")}
            </span>
          )}
          {event.danceStyle && !isEvent && (
            <span className="px-2 py-0.5 text-xs font-medium bg-muted text-foreground rounded-full">
              {event.danceStyle.replace("_", " ")}
            </span>
          )}
          {/* Series Badge - Shows "Week X of Y" for recurring classes */}
          {seriesInfo?.isSeries && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary rounded-full flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              Week {seriesInfo.position} of {seriesInfo.totalCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // Handle edit button click - show scope dialog for series classes
  const handleEditClick = () => {
    if (!isEvent && seriesInfo?.isSeries && onEditSeries) {
      // Show scope dialog for series classes
      setShowEditScopeDialog(true);
    } else {
      // Direct edit for non-series classes and events
      onEdit();
      onClose();
    }
  };

  const ActionButtons = () => (
    <div className="space-y-3">
      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleEditClick}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>

        {isEvent && onTickets && (
          <button
            onClick={() => {
              onTickets();
              onClose();
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <TicketCheck className="w-4 h-4" />
            Tickets
          </button>
        )}

        {!isEvent && onPackages && (
          <button
            onClick={() => {
              onPackages();
              onClose();
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-medium"
          >
            <Ticket className="w-4 h-4" />
            Packages
          </button>
        )}
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            onViewPublic();
            onClose();
          }}
          className="flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium text-foreground"
        >
          <Eye className="w-4 h-4" />
          View Public
        </button>

        {isEvent && onDashboard && (
          <button
            onClick={() => {
              onDashboard();
              onClose();
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium text-foreground"
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </button>
        )}

        {!isEvent && (
          <button
            onClick={() => {
              onDuplicate();
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-primary/30 bg-primary/5 text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
        )}
      </div>

      {/* Tertiary Actions */}
      <div className="grid grid-cols-2 gap-2">
        {isEvent && (
          <button
            onClick={() => {
              onDuplicate();
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-primary/30 bg-primary/5 text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
        )}

        <button
          onClick={() => {
            onPublish();
          }}
          disabled={isPublishing}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium disabled:opacity-50 ${
            isPublished
              ? "bg-success text-white hover:bg-success/90"
              : "bg-warning text-white hover:bg-warning/90"
          }`}
        >
          {isPublishing ? (
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : isPublished ? (
            <>
              <Eye className="w-4 h-4" />
              Published
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" />
              Publish
            </>
          )}
        </button>

        {!isEvent && (
          <button
            onClick={() => {
              onDelete();
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>

      {/* Delete Series - Only show for classes that are part of a series */}
      {!isEvent && seriesInfo?.isSeries && onDeleteSeries && (
        <button
          onClick={() => {
            onDeleteSeries();
          }}
          disabled={isDeletingSeries}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors font-medium disabled:opacity-50"
        >
          {isDeletingSeries ? (
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <>
              <Link2 className="w-4 h-4" />
              Delete Entire Series ({seriesInfo.totalCount} classes)
            </>
          )}
        </button>
      )}

      {/* Delete for events (full width) */}
      {isEvent && (
        <button
          onClick={() => {
            onDelete();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      )}
    </div>
  );

  // Render mobile BottomSheet
  if (isMobile) {
    return (
      <>
        <BottomSheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
          <BottomSheetContent size="auto">
            <BottomSheetHeader>
              <BottomSheetTitle className="sr-only">Quick Actions</BottomSheetTitle>
            </BottomSheetHeader>
            <BottomSheetBody>
              <EventHeader />
              <ActionButtons />
            </BottomSheetBody>
          </BottomSheetContent>
        </BottomSheet>

        {/* Edit Scope Dialog for series classes */}
        {seriesInfo?.isSeries && onEditSeries && (
          <EditScopeDialog
            open={showEditScopeDialog}
            onClose={() => setShowEditScopeDialog(false)}
            onEditSingle={() => {
              onEdit();
              onClose();
            }}
            onEditSeries={() => {
              onEditSeries();
              onClose();
            }}
            eventTitle={event.title}
            eventDate={event.start}
            seriesCount={seriesInfo.totalCount}
          />
        )}
      </>
    );
  }

  // Render desktop Dialog
  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Quick Actions</DialogTitle>
            <DialogDescription className="sr-only">
              Manage your {isEvent ? "event" : "class"}
            </DialogDescription>
          </DialogHeader>
          <EventHeader />
          <ActionButtons />
        </DialogContent>
      </Dialog>

      {/* Edit Scope Dialog for series classes */}
      {seriesInfo?.isSeries && onEditSeries && (
        <EditScopeDialog
          open={showEditScopeDialog}
          onClose={() => setShowEditScopeDialog(false)}
          onEditSingle={() => {
            onEdit();
            onClose();
          }}
          onEditSeries={() => {
            onEditSeries();
            onClose();
          }}
          eventTitle={event.title}
          eventDate={event.start}
          seriesCount={seriesInfo.totalCount}
        />
      )}
    </>
  );
}
