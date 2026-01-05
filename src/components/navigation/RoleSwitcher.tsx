"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AllRoles, NavUser } from "@/lib/navigation/types";
import { getAccessibleRoles } from "@/lib/navigation/permissions";

/**
 * Role display configuration
 */
const ROLE_CONFIG: Record<
  AllRoles | "restaurateur",
  {
    label: string;
    description: string;
    dashboardPath: string;
  }
> = {
  admin: {
    label: "Administrator",
    description: "Full platform access",
    dashboardPath: "/admin",
  },
  organizer: {
    label: "Event Organizer",
    description: "Create and manage events",
    dashboardPath: "/organizer/dashboard",
  },
  instructor: {
    label: "Class Instructor",
    description: "Create and manage classes",
    dashboardPath: "/instructor/dashboard",
  },
  restaurateur: {
    label: "Restaurant Partner",
    description: "Manage your restaurant",
    dashboardPath: "/restaurateur/dashboard",
  },
  vendor: {
    label: "Vendor",
    description: "Sell products in marketplace",
    dashboardPath: "/vendor/dashboard",
  },
  user: {
    label: "Customer",
    description: "Browse and purchase tickets",
    dashboardPath: "/user/dashboard",
  },
  STAFF: {
    label: "Event Staff",
    description: "Check-in and scan tickets",
    dashboardPath: "/staff/dashboard",
  },
  TEAM_MEMBERS: {
    label: "Team Member",
    description: "Manage ticket inventory",
    dashboardPath: "/team/dashboard",
  },
  ASSOCIATES: {
    label: "Associate",
    description: "Sell tickets and earn commission",
    dashboardPath: "/associate/dashboard",
  },
};

interface RoleSwitcherProps {
  user: NavUser;
  activeRole: AllRoles;
  className?: string;
}

/**
 * Multi-role switcher component
 *
 * Allows users with multiple roles to switch between different dashboards.
 * Only displayed when user has access to multiple roles.
 */
export function RoleSwitcher({ user, activeRole, className }: RoleSwitcherProps) {
  const router = useRouter();
  const accessibleRoles = getAccessibleRoles(user);

  // Don't show switcher if user only has one accessible role
  if (accessibleRoles.length <= 1) {
    return null;
  }

  const currentRoleConfig = ROLE_CONFIG[activeRole];

  const handleRoleSwitch = (role: AllRoles) => {
    if (role === activeRole) return;

    const targetPath = ROLE_CONFIG[role].dashboardPath;
    router.push(targetPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between",
            className
          )}
        >
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium">{currentRoleConfig.label}</span>
            <span className="text-xs text-muted-foreground">
              {currentRoleConfig.description}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[240px]" align="start">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {accessibleRoles.map((role) => {
          const config = ROLE_CONFIG[role];
          const isActive = role === activeRole;

          return (
            <DropdownMenuItem
              key={role}
              onSelect={() => handleRoleSwitch(role)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isActive && "bg-accent"
              )}
            >
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{config.label}</span>
                <span className="text-xs text-muted-foreground">
                  {config.description}
                </span>
              </div>
              {isActive && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
