import { Metadata } from "next";
import { ServicesPageClient } from "./ServicesPageClient";

export const metadata: Metadata = {
  title: "Services | SteppersLife",
  description:
    "Find trusted local service providers in your neighborhood. From barbers to plumbers, photographers to DJs - discover professionals who serve your community.",
  openGraph: {
    title: "Services | SteppersLife",
    description:
      "Find trusted local service providers in your neighborhood. From barbers to plumbers, photographers to DJs.",
    type: "website",
  },
};

export default function ServicesPage() {
  return <ServicesPageClient />;
}
