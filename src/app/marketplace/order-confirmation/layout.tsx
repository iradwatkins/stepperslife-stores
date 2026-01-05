import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Confirmed | SteppersLife Marketplace",
  description: "Your order has been confirmed. Thank you for shopping with SteppersLife.",
};

export default function OrderConfirmationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
