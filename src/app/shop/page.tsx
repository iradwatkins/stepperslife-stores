import { redirect } from "next/navigation";

/**
 * /shop redirects to /marketplace
 * Legacy route support for main marketplace page
 */
export default function ShopPage() {
  redirect("/marketplace");
}
