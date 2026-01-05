"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Package, HelpCircle, DollarSign, Store, Heart, Users } from "lucide-react";

export function MarketplaceSubNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/marketplace", label: "Browse Products", icon: ShoppingBag },
    { href: "/marketplace/vendors", label: "Vendors", icon: Users },
    { href: "/marketplace/wishlist", label: "Wishlist", icon: Heart },
    { href: "/vendor/apply", label: "Create Store", icon: Store },
    { href: "/marketplace/pricing", label: "Pricing", icon: DollarSign },
  ];

  return (
    <div className="bg-muted/50 border-b border-border">
      <div className="container mx-auto px-4">
        <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Determine active state based on current path
            const isActive =
              pathname === item.href ||
              // Vendors link active on vendor pages
              (item.href === "/marketplace/vendors" && pathname?.startsWith("/marketplace/vendors")) ||
              // Browse Products active only on /marketplace or product detail pages (not other sub-pages)
              (item.href === "/marketplace" && pathname === "/marketplace");
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
