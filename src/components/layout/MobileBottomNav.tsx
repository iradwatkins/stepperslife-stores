"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Calendar, ShoppingBag, Utensils, User, Ticket, Settings, LogIn, LayoutDashboard, Shield, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Helper to determine the best account route based on user role
function getAccountRoute(user: any): string {
  if (!user) return "/login";

  // Check role and return appropriate dashboard
  switch (user.role) {
    case "admin":
      return "/admin";
    case "vendor":
      return "/vendor/dashboard";
    case "restaurateur":
      return "/restaurateur/dashboard";
    case "staff":
      return "/staff/dashboard";
    case "team":
      return "/team/dashboard";
    case "associate":
      return "/associate/dashboard";
    case "organizer":
      return "/organizer/events";
    default:
      // Regular user - go to my tickets
      return "/my-tickets";
  }
}

// Helper to get context-aware label for Account button
function getAccountLabel(user: any): string {
  if (!user) return "Sign In";

  switch (user.role) {
    case "admin":
      return "Admin";
    case "vendor":
      return "Vendor";
    case "restaurateur":
      return "Restaurant";
    case "staff":
      return "Staff";
    case "team":
      return "Team";
    case "associate":
      return "Associate";
    case "organizer":
      return "Dashboard";
    default:
      return "Tickets";
  }
}

// Helper to get the appropriate icon for account based on role
function getAccountIcon(user: any) {
  if (!user) return LogIn;

  switch (user.role) {
    case "admin":
      return Shield;
    case "staff":
    case "team":
    case "associate":
      return Users;
    case "organizer":
      return LayoutDashboard;
    default:
      return Ticket;
  }
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();

  // Paths where we show minimal nav instead of full nav
  const dashboardPaths = [
    "/organizer",
    "/admin",
    "/staff",
    "/vendor/dashboard",
    "/restaurateur",
    "/team",
    "/associate",
  ];

  // Paths where we completely hide nav
  const hideCompletely = [
    "/login",
    "/register",
    "/scan",
    "/checkout",
    "/activate",
  ];

  const isDashboard = dashboardPaths.some((path) => pathname?.startsWith(path));
  const shouldHideCompletely = hideCompletely.some(
    (path) => pathname?.startsWith(path) || pathname?.includes("/checkout")
  );

  // Completely hide on certain pages
  if (shouldHideCompletely) {
    return null;
  }

  // Show minimal nav on dashboard pages
  if (isDashboard) {
    return <MinimalDashboardNav />;
  }

  // Determine the best account route based on user role
  const accountRoute = getAccountRoute(user);
  const accountLabel = getAccountLabel(user);
  const AccountIcon = getAccountIcon(user);

  const navItems = [
    {
      href: "/",
      icon: Home,
      label: "Home",
      activePatterns: [/^\/$/],
    },
    {
      href: "/events",
      icon: Calendar,
      label: "Events",
      activePatterns: [/^\/events/],
    },
    {
      href: "/marketplace",
      icon: ShoppingBag,
      label: "Shop",
      activePatterns: [/^\/marketplace/],
    },
    {
      href: "/restaurants",
      icon: Utensils,
      label: "Food",
      activePatterns: [/^\/restaurants/],
    },
    {
      href: accountRoute,
      icon: AccountIcon,
      label: accountLabel,
      activePatterns: [/^\/my-tickets/, /^\/user\//, /^\/admin/, /^\/organizer/, /^\/staff/, /^\/team/, /^\/vendor/, /^\/restaurateur/, /^\/associate/],
    },
  ];

  const isActive = (patterns: RegExp[]) => {
    return patterns.some((pattern) => pattern.test(pathname || ""));
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.activePatterns);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                {active && (
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </div>
              <span
                className={`text-xs mt-1 transition-colors ${
                  active ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Minimal navigation bar shown on dashboard pages
 * Provides escape routes to main site without cluttering dashboard UI
 */
function MinimalDashboardNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      icon: Home,
      label: "Home",
    },
    {
      href: "/my-tickets",
      icon: Ticket,
      label: "My Tickets",
    },
    {
      href: "/events",
      icon: Calendar,
      label: "Events",
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] mt-0.5 transition-colors ${
                  active ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
