import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Wishlist | SteppersLife Marketplace",
  description: "View and manage your saved products from SteppersLife Marketplace.",
};

export default function WishlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
