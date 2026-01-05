"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ScanLine } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

/**
 * FloatingScanButton
 *
 * A floating action button for staff/organizers to quickly access the ticket scanner.
 * Now appears on BOTH mobile and desktop for authenticated users with scanning permissions.
 *
 * Features:
 * - Shows badge with count of today's scannable events
 * - Visible on all screen sizes (positioned differently for desktop)
 * - Only for users who can scan tickets (staff, team members with canScan, organizers, admins)
 * - Hidden on scanner pages (already there)
 * - Hidden on checkout pages (cleaner payment experience)
 * - Positioned above bottom navigation where applicable on mobile
 */
export function FloatingScanButton() {
  const pathname = usePathname();

  // Query to check if user has any scannable events
  // This implicitly checks authentication and staff permissions
  const scannableEvents = useQuery(api.scanning.queries.getMyScannableEvents);

  // Query to get today's events specifically (for badge count)
  const todaysEvents = useQuery(api.scanning.queries.getTodaysScannableEvents);

  // Hide on certain pages
  const hideOnPaths = [
    "/staff/scan-tickets",
    "/scan/",
    "/checkout",
    "/login",
    "/register",
    "/activate",
  ];
  const shouldHide = hideOnPaths.some((path) => pathname?.includes(path));

  // Don't show if:
  // - Still loading (scannableEvents === undefined)
  // - User has no scannable events (not authorized)
  // - Should be hidden based on current route
  if (shouldHide || scannableEvents === undefined || scannableEvents.length === 0) {
    return null;
  }

  // Count of today's events for badge
  const todaysEventCount = todaysEvents?.length || 0;

  // Determine if we're in a dashboard context (has bottom workspace bar)
  const dashboardPaths = [
    "/organizer",
    "/admin",
    "/staff",
    "/team",
    "/associate",
    "/restaurateur",
    "/user",
    "/vendor",
    "/team-member",
  ];
  const isDashboardRoute = dashboardPaths.some((path) => pathname?.startsWith(path));

  // Determine if public bottom nav is visible
  const publicNavHiddenPaths = [
    "/organizer",
    "/admin",
    "/staff",
    "/login",
    "/scan",
    "/checkout",
  ];
  const hasPublicBottomNav = !publicNavHiddenPaths.some(
    (path) => pathname?.startsWith(path) || pathname?.includes("/checkout")
  );

  // Calculate bottom position based on what's below
  // - If dashboard route with workspace bar: bottom-20 (above 56px bar)
  // - If public route with bottom nav: bottom-20 (above 64px nav)
  // - Otherwise: bottom-6
  // Desktop always uses bottom-6
  const bottomPosition = isDashboardRoute || hasPublicBottomNav ? "bottom-20 md:bottom-6" : "bottom-6";

  return (
    <Link
      href="/staff/scan-tickets"
      className={cn(
        // Base styles - now visible on all screen sizes
        "fixed right-4 z-40",
        bottomPosition,
        // Button appearance - slightly larger on desktop
        "flex items-center justify-center",
        "w-14 h-14 md:w-16 md:h-16 rounded-full",
        "bg-primary text-primary-foreground",
        "shadow-lg shadow-primary/30",
        // Interaction states
        "active:scale-95 transition-all duration-200",
        "hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/40",
        // Add subtle animation
        "group"
      )}
      aria-label={`Scan Tickets${todaysEventCount > 0 ? ` - ${todaysEventCount} events today` : ''}`}
      title={todaysEventCount > 0 ? `${todaysEventCount} event${todaysEventCount > 1 ? 's' : ''} today` : 'Scan Tickets'}
    >
      {/* Icon with hover effect */}
      <ScanLine className="w-6 h-6 md:w-7 md:h-7 group-hover:scale-110 transition-transform" />

      {/* Badge for today's events count */}
      {todaysEventCount > 0 && (
        <span className={cn(
          "absolute -top-1 -right-1",
          "flex items-center justify-center",
          "min-w-[22px] h-[22px] px-1.5",
          "text-xs font-bold",
          "bg-destructive text-destructive-foreground",
          "rounded-full",
          "border-2 border-background",
          "shadow-sm",
          // Pulse animation for attention
          "animate-pulse"
        )}>
          {todaysEventCount > 9 ? "9+" : todaysEventCount}
        </span>
      )}
    </Link>
  );
}
