"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleBasedSidebar } from "@/components/navigation";
import { AppHeader } from "@/components/sidebar/app-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { NavUser } from "@/lib/navigation/types";
import { generateUserInitials } from "@/lib/navigation/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<NavUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const router = useRouter();

  // Fetch user data from auth API
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          const apiUser = data.user;

          // SECURITY: Verify user has admin access via isAdmin flag (set in /api/auth/me)
          // isAdmin is true if user's email is in ADMIN_EMAILS list
          if (!apiUser.isAdmin) {
            setUnauthorized(true);
            setLoading(false);
            return;
          }

          // Convert API user to NavUser format
          // Use "admin" role since user passed isAdmin check
          const navUser: NavUser = {
            id: apiUser._id,
            email: apiUser.email,
            name: apiUser.name,
            role: "admin", // User is admin via ADMIN_EMAILS
            avatar: apiUser.avatar,
            initials: generateUserInitials(apiUser.name, apiUser.email),
            staffRoles: [],
          };

          setUser(navUser);
        } else {
          // Not authenticated - redirect to login
          router.push("/login?redirect=/admin");
          return;
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        router.push("/login?redirect=/admin");
        return;
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show unauthorized message for non-admin users
  if (unauthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to access the admin area.</p>
          <button
            onClick={() => router.push("/user/dashboard")}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show error if no user
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
    <WorkspaceProvider initialUser={user} initialRole="admin">
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full bg-background">
          <RoleBasedSidebar user={user} activeRole="admin" />
          <SidebarInset className="flex-1">
            <AppHeader />
            <main className="flex-1 overflow-auto">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </WorkspaceProvider>
  );
}
