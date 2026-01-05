"use client";

import { useEffect, useState } from "react";
import { RoleBasedSidebar } from "@/components/navigation";
import { AppHeader } from "@/components/sidebar/app-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { NavUser } from "@/lib/navigation/types";
import { generateUserInitials } from "@/lib/navigation/utils";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<NavUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from auth API
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          const apiUser = data.user;

          // Convert API user to NavUser format
          const navUser: NavUser = {
            id: apiUser._id,
            email: apiUser.email,
            name: apiUser.name,
            role: apiUser.role || "user",
            avatar: apiUser.avatar,
            initials: generateUserInitials(apiUser.name, apiUser.email),
            staffRoles: [],
          };

          setUser(navUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show error if no user (should redirect to login in production)
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to continue</p>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceProvider initialUser={user} initialRole="user">
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full bg-background">
          <RoleBasedSidebar user={user} activeRole="user" />
          <SidebarInset className="flex-1">
            <AppHeader />
            <main className="flex-1 overflow-auto">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </WorkspaceProvider>
  );
}
