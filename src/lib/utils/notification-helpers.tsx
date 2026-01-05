/**
 * Notification helper utilities for icons and formatting
 */

import {
  Bell,
  Ticket,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  MessageCircle,
  AlertCircle,
  CheckCircle
} from "lucide-react";

/**
 * Get the appropriate icon component for a notification type
 * @param type - Notification type string
 * @returns React icon component
 */
export function getNotificationIcon(type: string) {
  switch (type) {
    case "ticket":
    case "ticket_assignment":
      return <Ticket className="h-5 w-5 text-primary" />;
    case "sale":
    case "payout":
      return <DollarSign className="h-5 w-5 text-success" />;
    case "event":
      return <Calendar className="h-5 w-5 text-warning" />;
    case "associate":
    case "team":
      return <Users className="h-5 w-5 text-primary" />;
    case "message":
      return <MessageCircle className="h-5 w-5 text-primary" />;
    case "alert":
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    case "success":
      return <CheckCircle className="h-5 w-5 text-success" />;
    case "trending":
      return <TrendingUp className="h-5 w-5 text-primary" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
}
