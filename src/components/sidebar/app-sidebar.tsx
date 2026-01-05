"use client";

import * as React from "react";
import {
  Calendar,
  LayoutDashboard,
  Plus,
  Settings,
  Ticket,
  Users,
  BarChart3,
  Gift,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

// Navigation items configuration for event organizers
const navItems = [
  {
    title: "Dashboard",
    url: "/organizer/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My Events",
    url: "/organizer/events",
    icon: Calendar,
  },
  {
    title: "Claim Events",
    url: "/organizer/claim-events",
    icon: Gift,
  },
  {
    title: "Create Event",
    url: "/organizer/events/create",
    icon: Plus,
  },
  {
    title: "Analytics",
    url: "/organizer/analytics",
    icon: BarChart3,
  },
  {
    title: "Settings",
    url: "/organizer/settings",
    icon: Settings,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Header with Logo */}
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Ticket className="h-5 w-5" />
          </div>
          <span className="font-semibold text-lg group-data-[state=collapsed]/sidebar-wrapper:hidden">
            SteppersLife
          </span>
        </Link>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} isActive={pathname === item.url}>
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User Info */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary">
                <Users className="h-4 w-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[state=collapsed]/sidebar-wrapper:hidden">
                <span className="truncate font-semibold">Test Organizer</span>
                <span className="truncate text-xs">test@stepperslife.com</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
