"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench, Heart, DollarSign, Plus, HelpCircle, Search } from "lucide-react";

const servicesNavItems = [
  { href: "/services", label: "Browse", icon: Search },
  { href: "/services/favorites", label: "Saved", icon: Heart },
  { href: "/services/pricing", label: "Pricing", icon: DollarSign },
  { href: "/service-provider/apply", label: "Offer Services", icon: Plus },
  { href: "/help", label: "Help", icon: HelpCircle },
];

export function ServicesSubNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/services") {
      return pathname === "/services" || pathname?.startsWith("/services/category");
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="bg-card border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
          {/* Section Icon */}
          <div className="flex items-center gap-2 pr-4 border-r border-border mr-2">
            <Wrench className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-foreground hidden sm:inline">
              Services
            </span>
          </div>

          {/* Navigation Items */}
          {servicesNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
