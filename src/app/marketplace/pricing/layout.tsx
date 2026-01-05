import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seller Pricing | SteppersLife Marketplace",
  description: "View pricing plans and commission rates for selling on SteppersLife Marketplace.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
