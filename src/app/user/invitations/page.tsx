"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";

export default function UserInvitationsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vendor Invitations</h1>
        <p className="text-muted-foreground mt-1">
          View and manage invitations from vendors
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pending invitations</p>
            <p className="text-sm mt-2">
              When a vendor invites you to collaborate, it will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
