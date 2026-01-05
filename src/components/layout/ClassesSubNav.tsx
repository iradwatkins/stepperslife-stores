"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Plus, DollarSign, GraduationCap } from "lucide-react";

export function ClassesSubNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/classes", label: "Browse Classes", icon: BookOpen },
    { href: "/instructors", label: "Find Instructors", icon: GraduationCap },
    { href: "/organizer/classes/create", label: "Create Class", icon: Plus },
    { href: "/pricing", label: "Pricing", icon: DollarSign },
  ];

  return (
    <div className="bg-muted/50 border-b border-border">
      <div className="container mx-auto px-4">
        <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href === "/classes" && pathname?.startsWith("/classes"));

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
