"use client";

import { redirect } from "next/navigation";

// Redirect to settings for now - profile editing is in settings
export default function ProviderProfilePage() {
  redirect("/service-provider/dashboard/settings");
}
