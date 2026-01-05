import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order History | SteppersLife Marketplace",
  description: "View your order history and track shipments from SteppersLife Marketplace.",
};

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
