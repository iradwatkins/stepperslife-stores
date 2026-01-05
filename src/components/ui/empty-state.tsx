"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon, FileQuestion, Inbox, Search, ShoppingCart, Calendar, Ticket, Users } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  /** Primary action button */
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

/**
 * A reusable empty state component for pages with no data.
 * Provides consistent messaging and call-to-action for empty lists/tables.
 *
 * @example
 * // Basic usage
 * <EmptyState
 *   icon={Ticket}
 *   title="No tickets yet"
 *   description="You haven't purchased any tickets. Browse events to get started!"
 *   action={{ label: "Browse Events", href: "/events" }}
 * />
 *
 * @example
 * // With onClick action
 * <EmptyState
 *   icon={Users}
 *   title="No team members"
 *   description="Add team members to help manage your events."
 *   action={{ label: "Add Team Member", onClick: () => setShowModal(true) }}
 * />
 */
export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            action.href ? (
              <Button asChild>
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button onClick={action.onClick}>{action.label}</Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Button variant="outline" asChild>
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pre-configured empty states for common scenarios.
 * Use these for consistency across the app.
 */

export function EmptyTickets({ action }: { action?: EmptyStateProps["action"] }) {
  return (
    <EmptyState
      icon={Ticket}
      title="No tickets yet"
      description="You haven't purchased any tickets. Browse events to find something exciting!"
      action={action || { label: "Browse Events", href: "/events" }}
    />
  );
}

export function EmptyEvents({ action }: { action?: EmptyStateProps["action"] }) {
  return (
    <EmptyState
      icon={Calendar}
      title="No events found"
      description="There are no events matching your criteria. Try adjusting your filters or check back later."
      action={action}
    />
  );
}

export function EmptyOrders({ action }: { action?: EmptyStateProps["action"] }) {
  return (
    <EmptyState
      icon={ShoppingCart}
      title="No orders yet"
      description="You haven't placed any orders. Start shopping to see your orders here."
      action={action || { label: "Browse Products", href: "/marketplace" }}
    />
  );
}

export function EmptySearch({ query, action }: { query?: string; action?: EmptyStateProps["action"] }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={
        query
          ? `We couldn't find anything matching "${query}". Try different keywords.`
          : "No results match your search criteria. Try adjusting your filters."
      }
      action={action}
    />
  );
}

export function EmptyTeam({ action }: { action?: EmptyStateProps["action"] }) {
  return (
    <EmptyState
      icon={Users}
      title="No team members"
      description="Add team members to help you manage events, sell tickets, and check in attendees."
      action={action}
    />
  );
}

export function EmptyInbox({ action }: { action?: EmptyStateProps["action"] }) {
  return (
    <EmptyState
      icon={Inbox}
      title="No messages"
      description="Your inbox is empty. Messages and notifications will appear here."
      action={action}
    />
  );
}
