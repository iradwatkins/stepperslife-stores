"use client";

import { ShieldAlert, Home, LogIn, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function UnauthorizedPage() {
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Try to detect user's role for helpful redirect
    const fetchUserRole = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user?.role || null);
        }
      } catch {
        // User not logged in
        setUserRole(null);
      }
    };
    fetchUserRole();
  }, []);

  const getDashboardLink = () => {
    switch (userRole) {
      case "instructor":
        return { href: "/instructor/dashboard", label: "Instructor Dashboard" };
      case "organizer":
        return { href: "/organizer/dashboard", label: "Organizer Dashboard" };
      case "restaurateur":
        return { href: "/restaurateur/dashboard", label: "Restaurant Dashboard" };
      case "admin":
        return { href: "/admin", label: "Admin Dashboard" };
      default:
        return null;
    }
  };

  const dashboardLink = getDashboardLink();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto" />
        </div>

        <h1 className="text-3xl font-bold mb-3">Access Denied</h1>

        <p className="text-muted-foreground mb-8">
          You don&apos;t have permission to access this page. This area may be
          restricted to specific user roles.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>

          {!userRole && (
            <Button asChild>
              <Link href="/login">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Link>
            </Button>
          )}

          {dashboardLink && (
            <Button asChild>
              <Link href={dashboardLink.href}>
                {dashboardLink.label}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground mt-8">
          Need help?{" "}
          <Link href="/contact" className="text-primary hover:underline">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}
