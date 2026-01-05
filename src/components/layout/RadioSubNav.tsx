"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Disc3, Trophy, Heart, Plus, Headphones, Mic2 } from "lucide-react";

const radioNavItems = [
  { href: "/radio", label: "Home", icon: Radio },
  { href: "/radio/top-10", label: "Top 10", icon: Trophy },
  { href: "/radio/become-a-dj", label: "Become a DJ", icon: Plus },
  { href: "/radio/dj-dashboard", label: "My Station", icon: Mic2 },
];

export function RadioSubNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    // Handle query params for the DJ apply link
    const basePath = href.split("?")[0];
    if (basePath === "/radio") {
      return pathname === "/radio";
    }
    return pathname?.startsWith(basePath);
  };

  return (
    <nav className="bg-card border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
          {/* Section Icon */}
          <div className="flex items-center gap-2 pr-4 border-r border-border mr-2">
            <Headphones className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-foreground hidden sm:inline">
              Radio
            </span>
          </div>

          {/* Navigation Items */}
          {radioNavItems.map((item) => {
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
