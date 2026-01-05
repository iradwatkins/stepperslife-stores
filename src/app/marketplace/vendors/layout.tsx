import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vendors | SteppersLife Marketplace",
  description: "Discover verified vendors selling stepping attire, accessories, and more.",
};

export default function VendorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
