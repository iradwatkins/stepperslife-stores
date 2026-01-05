"use client";

import { PendingInvitations } from "@/components/restaurants/PendingInvitations";
import { useRouter } from "next/navigation";

export default function UserInvitationsPage() {
  const router = useRouter();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invitations</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your pending invitations
        </p>
      </div>

      <PendingInvitations
        variant="full"
        onAccept={() => {
          // Refresh the page to show updated list
          router.refresh();
        }}
      />
    </div>
  );
}
