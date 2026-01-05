import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace | SteppersLife",
  description: "Shop stepping attire, music, accessories, and more from verified vendors in the Chicago Steppin' community.",
};

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
