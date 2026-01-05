import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type Props = {
  params: Promise<{ productId: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId } = await params;

  try {
    // Fetch product data for metadata
    const product = await fetchQuery(api.products.queries.getProductByIdSafe, {
      productId: productId as Id<"products">,
    });

    if (product) {
      const title = `${product.name} | SteppersLife Marketplace`;
      const description = product.description
        ? product.description.substring(0, 160)
        : `Shop ${product.name} on SteppersLife Marketplace.`;

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          images: product.images?.[0] ? [product.images[0]] : [],
        },
      };
    }
  } catch (error) {
    // Product not found or invalid ID - use fallback
    console.error("Error fetching product for metadata:", error);
  }

  return {
    title: "Product | SteppersLife Marketplace",
    description: "View product details on SteppersLife Marketplace.",
  };
}

export default function ProductLayout({ children }: Props) {
  return <>{children}</>;
}
