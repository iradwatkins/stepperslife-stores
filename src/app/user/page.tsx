import { redirect } from "next/navigation";

/**
 * User root page - redirects to user dashboard
 */
export default function UserRootPage() {
  redirect("/user/dashboard");
}
