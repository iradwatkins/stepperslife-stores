import { Metadata } from "next";
import { InstructorDirectoryClient } from "./InstructorDirectoryClient";

export const metadata: Metadata = {
  title: "Dance Instructors | SteppersLife",
  description:
    "Find experienced Chicago Steppin', Line Dance, and Walking instructors near you. Browse verified instructors, read reviews, and book classes.",
  openGraph: {
    title: "Dance Instructors | SteppersLife",
    description:
      "Find experienced Chicago Steppin', Line Dance, and Walking instructors near you. Browse verified instructors, read reviews, and book classes.",
    type: "website",
    url: "https://stepperslife.com/instructors",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dance Instructors | SteppersLife",
    description:
      "Find experienced Chicago Steppin', Line Dance, and Walking instructors near you.",
  },
};

export default function InstructorsPage() {
  return <InstructorDirectoryClient />;
}
