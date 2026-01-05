"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Star,
  BarChart3,
  Settings,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  {
    href: "/service-provider/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/service-provider/dashboard/profile",
    label: "Profile",
    icon: User,
  },
  {
    href: "/service-provider/dashboard/reviews",
    label: "Reviews",
    icon: Star,
  },
  {
    href: "/service-provider/dashboard/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    href: "/service-provider/dashboard/settings",
    label: "Settings",
    icon: Settings,
  },
];

interface ProviderDashboardNavProps {
  providerName: string;
  providerStatus: string;
}

export function ProviderDashboardNav({
  providerName,
  providerStatus,
}: ProviderDashboardNavProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const NavContent = () => (
    <>
      {/* Provider Info */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground truncate">{providerName}</h2>
        <span
          className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            providerStatus === "APPROVED"
              ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
              : providerStatus === "PENDING"
              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
              : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          }`}
        >
          {providerStatus}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="p-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* View Public Listing */}
      <div className="p-4 mt-auto border-t border-border">
        <Link
          href={`/services/provider/${providerName.toLowerCase().replace(/\s+/g, "-")}`}
          className="text-sm text-primary hover:underline"
        >
          View public listing →
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0 md:pt-16 bg-card border-r border-border">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="font-semibold text-foreground text-sm truncate">
              {providerName}
            </h2>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                providerStatus === "APPROVED"
                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  : providerStatus === "PENDING"
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                  : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
              }`}
            >
              {providerStatus}
            </span>
          </div>
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {isMobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Nav Dropdown */}
        {isMobileOpen && (
          <div className="border-t border-border bg-card">
            <nav className="p-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </>
  );
}
