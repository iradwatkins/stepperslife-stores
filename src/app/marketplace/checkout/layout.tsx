import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout | SteppersLife Marketplace",
  description: "Complete your purchase on SteppersLife Marketplace.",
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
