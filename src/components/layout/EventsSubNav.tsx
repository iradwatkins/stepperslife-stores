"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, DollarSign, Plus, HelpCircle } from "lucide-react";

export function EventsSubNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/events", label: "Browse Events", icon: Calendar },
    { href: "/organizer/events/create", label: "Create Event", icon: Plus },
    { href: "/pricing", label: "Pricing", icon: DollarSign },
    { href: "/help", label: "Help", icon: HelpCircle },
  ];

  return (
    <div className="bg-muted/50 border-b border-border">
      <div className="container mx-auto px-4">
        <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href === "/events" && pathname?.startsWith("/events"));
            
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
