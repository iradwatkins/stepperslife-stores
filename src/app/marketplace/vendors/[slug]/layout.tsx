import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    // Fetch vendor data for metadata
    const vendor = await fetchQuery(api.vendors.getBySlug, { slug });

    if (vendor) {
      const title = `${vendor.name} | SteppersLife Marketplace`;
      const description = vendor.description
        ? vendor.description.substring(0, 160)
        : `Shop products from ${vendor.name} on SteppersLife Marketplace.`;

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          images: vendor.bannerUrl ? [vendor.bannerUrl] : vendor.logoUrl ? [vendor.logoUrl] : [],
        },
      };
    }
  } catch (error) {
    // Vendor not found - use fallback
    console.error("Error fetching vendor for metadata:", error);
  }

  return {
    title: "Vendor | SteppersLife Marketplace",
    description: "View vendor storefront on SteppersLife Marketplace.",
  };
}

export default function VendorStorefrontLayout({ children }: Props) {
  return <>{children}</>;
}
