"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  ShoppingCart,
  Calendar,
  Ticket,
  GraduationCap,
  DollarSign,
  Star,
  MessageSquare,
  Info,
  Megaphone,
  Check,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

interface NotificationDropdownProps {
  onClose: () => void;
  onViewAll: () => void;
}

const notificationIcons: Record<string, React.ElementType> = {
  order: ShoppingCart,
  event: Calendar,
  ticket: Ticket,
  class: GraduationCap,
  payout: DollarSign,
  review: Star,
  message: MessageSquare,
  system: Info,
  promotion: Megaphone,
};

const notificationColors: Record<string, string> = {
  order: "bg-green-100 text-green-600",
  event: "bg-blue-100 text-blue-600",
  ticket: "bg-purple-100 text-purple-600",
  class: "bg-orange-100 text-orange-600",
  payout: "bg-emerald-100 text-emerald-600",
  review: "bg-yellow-100 text-yellow-600",
  message: "bg-pink-100 text-pink-600",
  system: "bg-gray-100 text-gray-600",
  promotion: "bg-red-100 text-red-600",
};

export function NotificationDropdown({
  onClose,
  onViewAll,
}: NotificationDropdownProps) {
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Get recent notifications (limit 5 for dropdown) - includes both read and unread
  const notifications =
    useQuery(api.notifications.queries.getMyNotifications, {
      limit: 5,
    }) ?? [];

  const unreadCount = useQuery(api.notifications.queries.getUnreadCount) ?? 0;

  const markAsRead = useMutation(api.notifications.mutations.markAsRead);
  const markAllAsRead = useMutation(api.notifications.mutations.markAllAsRead);

  const handleNotificationClick = async (
    notificationId: Id<"notifications">,
    isRead: boolean
  ) => {
    if (!isRead) {
      try {
        await markAsRead({ notificationId });
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }
    onClose();
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      const result = await markAllAsRead({});
      toast.success(`Marked ${result.count} notifications as read`);
    } catch (error) {
      toast.error("Failed to mark all as read");
      console.error("Failed to mark all as read:", error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-lg border bg-white shadow-lg z-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold text-gray-900">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-blue-600 hover:text-blue-700"
            onClick={handleMarkAllRead}
            disabled={markingAllRead}
          >
            {markingAllRead ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <CheckCheck className="mr-1 h-3 w-3" />
            )}
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Bell className="mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <ul className="divide-y">
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type] || Bell;
              const colorClass =
                notificationColors[notification.type] ||
                "bg-gray-100 text-gray-600";

              const content = (
                <li
                  className={cn(
                    "flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50 cursor-pointer",
                    !notification.isRead && "bg-blue-50/50"
                  )}
                  onClick={() =>
                    handleNotificationClick(
                      notification._id,
                      notification.isRead
                    )
                  }
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      colorClass
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm",
                          !notification.isRead
                            ? "font-semibold text-gray-900"
                            : "font-medium text-gray-700"
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDistanceToNow(notification.createdAt, {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </li>
              );

              // Wrap in Link if there's a linkUrl
              if (notification.linkUrl) {
                return (
                  <Link
                    key={notification._id}
                    href={notification.linkUrl}
                    onClick={() =>
                      handleNotificationClick(
                        notification._id,
                        notification.isRead
                      )
                    }
                  >
                    {content}
                  </Link>
                );
              }

              return <div key={notification._id}>{content}</div>;
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3">
        <Link
          href="/user/notifications"
          className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700"
          onClick={onViewAll}
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}
