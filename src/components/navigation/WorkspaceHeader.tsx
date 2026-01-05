"use client";

import { Home, Calendar, BookOpen, Utensils, Store, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateUserInitials } from "@/lib/navigation/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface WorkspaceHeaderProps {
  /** Whether the sidebar is collapsed to icon-only mode */
  isCollapsed?: boolean;
}

interface DashboardLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  pathname: string;
}

function DashboardLink({ href, icon: Icon, label, pathname }: DashboardLinkProps) {
  const isActive = pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
        "text-sidebar-foreground/80 hover:text-sidebar-foreground",
        "hover:bg-muted transition-colors",
        isActive && "bg-muted text-sidebar-foreground font-medium"
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </Link>
  );
}

/**
 * WorkspaceHeader
 *
 * Sidebar header with user info and role-based dashboard quick links.
 *
 * Features:
 * - User avatar with SteppersLife branding
 * - Simple dashboard links based on user's roles (Events, Classes, Restaurant, Marketplace, Admin)
 * - Role-based visibility - users only see links for roles they have
 * - Collapsed mode shows just a home icon
 */
export function WorkspaceHeader({ isCollapsed = false }: WorkspaceHeaderProps) {
  const pathname = usePathname();
  const {
    user,
    availableWorkspaces,
  } = useWorkspace();

  if (!user) {
    return null;
  }

  const userInitials = user.initials || generateUserInitials(user.name, user.email);

  // Check which dashboard links to show based on available workspaces
  // IMPORTANT: Admin is SUPPORT ONLY - they cannot own content, only manage others'
  const isAdmin = user.role === 'admin';
  const hasEvents = !isAdmin && availableWorkspaces.some(w => w.id === 'events');
  const hasClasses = !isAdmin && (user.role === 'instructor' || user.role === 'organizer');
  const hasRestaurant = !isAdmin && availableWorkspaces.some(w => w.id === 'restaurant');
  const hasMarketplace = !isAdmin && availableWorkspaces.some(w => w.id === 'marketplace');
  const hasAdmin = availableWorkspaces.some(w => w.id === 'admin');
  const hasDashboardLinks = hasEvents || hasClasses || hasRestaurant || hasMarketplace || hasAdmin;

  // Collapsed state - show home icon only
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-3">
        <Link
          href="/"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors"
          title="Go to Homepage"
        >
          <Home className="w-4 h-4 text-sidebar-foreground/60" />
        </Link>
      </div>
    );
  }

  // Expanded state - full header with workspace info
  return (
    <div className="px-4 py-3">
      {/* User Info Row with Home Link */}
      <div className="flex items-center gap-3 mb-3">
        <Link
          href="/"
          className="flex items-center gap-3 flex-1 min-w-0 group"
          title="Go to Homepage"
        >
          <div className="relative">
            <Avatar className="w-10 h-10 group-hover:ring-2 group-hover:ring-primary/50 transition-all">
              <AvatarImage src={user.avatar} alt={user.name || user.email} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5">
              <Home className="w-3 h-3 text-primary" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sidebar-foreground truncate group-hover:text-primary transition-colors">
              SteppersLife
            </h2>
            {user.name && (
              <p className="text-xs text-sidebar-foreground/80 truncate">
                {user.name}
              </p>
            )}
          </div>
        </Link>
      </div>

      {/* Dashboard Quick Links - Role Based */}
      {hasDashboardLinks && (
        <div className="space-y-1">
          {hasEvents && (
            <DashboardLink href="/organizer/events" icon={Calendar} label="Events" pathname={pathname} />
          )}
          {hasClasses && (
            <DashboardLink href="/instructor/classes" icon={BookOpen} label="Classes" pathname={pathname} />
          )}
          {hasRestaurant && (
            <DashboardLink href="/restaurateur/dashboard" icon={Utensils} label="Restaurant" pathname={pathname} />
          )}
          {hasMarketplace && (
            <DashboardLink href="/vendor/dashboard" icon={Store} label="Marketplace" pathname={pathname} />
          )}
          {hasAdmin && (
            <DashboardLink href="/admin" icon={ShieldCheck} label="Admin" pathname={pathname} />
          )}
        </div>
      )}
    </div>
  );
}
