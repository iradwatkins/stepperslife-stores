import { Metadata } from "next";
import ProviderDetailClient from "./ProviderDetailClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  // Format the slug for display
  const formattedName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    title: `${formattedName} - SteppersLife Services`,
    description: `View ${formattedName}'s services, contact information, and reviews on SteppersLife.`,
  };
}

export default async function ProviderDetailPage({ params }: Props) {
  const { slug } = await params;
  return <ProviderDetailClient slug={slug} />;
}
