"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, CreditCard, ArrowRight, LayoutGrid } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account information and preferences
        </p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Account Overview</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">
                {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{currentUser?.name || "Guest User"}</h2>
              <p className="text-muted-foreground">{currentUser?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links to Profile Sections */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/user/profile/personal-info">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Personal Info</CardTitle>
                    <CardDescription className="mt-1">
                      Name, email, phone
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/user/profile/addresses">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Saved Addresses</CardTitle>
                    <CardDescription className="mt-1">
                      Manage addresses
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/user/profile/payment-methods">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Payment Methods</CardTitle>
                    <CardDescription className="mt-1">
                      Saved payment options
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/user/profile/workspaces">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Workspaces</CardTitle>
                    <CardDescription className="mt-1">
                      Toggle dashboards
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {/* Account Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statistics</CardTitle>
          <CardDescription>Your activity on SteppersLife</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground mt-1">Events Attended</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground mt-1">Tickets Purchased</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground mt-1">Favorites</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">$0</p>
              <p className="text-sm text-muted-foreground mt-1">Total Spent</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
