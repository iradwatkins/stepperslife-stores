import { redirect } from "next/navigation";

/**
 * /stores redirects to /marketplace/vendors
 * Legacy route support for marketplace vendor directory
 */
export default function StoresPage() {
  redirect("/marketplace/vendors");
}
