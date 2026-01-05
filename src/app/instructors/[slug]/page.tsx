import { Metadata } from "next";
import { InstructorProfileClient } from "./InstructorProfileClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // For now, use generic metadata. In production, you'd fetch instructor data
  const instructorName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    title: `${instructorName} | Dance Instructor | SteppersLife`,
    description: `Learn from ${instructorName} on SteppersLife. View their classes, credentials, and book a lesson today.`,
    openGraph: {
      title: `${instructorName} | Dance Instructor | SteppersLife`,
      description: `Learn from ${instructorName} on SteppersLife. View their classes, credentials, and book a lesson today.`,
      type: "profile",
      url: `https://stepperslife.com/instructors/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${instructorName} | SteppersLife`,
      description: `Learn from ${instructorName} on SteppersLife.`,
    },
  };
}

export default async function InstructorProfilePage({ params }: PageProps) {
  const { slug } = await params;
  return <InstructorProfileClient slug={slug} />;
}
