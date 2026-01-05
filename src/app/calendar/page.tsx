import { redirect } from "next/navigation";

/**
 * /calendar redirects to /events
 * Catches any legacy links or external references
 */
export default function CalendarPage() {
  redirect("/events");
}
