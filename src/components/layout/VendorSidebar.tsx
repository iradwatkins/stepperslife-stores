"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Wallet,
  Settings,
  Store,
  ExternalLink,
  Ticket,
} from "lucide-react";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/vendor/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Products",
    href: "/vendor/dashboard/products",
    icon: Package,
  },
  {
    name: "Orders",
    href: "/vendor/dashboard/orders",
    icon: ShoppingCart,
  },
  {
    name: "Earnings",
    href: "/vendor/dashboard/earnings",
    icon: DollarSign,
  },
  {
    name: "Coupons",
    href: "/vendor/dashboard/coupons",
    icon: Ticket,
  },
  {
    name: "Payouts",
    href: "/vendor/dashboard/payouts",
    icon: Wallet,
  },
  {
    name: "Settings",
    href: "/vendor/dashboard/settings",
    icon: Settings,
  },
];

interface VendorSidebarProps {
  vendorName?: string;
  vendorSlug?: string;
}

export function VendorSidebar({ vendorName, vendorSlug }: VendorSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <Link href="/vendor/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <div className="overflow-hidden">
            <h2 className="font-bold text-foreground truncate">
              {vendorName || "Vendor Dashboard"}
            </h2>
            <p className="text-xs text-muted-foreground">Marketplace Seller</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/vendor/dashboard" && pathname.startsWith(item.href));

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive
                      ? "bg-sky-100 dark:bg-sky-900/30 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        {vendorSlug && (
          <Link
            href={`/marketplace/store/${vendorSlug}`}
            target="_blank"
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View My Store
          </Link>
        )}
        <Link
          href="/marketplace"
          className="flex items-center justify-center gap-2 px-4 py-2 mt-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
        >
          Back to Marketplace
        </Link>
      </div>
    </aside>
  );
}
