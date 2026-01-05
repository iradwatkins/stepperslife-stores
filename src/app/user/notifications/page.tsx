"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
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
  CheckCheck,
  Trash2,
  Loader2,
  Filter,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const notificationTypeLabels: Record<string, string> = {
  order: "Orders",
  event: "Events",
  ticket: "Tickets",
  class: "Classes",
  payout: "Payouts",
  review: "Reviews",
  message: "Messages",
  system: "System",
  promotion: "Promotions",
};

type FilterType = "all" | "unread" | "read";

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isDeletingRead, setIsDeletingRead] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"notifications"> | null>(
    null
  );

  // Queries - use getMyNotifications with unreadOnly param
  const notificationsData = useQuery(
    api.notifications.queries.getMyNotifications,
    {
      limit: 50,
      unreadOnly: filter === "unread" ? true : undefined,
    }
  );
  const unreadCount = useQuery(api.notifications.queries.getUnreadCount) ?? 0;

  // Mutations
  const markAsRead = useMutation(api.notifications.mutations.markAsRead);
  const markAllAsRead = useMutation(api.notifications.mutations.markAllAsRead);
  const deleteNotification = useMutation(
    api.notifications.mutations.deleteNotification
  );

  // Filter client-side for "read" filter since API only supports unreadOnly
  const notifications = (notificationsData ?? []).filter(n => {
    if (filter === "read") return n.isRead;
    return true; // "all" or "unread" already handled by query
  });

  const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
    try {
      await markAsRead({ notificationId });
    } catch (error) {
      toast.error("Failed to mark as read");
      console.error(error);
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAllRead(true);
    try {
      const result = await markAllAsRead({});
      toast.success(`Marked ${result.count} notifications as read`);
    } catch (error) {
      toast.error("Failed to mark all as read");
      console.error(error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleDelete = async (notificationId: Id<"notifications">) => {
    setDeletingId(notificationId);
    try {
      await deleteNotification({ notificationId });
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  // Note: deleteAllRead mutation is not yet implemented
  // const handleDeleteAllRead = async () => {
  //   setIsDeletingRead(true);
  //   try {
  //     const result = await deleteAllRead({});
  //     toast.success(`Deleted ${result.count} read notifications`);
  //   } catch (error) {
  //     toast.error("Failed to delete read notifications");
  //     console.error(error);
  //   } finally {
  //     setIsDeletingRead(false);
  //   }
  // };

  // Group notifications by date
  const groupedNotifications = notifications.reduce(
    (groups, notification) => {
      const date = format(notification.createdAt, "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notification);
      return groups;
    },
    {} as Record<string, typeof notifications>
  );

  const dateLabels: Record<string, string> = {};
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    "yyyy-MM-dd"
  );

  Object.keys(groupedNotifications).forEach((date) => {
    if (date === today) {
      dateLabels[date] = "Today";
    } else if (date === yesterday) {
      dateLabels[date] = "Yesterday";
    } else {
      dateLabels[date] = format(new Date(date), "MMMM d, yyyy");
    }
  });

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/user/dashboard"
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="mt-1 text-sm text-gray-600">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>
          <Bell className="h-8 w-8 text-gray-400" />
        </div>
      </div>

      {/* Actions Bar */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select
                value={filter}
                onValueChange={(value) => setFilter(value as FilterType)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAllRead}
                >
                  {isMarkingAllRead ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="mr-1 h-4 w-4" />
                  )}
                  Mark all read
                </Button>
              )}
              {/* Delete all read button - disabled until mutation is implemented */}
              {/* <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAllRead}
                disabled={isDeletingRead}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isDeletingRead ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-1 h-4 w-4" />
                )}
                Clear read
              </Button> */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {notificationsData === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Bell className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900">
                No notifications
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === "unread"
                  ? "You're all caught up! No unread notifications."
                  : filter === "read"
                    ? "No read notifications to show."
                    : "You don't have any notifications yet."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, dayNotifications]) => (
            <div key={date}>
              {/* Date Header */}
              <h2 className="mb-3 text-sm font-semibold text-gray-500">
                {dateLabels[date]}
              </h2>

              {/* Notifications for this date */}
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {dayNotifications.map((notification) => {
                      const Icon =
                        notificationIcons[notification.type] || Bell;
                      const colorClass =
                        notificationColors[notification.type] ||
                        "bg-gray-100 text-gray-600";

                      const notificationContent = (
                        <li
                          className={cn(
                            "flex items-start gap-4 p-4 transition-colors",
                            !notification.isRead && "bg-blue-50/50",
                            notification.linkUrl && "hover:bg-gray-50 cursor-pointer"
                          )}
                          onClick={() => {
                            if (!notification.isRead) {
                              handleMarkAsRead(notification._id);
                            }
                          }}
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
                              <div>
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
                                <span className="text-xs text-gray-400">
                                  {notificationTypeLabels[notification.type]}
                                </span>
                              </div>
                              {!notification.isRead && (
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <p className="mt-1 text-sm text-gray-600">
                              {notification.message}
                            </p>
                            <div className="mt-2 flex items-center gap-3">
                              <span className="text-xs text-gray-400">
                                {formatDistanceToNow(notification.createdAt, {
                                  addSuffix: true,
                                })}
                              </span>
                              {notification.linkUrl && (
                                <span className="text-xs text-blue-600">
                                  View details →
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex shrink-0 gap-1">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleMarkAsRead(notification._id);
                                }}
                                title="Mark as read"
                              >
                                <CheckCheck className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDelete(notification._id);
                              }}
                              disabled={deletingId === notification._id}
                              title="Delete"
                            >
                              {deletingId === notification._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </li>
                      );

                      if (notification.linkUrl) {
                        return (
                          <Link
                            key={notification._id}
                            href={notification.linkUrl}
                          >
                            {notificationContent}
                          </Link>
                        );
                      }

                      return (
                        <div key={notification._id}>{notificationContent}</div>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Load More - disabled until pagination is implemented */}
      {/* {notifications.length >= 50 && (
        <div className="mt-6 text-center">
          <Button variant="outline">Load more</Button>
        </div>
      )} */}
    </div>
  );
}
